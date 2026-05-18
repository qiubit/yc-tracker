import { el, mount, formatNumber } from "../dom.js";
import { barChart } from "./chart.js";
import { placeholder } from "./results.js";

export async function renderTrends(host, api, actions) {
  mount(host, placeholder("Loading trends…", ""));

  let batches, industries, tags, facets;
  try {
    [batches, industries, tags, facets] = await Promise.all([
      api.trends.batches({ limit: 100 }),
      api.trends.industries({ limit: 100 }),
      api.trends.tags({ limit: 30 }),
      api.facets(),
    ]);
  } catch (error) {
    mount(host, placeholder("Couldn't load trends", error.message));
    return;
  }

  const batchRows = (batches.data ?? [])
    .slice()
    .sort((a, b) => (a.batchYear ?? 0) - (b.batchYear ?? 0))
    .slice(-24)
    .map((row) => ({
      label: row.batch,
      count: row.count,
      hiringCount: row.hiringCount ?? 0,
      activeCount: row.activeCount ?? 0,
    }));

  const industryRows = (industries.data ?? [])
    .slice(0, 10)
    .map((row) => ({
      label: row.industry,
      count: row.count,
      hiringCount: row.hiringCount ?? 0,
    }));

  const tagRows = (tags.data ?? [])
    .slice(0, 20)
    .map((row) => ({ label: row.tag, count: row.count, hiringCount: row.hiringCount ?? 0 }));

  const statusRows = (facets.data?.statuses ?? []).map((row) => ({
    label: row.value,
    count: row.count,
  }));

  const hiring = facets.data?.hiring ?? { hiring: 0, notHiring: 0, total: 0 };
  const teamRows = (facets.data?.teamSizeBuckets ?? []).map((row) => ({
    label: row.label,
    count: row.count,
  }));

  mount(host,
    trendCard(
      "Companies by batch",
      "Last 24 batches, by founded count. Orange = total, blue overlay = hiring now.",
      barChart(batchRows, {
        labelKey: "label",
        valueKey: "count",
        altKey: "hiringCount",
        rowH: 18,
        labelW: 110,
        width: 460,
        onClick: (row) => actions.applyFilter("batch", row.label),
      }),
    ),
    trendCard(
      "Industries",
      "Top 10 industries by company count. Click to filter.",
      barChart(industryRows, {
        labelKey: "label",
        valueKey: "count",
        altKey: "hiringCount",
        rowH: 20,
        labelW: 180,
        width: 460,
        onClick: (row) => actions.applyFilter("industry", row.label),
      }),
    ),
    trendCard(
      "Top tags",
      "Top 20 tags. Click to filter results.",
      barChart(tagRows, {
        labelKey: "label",
        valueKey: "count",
        altKey: "hiringCount",
        rowH: 18,
        labelW: 150,
        width: 460,
        onClick: (row) => actions.applyFilter("tag", row.label),
      }),
    ),
    trendCard(
      "Status breakdown",
      `${formatNumber(statusRows.reduce((sum, r) => sum + r.count, 0))} companies across statuses.`,
      barChart(statusRows, {
        labelKey: "label",
        valueKey: "count",
        rowH: 20,
        labelW: 120,
        width: 460,
        onClick: (row) => actions.applyFilter("status", row.label),
      }),
    ),
    trendCard(
      "Hiring",
      `${formatNumber(hiring.hiring)} of ${formatNumber(hiring.total)} companies are currently hiring.`,
      barChart(
        [
          { label: "Hiring", count: hiring.hiring },
          { label: "Not hiring", count: hiring.notHiring },
        ],
        { labelKey: "label", valueKey: "count", rowH: 22, labelW: 110, width: 460 },
      ),
    ),
    trendCard(
      "Team size",
      "Companies grouped by team-size bucket.",
      barChart(teamRows, {
        labelKey: "label",
        valueKey: "count",
        rowH: 20,
        labelW: 120,
        width: 460,
        onClick: (row) => actions.applyFilter("teamSizeBucket", row.label === "Unknown" ? "unknown" : row.label),
      }),
    ),
  );
}

function trendCard(title, subtitle, body) {
  return el("div", { class: "trend-card stacked-chart" },
    el("h2", {}, title),
    el("div", { class: "trend-card__sub" }, subtitle),
    body,
  );
}
