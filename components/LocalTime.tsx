"use client";

import { useEffect, useState } from "react";

export function LocalTime({ iso }: { iso: string }) {
  const [label, setLabel] = useState(() => `${iso.slice(0, 16).replace("T", " ")} UTC`);

  useEffect(() => {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return;
    setLabel(new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date));
  }, [iso]);

  return <time dateTime={iso}>{label}</time>;
}
