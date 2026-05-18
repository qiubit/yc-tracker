import { el, mount, formatNumber } from "../dom.js";

const SECTIONS = [
  { key: "batch", title: "Batch", facetKey: "batches", searchable: true, initial: 12 },
  { key: "status", title: "Status", facetKey: "statuses", searchable: false, initial: 8 },
  { key: "industry", title: "Industry", facetKey: "industries", searchable: false, initial: 12 },
  { key: "region", title: "Region", facetKey: "regions", searchable: true, initial: 10 },
  { key: "tag", title: "Tags", facetKey: "tags", searchable: true, initial: 12 },
  { key: "teamSizeBucket", title: "Team size", facetKey: "teamSizeBuckets", searchable: false, initial: 8 },
];

export function renderFilterPanel(host, state, facets, actions) {
  const sections = SECTIONS.map((section) => renderSection(section, state, facets, actions));

  const toggles = el("div", { class: "filter-group" },
    el("h3", {}, "Toggles"),
    el("div", { class: "filter-toggles" },
      toggleButton("Hiring", state.filters.isHiring === true, () =>
        actions.setBoolFilter("isHiring", state.filters.isHiring === true ? null : true)),
      toggleButton("Not hiring", state.filters.isHiring === false, () =>
        actions.setBoolFilter("isHiring", state.filters.isHiring === false ? null : false)),
      toggleButton("Top company", state.filters.topCompany === true, () =>
        actions.setBoolFilter("topCompany", state.filters.topCompany === true ? null : true)),
    ),
  );

  const clear = el(
    "button",
    { class: "filter-clear-all", type: "button", onClick: () => actions.clearAll() },
    "Clear all filters",
  );

  mount(host, toggles, ...sections, clear);
}

function toggleButton(label, isOn, onClick) {
  return el("button", { class: `filter-toggle${isOn ? " is-on" : ""}`, type: "button", onClick }, label);
}

function renderSection(section, state, facets, actions) {
  const items = (facets?.[section.facetKey] ?? []).map((item) => normalizeFacetItem(item));
  if (!items.length) return el("div");
  const selected = new Set(state.filters[section.key]);
  const expandedKey = `__expanded_${section.key}`;
  const queryKey = `__query_${section.key}`;
  if (!actions.uiState[expandedKey]) actions.uiState[expandedKey] = false;
  if (typeof actions.uiState[queryKey] !== "string") actions.uiState[queryKey] = "";
  const expanded = actions.uiState[expandedKey] || selected.size > 0;
  const query = actions.uiState[queryKey].toLowerCase();

  let visible = items;
  if (section.searchable && query) {
    visible = visible.filter((item) => item.label.toLowerCase().includes(query));
  }
  const limit = expanded ? Math.min(visible.length, 200) : Math.min(visible.length, section.initial);
  const limited = visible.slice(0, limit);
  for (const value of selected) {
    if (!limited.some((item) => item.value === value)) {
      limited.unshift({ value, label: value, count: items.find((i) => i.value === value)?.count ?? 0 });
    }
  }

  const list = el("ul", {},
    ...limited.map((item) => el("li", {},
      el("label", {},
        el("input", {
          type: "checkbox",
          checked: selected.has(item.value),
          onChange: () => actions.toggleListFilter(section.key, item.value),
        }),
        el("span", {}, item.label),
        el("span", { class: "facet-count" }, formatNumber(item.count)),
      ),
    )),
  );

  return el("div", { class: "filter-group" },
    el("h3", {},
      `${section.title} (${formatNumber(items.length)})`,
      visible.length > section.initial
        ? el("button", {
            type: "button",
            onClick: () => {
              actions.uiState[expandedKey] = !expanded;
              actions.rerenderFilters();
            },
          }, expanded ? "less" : `+${visible.length - section.initial} more`)
        : null,
    ),
    section.searchable
      ? el("input", {
          type: "search",
          class: "filter-search",
          placeholder: `Filter ${section.title.toLowerCase()}…`,
          value: actions.uiState[queryKey],
          onInput: (event) => {
            actions.uiState[queryKey] = event.target.value;
            actions.rerenderFilters();
          },
        })
      : null,
    list,
  );
}

function normalizeFacetItem(item) {
  if (item.value && typeof item.count === "number") {
    return { value: item.value, label: item.label ?? item.value, count: item.count };
  }
  return { value: item.value ?? String(item), label: item.label ?? String(item.value ?? item), count: item.count ?? 0 };
}
