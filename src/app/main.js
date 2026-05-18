import { api } from "./api.js";
import { formatNumber, formatDate, debounce } from "./dom.js";
import {
  createStore,
  stateFromUrl,
  stateToUrl,
  toggleListFilter,
  setBoolFilter,
  clearAll,
  emptyFilters,
  filtersToQuery,
  activeFilterChips,
  FILTER_KEYS,
} from "./state.js";
import { renderFilterPanel } from "./ui/filters.js";
import { renderResults, renderActiveChips } from "./ui/results.js";
import { renderDetail } from "./ui/detail.js";
import { renderTrends } from "./ui/trends.js";

const dom = {
  app: document.getElementById("app"),
  meta: document.getElementById("meta-line"),
  tabs: document.getElementById("view-tabs"),
  filterMenuButton: document.getElementById("filter-menu-button"),
  search: document.getElementById("search-input"),
  sort: document.getElementById("sort-select"),
  filterPanel: document.getElementById("filter-panel"),
  resultCount: document.getElementById("result-count"),
  activeFilters: document.getElementById("active-filters"),
  resultList: document.getElementById("result-list"),
  resultFooter: document.getElementById("result-footer"),
  drawer: document.getElementById("detail-drawer"),
  scrim: document.getElementById("drawer-scrim"),
  exploreSection: document.querySelector('[data-view-section="explore"]'),
  trendsSection: document.querySelector('[data-view-section="trends"]'),
};

const initial = stateFromUrl();
const store = createStore(initial);

const cache = {
  facets: null,
  companies: null,
  detail: null,
  similar: null,
  trendsRendered: false,
};

const uiState = {};
let filtersOpen = false;

let pendingCompaniesToken = 0;
let pendingDetailToken = 0;

const actions = {
  uiState,
  rerenderFilters() { renderFilterPanel(dom.filterPanel, store.get(), cache.facets, actions); },
  toggleListFilter(key, value) {
    const s = store.get();
    store.set({ filters: toggleListFilter(s.filters, key, value), page: 0 });
  },
  setBoolFilter(key, value) {
    const s = store.get();
    store.set({ filters: setBoolFilter(s.filters, key, value), page: 0 });
  },
  clearAll() {
    store.set({ filters: emptyFilters(), page: 0 });
  },
  setSort(sort) { store.set({ sort, page: 0 }); },
  setSearch(q) {
    store.set((prev) => ({
      ...prev,
      filters: { ...prev.filters, q },
      sort: q && prev.sort === "name" ? "relevance" : !q && prev.sort === "relevance" ? "name" : prev.sort,
      page: 0,
    }));
  },
  setView(view) {
    if (view !== "explore" && view !== "trends") return;
    setFiltersOpen(false);
    store.set({ view });
  },
  selectCompany(slug) { store.set({ selectedSlug: slug }); },
  closeDetail() { store.set({ selectedSlug: null }); },
  closeFilters() { setFiltersOpen(false); },
  loadMore() {
    const s = store.get();
    store.set({ page: s.page + 1, _append: true });
  },
  removeChip(chip) {
    const s = store.get();
    if (chip.key === "q") {
      store.set((prev) => ({ ...prev, filters: { ...prev.filters, q: "" } }));
      dom.search.value = "";
    } else if (FILTER_KEYS.list.includes(chip.key)) {
      store.set({ filters: toggleListFilter(s.filters, chip.key, chip.value), page: 0 });
    } else if (FILTER_KEYS.bool.includes(chip.key)) {
      store.set({ filters: setBoolFilter(s.filters, chip.key, null), page: 0 });
    }
  },
  applyFilter(key, value) {
    const s = store.get();
    const current = s.filters[key] ?? [];
    if (!current.includes(value)) {
      store.set({ filters: { ...s.filters, [key]: [...current, value] }, view: "explore", page: 0 });
    } else {
      store.set({ view: "explore" });
    }
  },
};

function reflectViewVisibility(state) {
  dom.app.dataset.view = state.view;
  for (const button of dom.tabs.querySelectorAll("button")) {
    button.classList.toggle("is-active", button.dataset.view === state.view);
  }
  dom.exploreSection.hidden = state.view !== "explore";
  dom.trendsSection.hidden = state.view !== "trends";
}

function setFiltersOpen(open) {
  filtersOpen = Boolean(open);
  dom.filterPanel.classList.toggle("is-open", filtersOpen);
  dom.filterMenuButton.setAttribute("aria-expanded", filtersOpen ? "true" : "false");
}

async function loadFacets() {
  try {
    cache.facets = (await api.facets()).data;
    actions.rerenderFilters();
  } catch (error) {
    dom.filterPanel.textContent = `Failed to load filters: ${error.message}`;
  }
}

