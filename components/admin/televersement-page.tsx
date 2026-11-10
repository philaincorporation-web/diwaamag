"use client";

import { useRouter } from "next/navigation";
import { Televersement } from "@/components/admin/mediatheque";

export function TeleversementPage() {
  const router = useRouter();
  return <Televersement onTermine={() => router.refresh()} />;
}
