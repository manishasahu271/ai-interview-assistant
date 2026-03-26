"use client";

export default function BenchmarkBadge({ percentile }) {
  const p = typeof percentile === "number" ? percentile : null;
  return (
    <div className="card">
      <div className="sectionHeader">
        <h2>Benchmark</h2>
        <span className="badge">Relative standing</span>
      </div>
      {p == null ? (
        <p className="muted">Complete sessions to see a benchmark estimate.</p>
      ) : (
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div>
            <div style={{ fontSize: 34, fontWeight: 800 }}>{p}%</div>
            <div className="muted" style={{ marginTop: 2 }}>
              Better than {p}% of candidates (estimate)
            </div>
          </div>
          <div
            style={{
              border: "1px solid var(--border)",
              borderRadius: 999,
              padding: "8px 12px",
              fontWeight: 700,
            }}
          >
            {p >= 80 ? "Top performer" : p >= 50 ? "Above average" : "Keep grinding"}
          </div>
        </div>
      )}
    </div>
  );
}

