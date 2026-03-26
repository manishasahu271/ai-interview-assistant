"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function SignInForm() {
  const sp = useSearchParams();
  const callbackUrl = sp.get("callbackUrl") || "/resume";
  const error = sp.get("error");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl,
    });
    setLoading(false);
    if (res?.error) setErr("Invalid email or password.");
    else if (res?.url) window.location.href = res.url;
  }

  return (
    <main className="container">
      <div className="card" style={{ maxWidth: 520, margin: "0 auto" }}>
        <h1>Sign in</h1>
        <p className="muted">Use your email/password or OAuth if configured.</p>

        <form onSubmit={onSubmit}>
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

          {error ? (
            <p className="muted" style={{ color: "tomato", marginTop: 10 }}>
              {error === "google"
                ? "Google sign-in failed. Check your Google OAuth redirect URI and try again."
                : "OAuth sign-in failed. Try again."}
            </p>
          ) : null}

          <div className="row" style={{ marginTop: 14 }}>
            <button className="btn" disabled={loading} type="submit">
              {loading ? "Signing in…" : "Sign in"}
            </button>
            <a className="link" href="/auth/forgot-password">
              Forgot password?
            </a>
          </div>
        </form>

        <hr style={{ border: 0, borderTop: "1px solid var(--border)", margin: "18px 0" }} />

        <div className="row">
          <a className="link" href="/auth/signup">
            Create account
          </a>
        </div>
      </div>
    </main>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<main className="container"><p className="muted">Loading…</p></main>}>
      <SignInForm />
    </Suspense>
  );
}

