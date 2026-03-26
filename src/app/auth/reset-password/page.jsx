"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function ResetPasswordForm() {
  const sp = useSearchParams();
  const token = sp.get("token") || "";
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setStatus("");
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    setStatus(res.ok ? "Password updated. You can sign in now." : data?.error || "Invalid token.");
  }

  return (
    <main className="container">
      <div className="card" style={{ maxWidth: 520, margin: "0 auto" }}>
        <h1>Reset password</h1>
        <p className="muted">Choose a new password.</p>
        <form onSubmit={onSubmit}>
          <label className="label">New password</label>
          <input
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <div className="row" style={{ marginTop: 14 }}>
            <button className="btn" disabled={loading || !token} type="submit">
              {loading ? "Updating…" : "Update password"}
            </button>
            <a className="link" href="/auth/signin">
              Sign in
            </a>
          </div>
        </form>

        {!token ? (
          <p className="muted" style={{ color: "tomato", marginTop: 12 }}>
            Missing token. Use the link from your email.
          </p>
        ) : null}

        {status ? <p className="muted" style={{ marginTop: 12 }}>{status}</p> : null}
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<main className="container"><p className="muted">Loading…</p></main>}>
      <ResetPasswordForm />
    </Suspense>
  );
}

