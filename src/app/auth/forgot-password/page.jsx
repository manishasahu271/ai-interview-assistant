"use client";

import { useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setStatus("");
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setLoading(false);
    setStatus(res.ok ? "If that email exists, you’ll receive a reset link." : "Try again.");
  }

  return (
    <main className="container">
      <div className="card" style={{ maxWidth: 520, margin: "0 auto" }}>
        <h1>Forgot password</h1>
        <p className="muted">We’ll email you a reset link.</p>
        <form onSubmit={onSubmit}>
          <label className="label">Email</label>
          <input
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <div className="row" style={{ marginTop: 14 }}>
            <button className="btn" disabled={loading} type="submit">
              {loading ? "Sending…" : "Send reset link"}
            </button>
            <a className="link" href="/auth/signin">
              Back to sign in
            </a>
          </div>
        </form>
        {status ? <p className="muted" style={{ marginTop: 12 }}>{status}</p> : null}
      </div>
    </main>
  );
}

