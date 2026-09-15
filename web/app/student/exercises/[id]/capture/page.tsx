"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function CaptureRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  useEffect(() => {
    router.replace(`/student/exercises/${id}`);
  }, [id, router]);
  return null;
}
