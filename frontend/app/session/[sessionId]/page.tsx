"use client";

import { useParams } from "next/navigation";

import { SessionGuide } from "@/components/Guide";

export default function SessionPage() {
  const params = useParams<{ sessionId: string }>();
  return <SessionGuide sessionId={params.sessionId} />;
}
