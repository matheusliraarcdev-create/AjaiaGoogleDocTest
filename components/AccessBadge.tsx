import type { Access } from "@/lib/types";

const LABELS: Record<Access, string> = {
  owner: "Owner",
  edit: "Can edit",
  view: "Can view",
};

export function AccessBadge({ access }: { access: Access }) {
  return <span className={`badge badge-${access}`}>{LABELS[access]}</span>;
}
