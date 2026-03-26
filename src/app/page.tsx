export default function Home() {
  return (
    <main className="container softGrid">
      <div className="hero reveal">
        <span className="badge">AI-Powered Interview Coach</span>
        <h1>AI Interview Assistant</h1>
        <p className="muted">
          Transform your prep into a focused, measurable loop: upload resume, get personalized
          questions, practice with spaced repetition, and track progress over time.
        </p>
        <div className="row">
          <a className="btn" href="/resume">
            Resume → Questions
          </a>
          <a className="btn btnSecondary" href="/practice">
            Practice (SM-2)
          </a>
          <a className="btn btnSecondary" href="/dashboard">
            Dashboard
          </a>
        </div>
      </div>
      <div
        className="card reveal revealDelay2"
        style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}
      >
        <div>
          <span className="badge">1</span>
          <h3 style={{ marginTop: 10 }}>Upload resume</h3>
          <p className="muted">Extract key skills and build role-specific interview context.</p>
        </div>
        <div>
          <span className="badge">2</span>
          <h3 style={{ marginTop: 10 }}>Practice smarter</h3>
          <p className="muted">Use SM-2 flashcard scheduling for consistent retention.</p>
        </div>
        <div>
          <span className="badge">3</span>
          <h3 style={{ marginTop: 10 }}>Track weak spots</h3>
          <p className="muted">See trends, category gaps, and benchmark-style insights.</p>
        </div>
      </div>
    </main>
  );
}
