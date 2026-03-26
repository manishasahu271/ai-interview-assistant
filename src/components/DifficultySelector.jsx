"use client";

export default function DifficultySelector({ value, onChange }) {
  const options = ["junior", "mid", "senior"];
  return (
    <div className="card">
      <h2 style={{ marginBottom: 8 }}>Difficulty</h2>
      <div className="row">
        {options.map((opt) => (
          <button
            key={opt}
            className={`btn ${value === opt ? "" : "btnSecondary"}`}
            type="button"
            onClick={() => onChange?.(opt)}
          >
            {opt[0].toUpperCase() + opt.slice(1)}
          </button>
        ))}
      </div>
      <p className="muted" style={{ marginTop: 10 }}>
        Used to filter role questions and tune resume-based generation.
      </p>
    </div>
  );
}

