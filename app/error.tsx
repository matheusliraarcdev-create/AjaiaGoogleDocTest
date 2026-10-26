"use client";

import Link from "next/link";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="page narrow">
      <p className="eyebrow">Something went wrong</p>
      <h1>This page did not load</h1>
      <p className="lede">Try again. If it keeps failing, return to your documents.</p>
      <div className="home-actions">
        <button type="button" className="button button-primary" onClick={reset}>
          Try again
        </button>
        <Link href="/documents" className="button button-secondary">
          Documents
        </Link>
      </div>
    </main>
  );
}
