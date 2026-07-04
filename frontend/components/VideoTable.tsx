"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronUp, ChevronDown, ChevronsUpDown, Eye, Heart, MessageCircle, Share2, Clock } from "lucide-react";
import { formatNumber, formatDate, formatDuration, timeAgo } from "@/lib/utils";

interface Video {
  id: string;
  platform_post_id: string;
  title: string;
  thumbnail_url: string;
  published_at: string;
  views: number;
  likes: number;
  comments: number;
  shares?: number;
  duration_seconds?: number;
  platform?: string;
}

type SortKey = "views" | "likes" | "comments" | "shares" | "published_at";
type SortDir = "asc" | "desc";

interface VideoTableProps {
  videos: Video[];
}

const COLUMNS: { key: SortKey; label: string; icon: React.ReactNode }[] = [
  { key: "views",        label: "Views",    icon: <Eye size={13} />         },
  { key: "likes",        label: "Likes",    icon: <Heart size={13} />       },
  { key: "comments",     label: "Comments", icon: <MessageCircle size={13} />},
  { key: "shares",       label: "Shares",   icon: <Share2 size={13} />      },
  { key: "published_at", label: "Date",     icon: <Clock size={13} />       },
];

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <ChevronsUpDown size={12} style={{ opacity: 0.4 }} />;
  return dir === "desc" ? <ChevronDown size={12} style={{ color: "#a78bfa" }} /> : <ChevronUp size={12} style={{ color: "#a78bfa" }} />;
}

export default function VideoTable({ videos }: VideoTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("published_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const handleSort = (key: SortKey) => {
    if (key === sortKey) setSortDir(d => (d === "desc" ? "asc" : "desc"));
    else { setSortKey(key); setSortDir("desc"); }
  };

  const sorted = [...videos].sort((a, b) => {
    const av = sortKey === "published_at" ? new Date(a.published_at).getTime() : (a[sortKey] as number);
    const bv = sortKey === "published_at" ? new Date(b.published_at).getTime() : (b[sortKey] as number);
    return sortDir === "desc" ? bv - av : av - bv;
  });

  return (
    <div className="glass" style={{ padding: 0, overflow: "hidden" }}>
      {/* Table header */}
      <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid var(--border-subtle)" }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
          Recent Videos
        </h3>
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
          Last {videos.length} published · Click columns to sort
        </p>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ paddingLeft: 24, width: 380 }}>Video</th>
              {COLUMNS.map(col => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  style={{ textAlign: col.key === "published_at" ? "left" : "right" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: col.key === "published_at" ? "flex-start" : "flex-end" }}>
                    {col.icon}
                    {col.label}
                    <SortIcon active={sortKey === col.key} dir={sortDir} />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((video, idx) => (
              <tr key={video.id || video.platform_post_id} className="animate-fade-in" style={{ animationDelay: `${idx * 30}ms` }}>
                {/* Thumbnail + title */}
                <td style={{ paddingLeft: 24 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ position: "relative", flexShrink: 0 }}>
                      <img
                        src={video.thumbnail_url}
                        alt={video.title}
                        width={88}
                        height={50}
                        style={{
                          borderRadius: 8,
                          objectFit: "cover",
                          border: "1px solid var(--border-subtle)",
                        }}
                      />
                      {/* Duration overlay */}
                      {(video.duration_seconds || 0) > 0 && (
                        <div style={{
                          position: "absolute",
                          bottom: 4,
                          right: 4,
                          background: "rgba(0,0,0,0.8)",
                          color: "#fff",
                          fontSize: 10,
                          fontWeight: 600,
                          padding: "1px 5px",
                          borderRadius: 4,
                          lineHeight: 1.6,
                        }}>
                          {formatDuration(video.duration_seconds || 0)}
                        </div>
                      )}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "var(--text-primary)",
                        overflow: "hidden",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        lineHeight: 1.4,
                        marginBottom: 4,
                      }}>
                        {video.title}
                      </p>
                      <div className={`badge badge-${video.platform || "youtube"}`} style={{ fontSize: 10 }}>
                        {((video.platform || "youtube") as string).charAt(0).toUpperCase() + ((video.platform || "youtube") as string).slice(1)}
                      </div>
                    </div>
                  </div>
                </td>

                {/* Stats */}
                <td style={{ textAlign: "right", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 14, color: "#e2e8f0" }}>
                  {formatNumber(video.views || 0)}
                </td>
                <td style={{ textAlign: "right", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 14, color: "#f472b6" }}>
                  {formatNumber(video.likes || 0)}
                </td>
                <td style={{ textAlign: "right", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 14, color: "#34d399" }}>
                  {formatNumber(video.comments || 0)}
                </td>
                <td style={{ textAlign: "right", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 14, color: "#22d3ee" }}>
                  {formatNumber(video.shares || 0)}
                </td>
                <td style={{ whiteSpace: "nowrap" }}>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{formatDate(video.published_at)}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{timeAgo(video.published_at)}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
