import { el, mount, formatNumber } from "../dom.js";

export function renderResults(host, footer, list, state, pagination, actions) {
  if (!list) {
    mount(host, placeholder("Loading…", "Fetching companies"));
    mount(footer);
    return;
  }
  if (!list.length) {
    mount(host, placeholder("No companies match", "Try removing filters or changing the search."));
    mount(footer);
    return;
  }

  const rows = list.map((company) => companyRow(company, state.selectedSlug === company.slug, actions));
  mount(host, ...rows);

  if (pagination && pagination.hasMore) {
    mount(footer,
      `${formatNumber(state.page * state.pageSize + list.length)} of ${formatNumber(pagination.total)} shown`,
      el("button", { type: "button", onClick: () => actions.loadMore() }, "Load more"),
    );
  } else if (pagination) {
    mount(footer, `${formatNumber(pagination.total)} ${pagination.total === 1 ? "company" : "companies"}`);
  } else {
    mount(footer);
  }
}

export function placeholder(title, body) {
  return el("div", { class: "placeholder" }, el("strong", {}, title), body);
}

function companyRow(company, isSelected, actions) {
  const tags = (company.tags ?? []).slice(0, 4).map((tag) =>
    el("span", { class: "tag" }, tag));

  return el(
    "div",
    {
      class: `company-row${isSelected ? " is-selected" : ""}`,
      role: "listitem",
      onClick: () => actions.selectCompany(company.slug),
    },
    el("div", { class: "company-row__logo" },
      company.smallLogoUrl
        ? el("img", { src: company.smallLogoUrl, alt: "", loading: "lazy" })
        : initials(company.name),
    ),
    el("div", {},
      el("div", { class: "company-row__name" },
        company.name,
        company.topCompany ? el("span", { class: "badge badge--top", title: "Top YC company" }, "TOP") : null,
        company.nonprofit ? el("span", { class: "badge badge--nonprofit" }, "Nonprofit") : null,
      ),
      el("div", { class: "company-row__one" }, company.oneLiner || "No one-liner"),
    ),
    el("div", { class: "company-row__meta" }, company.batch || "—"),
    el("div", { class: "company-row__meta" },
      statusBadge(company.status),
      company.isHiring ? el("span", { class: "badge badge--hiring", style: { marginLeft: "4px" } }, "Hiring") : null,
    ),
    el("div", { class: "company-row__meta" }, teamSizeLabel(company.teamSize)),
    el("div", { class: "company-row__tags" }, ...tags),
  );
}

function statusBadge(status) {
  const key = (status || "Unknown").toLowerCase();
  return el("span", { class: `badge badge--status-${key}` }, status || "Unknown");
}

function teamSizeLabel(size) {
  if (typeof size !== "number" || !Number.isFinite(size) || size <= 0) return "—";
  return formatNumber(size);
}

function initials(name) {
  if (!name) return "?";
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function renderActiveChips(host, chips, actions) {
  if (!chips.length) {
    mount(host);
    return;
  }
  mount(host, ...chips.map((chip) =>
    el("span", { class: "active-chip" },
      chip.label,
      el("button", {
        type: "button",
        title: "Remove",
        onClick: () => actions.removeChip(chip),
      }, "×"),
    ),
  ));
}
