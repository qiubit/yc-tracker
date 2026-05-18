const LIST_FILTERS = ["batch", "industry", "status", "region", "tag", "teamSizeBucket"];
const BOOL_FILTERS = ["isHiring", "topCompany"];

export function createStore(initial) {
  const listeners = new Set();
  let state = { ...initial };

  function subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  function get() { return state; }

  function set(next) {
    const merged = typeof next === "function" ? next(state) : { ...state, ...next };
    if (shallowEqual(merged, state)) return;
    state = merged;
    for (const fn of listeners) fn(state);
  }

  return { get, set, subscribe };
}

function shallowEqual(a, b) {
  if (a === b) return true;
  if (!a || !b) return false;
  const ak = Object.keys(a);
  if (ak.length !== Object.keys(b).length) return false;
  for (const k of ak) if (a[k] !== b[k]) return false;
  return true;
}

export function emptyFilters() {
  const out = { q: "" };
  for (const k of LIST_FILTERS) out[k] = [];
  for (const k of BOOL_FILTERS) out[k] = null;
  return out;
}

export function defaultState() {
  return {
    view: "explore",
    filters: emptyFilters(),
    sort: "name",
    page: 0,
    pageSize: 50,
    selectedSlug: null,
  };
}

export function stateFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const filters = emptyFilters();
  filters.q = params.get("q") ?? "";
  for (const key of LIST_FILTERS) {
    const values = params.getAll(key).flatMap((v) => v.split(",")).map((v) => v.trim()).filter(Boolean);
    filters[key] = values;
  }
  for (const key of BOOL_FILTERS) {
    const raw = params.get(key);
    filters[key] = raw === "true" ? true : raw === "false" ? false : null;
  }
  return {
    view: params.get("view") === "trends" ? "trends" : "explore",
    filters,
    sort: params.get("sort") || (filters.q ? "relevance" : "name"),
    page: 0,
    pageSize: 50,
    selectedSlug: params.get("company"),
  };
}

export function stateToUrl(state) {
  const params = new URLSearchParams();
  if (state.view && state.view !== "explore") params.set("view", state.view);
  if (state.filters.q) params.set("q", state.filters.q);
  for (const key of LIST_FILTERS) {
    for (const value of state.filters[key]) params.append(key, value);
  }
  for (const key of BOOL_FILTERS) {
    if (state.filters[key] === true) params.set(key, "true");
    if (state.filters[key] === false) params.set(key, "false");
  }
  if (state.sort && state.sort !== "name") params.set("sort", state.sort);
  if (state.selectedSlug) params.set("company", state.selectedSlug);
  const qs = params.toString();
  const url = qs ? `?${qs}` : window.location.pathname;
  window.history.replaceState(null, "", url);
}

export function toggleListFilter(filters, key, value) {
  const current = filters[key] ?? [];
  const exists = current.includes(value);
  const next = exists ? current.filter((v) => v !== value) : [...current, value];
  return { ...filters, [key]: next };
}

export function setBoolFilter(filters, key, value) {
  return { ...filters, [key]: value };
}

export function clearAll(filters) {
  return emptyFilters();
}

export function filtersToQuery(filters, sort, limit, offset) {
  const params = { sort, limit, offset };
  if (filters.q && sort === "name") params.sort = "relevance";
  if (filters.q) params.q = filters.q;
  for (const key of LIST_FILTERS) if (filters[key]?.length) params[key] = filters[key];
  for (const key of BOOL_FILTERS) if (filters[key] !== null) params[key] = filters[key] ? "true" : "false";
  return params;
}

export function activeFilterChips(filters) {
  const chips = [];
  if (filters.q) chips.push({ key: "q", value: filters.q, label: `“${filters.q}”` });
  const listLabel = {
    batch: "Batch",
    industry: "Industry",
    status: "Status",
    region: "Region",
    tag: "Tag",
    teamSizeBucket: "Team size",
  };
  for (const key of LIST_FILTERS) {
    for (const value of filters[key]) chips.push({ key, value, label: `${listLabel[key]}: ${value}` });
  }
  if (filters.isHiring === true) chips.push({ key: "isHiring", value: true, label: "Hiring" });
  if (filters.isHiring === false) chips.push({ key: "isHiring", value: false, label: "Not hiring" });
  if (filters.topCompany === true) chips.push({ key: "topCompany", value: true, label: "Top company" });
  if (filters.topCompany === false) chips.push({ key: "topCompany", value: false, label: "Not top company" });
  return chips;
}

export const FILTER_KEYS = { list: LIST_FILTERS, bool: BOOL_FILTERS };
