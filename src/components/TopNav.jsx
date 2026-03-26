"use client";

import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function TopNav() {
  const { status, data } = useSession();
  const isAuthed = status === "authenticated";
  const pathname = usePathname();

  const navItems = [
    { href: "/resume", label: "Resume" },
    { href: "/practice", label: "Practice" },
    { href: "/dashboard", label: "Dashboard" },
  ];

  return (
    <header className="topNavWrap">
      <nav className="topNav container">
        <Link href="/" className="brand">
          <span className="brandDot" />
          <span>AI Interview Assistant</span>
        </Link>

        <div className="navLinks">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname?.startsWith(`${item.href}/`);
            return (
              <Link key={item.href} href={item.href} className={active ? "activeNav" : ""}>
                {item.label}
              </Link>
            );
          })}
        </div>

        <div className="row" style={{ marginTop: 0 }}>
          {isAuthed ? (
            <>
              <span className="badge" style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" }}>
                {data?.user?.email || "Signed in"}
              </span>
              <button className="btn btnSecondary" type="button" onClick={() => signOut({ callbackUrl: "/" })}>
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link className="btn btnSecondary" href="/auth/signin">
                Sign in
              </Link>
              <Link className="btn" href="/auth/signup">
                Get started
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}

