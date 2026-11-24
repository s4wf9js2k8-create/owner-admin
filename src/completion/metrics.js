const iso = (d) => d.toISOString().slice(0, 10);
export function visitorSummary(rows, from, to, category = "All") {
  const selected = rows.filter(
    (r) =>
      r.date >= from &&
      r.date <= to &&
      (category === "All" || (r.category || "General") === category),
  );
  const dates = new Map(),
    categories = new Map();
  for (const r of selected) {
    const count = Number(r.count || 0);
    dates.set(r.date, (dates.get(r.date) || 0) + count);
    categories.set(
      r.category || "General",
      (categories.get(r.category || "General") || 0) + count,
    );
  }
  return {
    rows: selected,
    total: selected.reduce((n, r) => n + Number(r.count || 0), 0),
    dates: [...dates].sort((a, b) => a[0].localeCompare(b[0])),
    categories: [...categories],
  };
}

export function leaveBalances(
  records,
  people,
  year,
  allowance = 25,
  businessDays = [1, 2, 3, 4, 5],
) {
  return people.map((p) => {
    const dates = new Set();
    for (const r of records.filter(
      (r) =>
        r.approval === "Approved" &&
        !["Available", "Unavailable", "Unavailability"].includes(
          r.requestType,
        ) &&
        (r.personId === p.id || (!r.personId && r.person === p.title)),
    )) {
      const start = new Date(
          Math.max(Date.parse(r.startDate), Date.parse(year + "-01-01")),
        ),
        end = Math.min(Date.parse(r.endDate), Date.parse(year + "-12-31"));
      if (!Number.isFinite(+start) || !Number.isFinite(end)) continue;
      for (let d = start; +d <= end; d = new Date(+d + 86400000))
        if (businessDays.includes(d.getUTCDay())) dates.add(iso(d));
    }
    return {
      id: p.id,
      name: p.title,
      used: dates.size,
      remaining: allowance - dates.size,
    };
  });
}
