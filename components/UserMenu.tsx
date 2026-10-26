"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { User } from "@/lib/types";

export function UserMenu({ user }: { user: User }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function signOut() {
    setPending(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/login");
      router.refresh();
    }
  }

  return (
    <div className="user-menu">
      <span className="user-id">
        <span className="user-name">{user.name}</span>
        <span className="user-email">{user.email}</span>
      </span>
      <button type="button" className="button button-ghost" onClick={signOut} disabled={pending}>
        {pending ? "Signing out" : "Sign out"}
      </button>
    </div>
  );
}
