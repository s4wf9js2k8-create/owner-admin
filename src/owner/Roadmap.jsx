import React from "react";
export default function Roadmap({ data, setData }) {
  const columns = ["Planned", "In progress", "Testing", "Released"];
  return (
    <div>
      <h2>Product roadmap</h2>
      <p>
        Roadmap cards use the same feature-request IDs as the customer feedback
        backlog.
      </p>
      <div className="owner-roadmap">
        {columns.map((s) => (
          <section key={s}>
            <h3>{s}</h3>
            {data.requests
              .filter((r) => r.status === s)
              .map((r) => (
                <article key={r.id}>
                  <h3>{r.title}</h3>
                  <p>
                    {r.org} · {r.priority} · {r.votes} recorded votes
                  </p>
                  <label>
                    Target release
                    <input
                      type="date"
                      value={r.targetRelease || ""}
                      onChange={(e) =>
                        setData((d) => ({
                          ...d,
                          requests: d.requests.map((x) =>
                            x.id === r.id
                              ? { ...x, targetRelease: e.target.value }
                              : x,
                          ),
                        }))
                      }
                    />
                  </label>
                  <label>
                    Development status
                    <select
                      value={r.status}
                      onChange={(e) =>
                        setData((d) => ({
                          ...d,
                          requests: d.requests.map((x) =>
                            x.id === r.id
                              ? { ...x, status: e.target.value }
                              : x,
                          ),
                        }))
                      }
                    >
                      {columns.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Development notes
                    <textarea
                      value={r.notes || ""}
                      onChange={(e) =>
                        setData((d) => ({
                          ...d,
                          requests: d.requests.map((x) =>
                            x.id === r.id ? { ...x, notes: e.target.value } : x,
                          ),
                        }))
                      }
                    />
                  </label>
                </article>
              ))}
          </section>
        ))}
      </div>
      <p>
        Move a request to Planned in Feature Requests to include it. No GitHub
        issues are created.
      </p>
    </div>
  );
}
