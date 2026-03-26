"use client";

export default function WeakSpotCard({ weakSpots }) {
  const list = Array.isArray(weakSpots) ? weakSpots : [];
  return (
    <div className="card">
      <div className="sectionHeader">
        <h2>Weak spots</h2>
        <span className="badge">Targeted drills</span>
      </div>
      {list.length ? (
        <div style={{ display: "grid", gap: 10 }}>
          {list.map((w) => (
            <div
              key={w.qType}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: "10px 12px",
              }}
            >
              <div>
                <div style={{ fontWeight: 700 }}>{w.qType}</div>
                <div className="muted" style={{ fontSize: 13 }}>
                  Avg score: {w.avgScore}/10
                </div>
              </div>
              <a className="btn btnSecondary" href="/practice">
                Drill →
              </a>
            </div>
          ))}
        </div>
      ) : (
        <p className="muted">No weak spots detected yet. Complete a few sessions first.</p>
      )}
    </div>
  );
}

