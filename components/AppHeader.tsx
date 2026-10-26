import Link from "next/link";
import type { ReactNode } from "react";
import { UserMenu } from "@/components/UserMenu";
import type { User } from "@/lib/types";

export function AppHeader({ user, children }: { user: User; children?: ReactNode }) {
  return (
    <header className="topbar">
      <Link href="/documents" className="brand">
        Folio
      </Link>
      <div className="topbar-center">{children}</div>
      <UserMenu user={user} />
    </header>
  );
}
