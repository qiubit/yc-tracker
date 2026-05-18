const BASE = "/api";

async function fetchJson(path, params) {
  const url = new URL(BASE + path, window.location.origin);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null || value === "") continue;
      if (Array.isArray(value)) {
        for (const item of value) {
          if (item !== undefined && item !== null && item !== "") {
            url.searchParams.append(key, item);
          }
        }
      } else {
        url.searchParams.set(key, value);
      }
    }
  }
  const res = await fetch(url.toString());
  if (!res.ok) {
    let detail = "";
    try {
      const body = await res.json();
      detail = body?.error?.message ?? "";
    } catch {}
    throw new Error(`API ${res.status} ${res.statusText}${detail ? `: ${detail}` : ""}`);
  }
  return res.json();
}

export const api = {
  companies: (params) => fetchJson("/companies", params),
  company: (slug) => fetchJson(`/companies/${encodeURIComponent(slug)}`),
  similar: (slug, params) => fetchJson(`/companies/${encodeURIComponent(slug)}/similar`, params),
  facets: () => fetchJson("/facets"),
  trends: {
    batches: (params) => fetchJson("/trends/batches", params),
    tags: (params) => fetchJson("/trends/tags", params),
    industries: (params) => fetchJson("/trends/industries", params),
    cooccurrence: (params) => fetchJson("/trends/cooccurrence", params),
  },
};
