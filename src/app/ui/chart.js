import { svg, formatNumber } from "../dom.js";

export function barChart(rows, options = {}) {
  const labelKey = options.labelKey ?? "label";
  const valueKey = options.valueKey ?? "count";
  const altKey = options.altKey;
  const max = Math.max(1, ...rows.map((r) => (r[valueKey] ?? 0)));
  const rowH = options.rowH ?? 18;
  const labelW = options.labelW ?? 130;
  const valueW = 48;
  const width = options.width ?? 420;
  const chartW = Math.max(80, width - labelW - valueW - 8);
  const height = rows.length * rowH + 8;
  const onClick = options.onClick;

  const node = svg("svg", { viewBox: `0 0 ${width} ${height}` });
  rows.forEach((row, index) => {
    const y = index * rowH + 4;
    const value = row[valueKey] ?? 0;
    const altValue = altKey ? (row[altKey] ?? 0) : null;
    const baseW = (value / max) * chartW;
    const altW = altValue !== null ? (altValue / max) * chartW : 0;
    const g = svg("g", {
      class: `bar-row${onClick ? " is-clickable" : ""}`,
      onClick: onClick ? () => onClick(row) : undefined,
    });
    g.appendChild(svg("text", { class: "label", x: 0, y: y + rowH / 2 + 3 },
      truncate(String(row[labelKey] ?? "—"), Math.floor(labelW / 6))));
    g.appendChild(svg("rect", {
      x: labelW,
      y: y + 2,
      width: Math.max(0, baseW),
      height: rowH - 6,
      rx: 2,
    }));
    if (altValue !== null && altW > 0) {
      g.appendChild(svg("rect", {
        class: "bar--alt",
        x: labelW,
        y: y + 2,
        width: altW,
        height: rowH - 6,
        rx: 2,
        opacity: 0.85,
      }));
    }
    g.appendChild(svg("text", {
      class: "value",
      x: labelW + chartW + 6,
      y: y + rowH / 2 + 3,
    }, formatNumber(value)));
    node.appendChild(g);
  });
  return node;
}

function truncate(text, max) {
  if (text.length <= max) return text;
  return text.slice(0, Math.max(0, max - 1)) + "…";
}
