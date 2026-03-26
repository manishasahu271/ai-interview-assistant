"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

export default function SignUpPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json().catch(() => ({}));
      console.log("[signup] /api/auth/signup:", res.status, data);

      if (!res.ok) {
        setErr(data?.error || "Failed to create account.");
        return;
      }

      // next-auth automatic redirect can be slow/finicky in dev; handle it explicitly.
      const signInResult = await signIn("credentials", {
        email,
        password,
        callbackUrl: "/resume",
        redirect: false,
      });

      console.log("[signup] signIn(credentials) result:", signInResult);

      if (signInResult?.error) {
        setErr(signInResult?.error || "Sign-in failed after account creation. Please try again.");
        return;
      }

      const url = signInResult?.url || "/resume";
      // eslint-disable-next-line no-console
      console.log("[signup] redirecting to:", url);
      window.location.href = url;
    } catch (err) {
      console.error("[signup] Unexpected error:", err);
      setErr(err?.message || "Something went wrong while creating your account.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container">
      <div className="card" style={{ maxWidth: 520, margin: "0 auto" }}>
        <h1>Create account</h1>
        <p className="muted">Password must be at least 8 characters.</p>

        <form onSubmit={onSubmit}>
          <label className="label">Name (optional)</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} />

          <label className="label">Email</label>
          <input
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label className="label">Password</label>
          <input
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {err ? (
            <p className="muted" style={{ color: "tomato", marginTop: 10 }}>
              {err}
            </p>
          ) : null}

          <div className="row" style={{ marginTop: 14 }}>
            <button className="btn" disabled={loading} type="submit">
              {loading ? "Creating…" : "Create account"}
            </button>
            <a className="link" href="/auth/signin">
              Already have an account?
            </a>
          </div>
        </form>
      </div>
    </main>
  );
}

