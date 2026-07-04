import type { Metadata } from "next";
import DashboardClient from "./DashboardClient";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Dashboard — CreatorHub",
  description: "View your unified creator analytics, growth charts, and top-performing content.",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Optimize load times by fetching data server-side
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";
  let stats = null;
  let snapshots = [];
  let videos = [];

  try {
    const [statsRes, growthRes, videosRes] = await Promise.allSettled([
      fetch(`${API_URL}/api/dashboard/stats?user_id=${user.id}`, { cache: 'no-store' }),
      fetch(`${API_URL}/api/dashboard/growth?user_id=${user.id}`, { cache: 'no-store' }),
      fetch(`${API_URL}/api/dashboard/videos?user_id=${user.id}`, { cache: 'no-store' }),
    ]);

    if (statsRes.status === "fulfilled" && statsRes.value.ok) stats = await statsRes.value.json();
    if (growthRes.status === "fulfilled" && growthRes.value.ok) snapshots = await growthRes.value.json();
    if (videosRes.status === "fulfilled" && videosRes.value.ok) videos = await videosRes.value.json();
  } catch (err) {
    console.error("SSR Dashboard fetch error:", err);
  }

  return <DashboardClient userId={user.id} initialStats={stats} initialSnapshots={snapshots} initialVideos={videos} />;
}
