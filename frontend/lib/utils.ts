/**
 * Utility helpers for CreatorHub frontend.
 */

/** Format large numbers: 1234567 → "1.2M", 847300 → "847.3K" */
export function formatNumber(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

/** Format duration in seconds to "mm:ss" or "h:mm:ss" */
export function formatDuration(seconds: number): string {
  if (!seconds) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Format a date string to "Jun 15, 2025" */
export function formatDate(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Format a date string to relative time: "3 days ago" */
export function timeAgo(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
  return formatDate(iso);
}

/** Engagement rate as a string with color class */
export function engagementColor(rate: number): string {
  if (rate >= 5) return "text-emerald-400";
  if (rate >= 3) return "text-yellow-400";
  return "text-red-400";
}

/** clsx-lite: join class names filtering falsy */
export function cx(...classes: (string | false | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

/** Get platform display name */
export function platformName(platform: string): string {
  const map: Record<string, string> = {
    youtube: "YouTube",
    instagram: "Instagram",
    tiktok: "TikTok",
    twitter: "Twitter/X",
    facebook: "Facebook",
    linkedin: "LinkedIn",
    snapchat: "Snapchat",
  };
  return map[platform] ?? platform;
}

/** Whether mock mode is active */
export const IS_MOCK = process.env.NEXT_PUBLIC_MOCK_MODE === "true";

/** API base URL */
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