async function loadCompanies(append) {
  const token = ++pendingCompaniesToken;
  const state = store.get();
  const params = filtersToQuery(state.filters, state.sort, state.pageSize, state.page * state.pageSize);
  try {
    const response = await api.companies(params);
    if (token !== pendingCompaniesToken) return;
    const previousData = append ? (cache.companies?.data ?? []) : [];
    cache.companies = {
      data: append ? [...previousData, ...response.data] : response.data,
      pagination: response.pagination,
      meta: response.meta,
    };
    renderExplore();
    if (response.meta) updateMeta(response.meta);
  } catch (error) {
    if (token !== pendingCompaniesToken) return;
    cache.companies = null;
    dom.resultList.textContent = "";
    dom.resultList.appendChild(document.createTextNode(""));
    renderResults(dom.resultList, dom.resultFooter, [], state, null, actions);
    dom.resultFooter.textContent = `Failed to load: ${error.message}`;
  }
}

async function loadDetail(slug) {
  const token = ++pendingDetailToken;
  cache.detail = null;
  cache.similar = null;
  renderDetail(dom.drawer, dom.scrim, null, null, actions, "loading");
  try {
    const [detail, similar] = await Promise.all([
      api.company(slug),
      api.similar(slug, { limit: 8 }).catch(() => ({ data: [] })),
    ]);
    if (token !== pendingDetailToken) return;
    cache.detail = detail;
    cache.similar = similar;
    renderDetail(dom.drawer, dom.scrim, detail, similar, actions, "ready");
  } catch (error) {
    if (token !== pendingDetailToken) return;
    renderDetail(dom.drawer, dom.scrim, null, null, actions, "error");
  }
}

function renderExplore() {
  const state = store.get();
  renderActiveChips(dom.activeFilters, activeFilterChips(state.filters), actions);
  const list = cache.companies?.data ?? null;
  const pagination = cache.companies?.pagination ?? null;
  if (pagination) {
    dom.resultCount.textContent = `${formatNumber(pagination.total)} ${pagination.total === 1 ? "company" : "companies"}`;
  } else if (list === null) {
    dom.resultCount.textContent = "Loading…";
  }
  renderResults(dom.resultList, dom.resultFooter, list, state, pagination, actions);
}

function updateMeta(meta) {
  const updated = meta.sourceUpdatedAt ? `updated ${formatDate(meta.sourceUpdatedAt)}` : "no source timestamp";
  dom.meta.textContent = `${formatNumber(meta.totalCompanies)} companies · ${updated}`;
}

let lastView = null;
let lastSelected = null;
let lastFiltersKey = "";
let lastSort = "";
let lastPage = 0;

function onState(state) {
  stateToUrl(state);
  reflectViewVisibility(state);
  if (dom.sort.value !== state.sort) dom.sort.value = state.sort;
  if (dom.search.value !== state.filters.q) dom.search.value = state.filters.q;

  actions.rerenderFilters();
  renderActiveChips(dom.activeFilters, activeFilterChips(state.filters), actions);

  const filtersKey = JSON.stringify(state.filters);
  const queryChanged = filtersKey !== lastFiltersKey || state.sort !== lastSort;
  const pageChanged = state.page !== lastPage;
  if (state.view === "explore" && (queryChanged || pageChanged || cache.companies === null)) {
    const append = pageChanged && !queryChanged && state.page > lastPage;
    loadCompanies(append);
  }
  lastFiltersKey = filtersKey;
  lastSort = state.sort;
  lastPage = state.page;

  if (state.view === "trends" && !cache.trendsRendered) {
    cache.trendsRendered = true;
    renderTrends(document.getElementById("trends-grid"), api, actions);
  }
  lastView = state.view;

  if (state.selectedSlug && state.selectedSlug !== lastSelected) {
    loadDetail(state.selectedSlug);
  } else if (!state.selectedSlug && lastSelected) {
    renderDetail(dom.drawer, dom.scrim, null, null, actions, "closed");
  }
  lastSelected = state.selectedSlug;
}

function bindUi() {
  dom.search.value = initial.filters.q ?? "";
  dom.sort.value = initial.sort;

  const debouncedSearch = debounce((value) => actions.setSearch(value), 180);
  dom.search.addEventListener("input", (event) => debouncedSearch(event.target.value));

  dom.sort.addEventListener("change", (event) => actions.setSort(event.target.value));
  dom.filterMenuButton.addEventListener("click", () => setFiltersOpen(!filtersOpen));

  for (const button of dom.tabs.querySelectorAll("button")) {
    button.addEventListener("click", () => actions.setView(button.dataset.view));
  }

  dom.scrim.addEventListener("click", () => actions.closeDetail());
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && store.get().selectedSlug) {
      actions.closeDetail();
    } else if (event.key === "Escape" && filtersOpen) {
      actions.closeFilters();
    } else if (event.key === "/" && document.activeElement !== dom.search) {
      event.preventDefault();
      dom.search.focus();
      dom.search.select();
    }
  });
}

async function boot() {
  bindUi();
  store.subscribe(onState);
  reflectViewVisibility(store.get());
  actions.rerenderFilters();
  await loadFacets();
  await loadCompanies(false);
  if (store.get().selectedSlug) loadDetail(store.get().selectedSlug);
  if (store.get().view === "trends") {
    cache.trendsRendered = true;
    renderTrends(document.getElementById("trends-grid"), api, actions);
  }
}

boot().catch((error) => {
  dom.meta.textContent = `boot error: ${error.message}`;
});
