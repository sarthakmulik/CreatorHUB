import type { Metadata } from "next";
import InsightsClient from "./InsightsClient";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "AI Insights — CreatorHub",
  description: "AI-powered insights and recommendations based on your creator analytics.",
};

export default async function InsightsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return <InsightsClient userId={user.id} />;
}
