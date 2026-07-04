"use client";

import { X } from "lucide-react";

interface ScheduledPost {
  id: string;
  target_platforms: string[];
  caption: string;
  media_url: string | null;
  scheduled_time: string;
  status: string;
}

interface ViewDayPostsModalProps {
  date: Date;
  posts: ScheduledPost[];
  onClose: () => void;
  onPostClick: (post: ScheduledPost) => void;
}

export default function ViewDayPostsModal({ date, posts, onClose, onPostClick }: ViewDayPostsModalProps) {
  return (
    <div 
      className="modal-overlay" 
      onClick={onClose}
      style={{
        position: "fixed",
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        backdropFilter: "blur(4px)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 9999
      }}
    >
      <div 
        className="modal-content glass"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 400,
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 16,
          padding: 24,
          animation: "slide-up 0.3s ease-out"
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
            Posts for {date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
          </h2>
          <button onClick={onClose} className="btn-secondary" style={{ padding: 6 }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, maxHeight: "60vh", overflowY: "auto", paddingRight: 4 }}>
          {posts.map(p => {
            const timeStr = p.scheduled_time.endsWith('Z') ? p.scheduled_time : p.scheduled_time + 'Z';
            const postTime = new Date(timeStr);

            return (
              <div 
                key={p.id}
                onClick={() => {
                  onClose();
                  onPostClick(p);
                }}
                style={{
                  padding: 12,
                  background: "rgba(255,255,255,0.02)",
                  border: p.status === "published" ? "1px solid rgba(52, 211, 153, 0.3)" : p.status === "failed" ? "1px solid rgba(239, 68, 68, 0.3)" : "1px solid rgba(59, 130, 246, 0.3)",
                  borderRadius: 8,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  display: "flex",
                  alignItems: "center",
                  gap: 12
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.06)"}
                onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}
              >
                {(p as any).thumbnail_url && (
                  <img 
                    src={(p as any).thumbnail_url} 
                    alt="thumb" 
                    style={{ width: 40, height: 40, borderRadius: 6, objectFit: "cover", flexShrink: 0 }} 
                  />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ 
                    fontSize: 14, 
                    fontWeight: 600, 
                    color: p.status === "published" ? "#34d399" : p.status === "failed" ? "#ef4444" : "#60a5fa",
                    marginBottom: 4 
                  }}>
                    {postTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </div>
                  <div style={{ 
                    fontSize: 13, 
                    color: "var(--text-secondary)", 
                    whiteSpace: "nowrap", 
                    overflow: "hidden", 
                    textOverflow: "ellipsis" 
                  }}>
                    {p.caption || "Draft"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
