import { el, mount, formatNumber, formatDate } from "../dom.js";
import { placeholder } from "./results.js";

export function renderDetail(drawerHost, scrim, payload, similarPayload, actions, status) {
  if (status === "closed") {
    drawerHost.hidden = true;
    scrim.hidden = true;
    mount(drawerHost);
    return;
  }
  drawerHost.hidden = false;
  scrim.hidden = false;

  if (status === "loading") {
    mount(drawerHost, placeholder("Loading…", ""));
    return;
  }
  if (status === "error" || !payload) {
    mount(drawerHost,
      el("div", { class: "detail-header" },
        el("h1", {}, "Not found"),
        el("button", { class: "detail-close", onClick: () => actions.closeDetail() }, "×"),
      ),
      placeholder("Company unavailable", "It may not exist in the current dataset."),
    );
    return;
  }

  const company = payload.data;
  const header = el("div", { class: "detail-header" },
    company.smallLogoUrl
      ? el("img", { src: company.smallLogoUrl, alt: "" })
      : null,
    el("div", { style: { minWidth: 0, flex: "1" } },
      el("h1", {}, company.name),
      el("p", {}, company.oneLiner || ""),
    ),
    el("button", { class: "detail-close", title: "Close", onClick: () => actions.closeDetail() }, "×"),
  );

  const facts = el("dl", { class: "kv-grid" },
    fact("Batch", company.batch),
    fact("Status", company.status),
    fact("Team size", typeof company.teamSize === "number" ? formatNumber(company.teamSize) : null),
    fact("Industry", company.industry),
    fact("Subindustry", company.subindustry),
    fact("Stage", company.stage),
    fact("Location", company.allLocations),
    fact("Regions", (company.regions ?? []).join(", ")),
    fact("Launched", formatDate(company.launchedAt)),
    fact("Source updated", formatDate(company.sourceUpdatedAt)),
    fact("Top company", company.topCompany ? "Yes" : null),
    fact("Hiring", company.isHiring ? "Yes" : null),
    fact("Nonprofit", company.nonprofit ? "Yes" : null),
  );

  const tagList = (company.tags ?? []).length
    ? el("div", { class: "company-row__tags" },
        ...company.tags.map((tag) => el("span", { class: "tag" }, tag)))
    : el("span", { class: "kv-grid" }, "—");

  const description = company.longDescription
    ? el("div", { class: "detail-description" }, company.longDescription)
    : el("div", { class: "detail-description", style: { fontStyle: "italic", color: "var(--text-dim)" } }, "No long description.");

  const links = el("div", { class: "detail-link-row" },
    company.website ? el("a", { href: company.website, target: "_blank", rel: "noopener" }, "Website") : null,
    company.ycUrl ? el("a", { href: company.ycUrl, target: "_blank", rel: "noopener" }, "YC profile") : null,
  );

  const enrichment = payload.enrichment ?? {};
  const founders = (enrichment.founders ?? []);
  const jobs = (enrichment.jobs ?? []);
  const news = (enrichment.news ?? []);
  const launches = (enrichment.launchPosts ?? []);

  const similarBlock = renderSimilar(similarPayload, actions);

  const body = el("div", { class: "detail-body" },
    section("Facts", facts),
    section("Tags", tagList),
    section("Description", description),
    section("Links", links),
    founders.length ? section("Founders", renderFounders(founders)) : null,
    jobs.length ? section("Jobs", renderJobs(jobs)) : null,
    news.length ? section("News", renderNews(news)) : null,
    launches.length ? section("Launches", renderLaunches(launches)) : null,
    similarBlock,
  );

  mount(drawerHost, header, body);
}

function section(title, body) {
  return el("section", { class: "detail-section" },
    el("h2", {}, title),
    body,
  );
}

function fact(label, value) {
  if (value === null || value === undefined || value === "") {
    return [
      el("dt", {}, label),
      el("dd", { class: "muted" }, "—"),
    ];
  }
  return [
    el("dt", {}, label),
    el("dd", {}, String(value)),
  ];
}

function renderSimilar(payload, actions) {
  if (payload === null) return section("Similar", el("div", { class: "placeholder", style: { padding: "12px" } }, "Loading…"));
  const list = payload?.data ?? [];
  if (!list.length) {
    return section("Similar", el("div", { class: "placeholder", style: { padding: "12px" } }, "No similar companies found."));
  }
  return section("Similar companies",
    el("div", { class: "similar-list" },
      ...list.slice(0, 8).map(({ company, score }) =>
        el("div", { class: "similar-item", onClick: () => actions.selectCompany(company.slug) },
          el("div", { class: "similar-item__logo" },
            company.smallLogoUrl
              ? el("img", { src: company.smallLogoUrl, alt: "", loading: "lazy" })
              : (company.name?.[0] ?? "?"),
          ),
          el("div", { class: "similar-item__main" },
            el("span", { class: "similar-item__name" }, company.name),
            el("span", { class: "similar-item__one" }, company.oneLiner || company.batch || ""),
          ),
          el("span", { class: "similar-item__score" }, `${score}`),
        ),
      ),
    ),
  );
}

function renderFounders(founders) {
  return el("div", { class: "similar-list" },
    ...founders.map((f) =>
      el("div", { class: "similar-item" },
        el("div", { class: "similar-item__logo" },
          f.avatarUrl ? el("img", { src: f.avatarUrl, alt: "", loading: "lazy" }) : (f.fullName?.[0] ?? "?"),
        ),
        el("div", { class: "similar-item__main" },
          el("span", { class: "similar-item__name" }, f.fullName ?? "Founder"),
          el("span", { class: "similar-item__one" }, [f.title, f.isActive ? "active" : null].filter(Boolean).join(" · ")),
        ),
      ),
    ),
  );
}

function renderJobs(jobs) {
  return el("div", { class: "similar-list" },
    ...jobs.map((j) =>
      el("div", { class: "similar-item" },
        el("div", { class: "similar-item__logo" }, "JOB"),
        el("div", { class: "similar-item__main" },
          el("span", { class: "similar-item__name" }, j.title),
          el("span", { class: "similar-item__one" }, [j.role, j.location, j.salaryRange].filter(Boolean).join(" · ")),
        ),
        j.applyUrl ? el("a", { href: j.applyUrl, target: "_blank", rel: "noopener", class: "similar-item__score" }, "apply") : null,
      ),
    ),
  );
}

function renderNews(news) {
  return el("div", { class: "similar-list" },
    ...news.map((n) =>
      el("a", { class: "similar-item", href: n.url, target: "_blank", rel: "noopener" },
        el("div", { class: "similar-item__logo" }, "NEWS"),
        el("div", { class: "similar-item__main" },
          el("span", { class: "similar-item__name" }, n.title),
          el("span", { class: "similar-item__one" }, formatDate(n.date)),
        ),
      ),
    ),
  );
}

function renderLaunches(launches) {
  return el("div", { class: "similar-list" },
    ...launches.map((l) =>
      el("div", { class: "similar-item" },
        el("div", { class: "similar-item__logo" }, "🚀"),
        el("div", { class: "similar-item__main" },
          el("span", { class: "similar-item__name" }, l.title),
          el("span", { class: "similar-item__one" }, l.tagline || formatDate(l.createdAt)),
        ),
      ),
    ),
  );
}
