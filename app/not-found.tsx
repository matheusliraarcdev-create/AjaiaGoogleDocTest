import Link from "next/link";

export default function NotFound() {
  return (
    <main className="page narrow">
      <p className="eyebrow">Unavailable</p>
      <h1>This document is not available</h1>
      <p className="lede">It may have been deleted, or this account does not have access.</p>
      <p>
        <Link href="/documents" className="button button-primary">
          Back to documents
        </Link>
      </p>
    </main>
  );
}
