"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import CreatePostModal from "./CreatePostModal";
import EditPostModal from "./EditPostModal";
import ViewDayPostsModal from "./ViewDayPostsModal";

interface ScheduledPost {
  id: string;
  target_platforms: string[];
  caption: string;
  media_url: string | null;
  scheduled_time: string;
  status: string;
}

export default function CalendarView({
  posts,
  onRefresh
}: {
  posts: ScheduledPost[];
  onRefresh: () => void;
}) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  const [selectedPost, setSelectedPost] = useState<ScheduledPost | null>(null);
  const [viewAllDate, setViewAllDate] = useState<Date | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Calendar math
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const days = [];
  
  // Previous month overflow
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push({
      date: new Date(year, month - 1, daysInPrevMonth - firstDayOfMonth + i + 1),
      isCurrentMonth: false,
    });
  }
  
  // Current month
  for (let i = 1; i <= daysInMonth; i++) {
    days.push({
      date: new Date(year, month, i),
      isCurrentMonth: true,
    });
  }
  
  // Next month overflow (to complete the 42 cell grid)
  const remainingCells = 42 - days.length;
  for (let i = 1; i <= remainingCells; i++) {
    days.push({
      date: new Date(year, month + 1, i),
      isCurrentMonth: false,
    });
  }

  const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const openNewPost = (date: Date) => {
    // Determine if the clicked date is strictly before today (ignoring time)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (date < today) {
      alert("You cannot schedule posts for days that have already passed.");
      return;
    }
    
    setSelectedDate(date);
    setIsCreateModalOpen(true);
  };

  const getPostsForDay = (date: Date) => {
    return posts.filter(p => {
      // Ensure backend time string is treated as UTC
      const timeStr = p.scheduled_time.endsWith('Z') ? p.scheduled_time : p.scheduled_time + 'Z';
      const pDate = new Date(timeStr);
      return (
        pDate.getFullYear() === date.getFullYear() &&
        pDate.getMonth() === date.getMonth() &&
        pDate.getDate() === date.getDate()
      );
    });
  };

  return (
    <div className="glass" style={{ padding: "24px", minHeight: "75vh", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>
            {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </h2>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={handlePrevMonth} className="btn-secondary" style={{ padding: 8 }}>
              <ChevronLeft size={18} />
            </button>
            <button onClick={handleNextMonth} className="btn-secondary" style={{ padding: 8 }}>
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
        <button className="btn-primary" onClick={() => openNewPost(new Date())}>
          <Plus size={16} />
          New Scheduled Post
        </button>
      </div>

      {/* Days of week */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 12, marginBottom: 12 }}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} style={{ textAlign: "center", fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>
            {day}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 12, flex: 1 }}>
        {days.map((dayObj, i) => {
          const dayPosts = getPostsForDay(dayObj.date);
          const isToday = new Date().toDateString() === dayObj.date.toDateString();

          return (
            <div
              key={i}
              onClick={() => openNewPost(dayObj.date)}
              style={{
                minHeight: 120,
                minWidth: 0,
                background: dayObj.isCurrentMonth ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.01)",
                border: isToday ? "1px solid var(--accent-primary)" : "1px solid var(--border-subtle)",
                borderRadius: 12,
                padding: 12,
                opacity: dayObj.isCurrentMonth ? 1 : 0.4,
                cursor: "pointer",
                transition: "all 0.2s ease",
                overflow: "hidden",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                e.currentTarget.style.borderColor = "var(--border-bright)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = dayObj.isCurrentMonth ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.01)";
                e.currentTarget.style.borderColor = isToday ? "var(--accent-primary)" : "var(--border-subtle)";
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <span style={{ 
                  fontSize: 14, 
                  fontWeight: isToday ? 700 : 500,
                  color: isToday ? "var(--accent-primary)" : "var(--text-secondary)",
                  background: isToday ? "rgba(124,58,237,0.1)" : "transparent",
                  padding: isToday ? "2px 6px" : 0,
                  borderRadius: 6
                }}>
                  {dayObj.date.getDate()}
                </span>
              </div>
              
              {/* Badges */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {dayPosts.slice(0, 3).map(p => {
                  const timeStr = p.scheduled_time.endsWith('Z') ? p.scheduled_time : p.scheduled_time + 'Z';
                  const postTime = new Date(timeStr);
                  
                  return (
                    <div 
                      key={p.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPost(p);
                      }}
                      style={{
                        fontSize: 11,
                        padding: "4px 6px",
                        background: p.status === "published" ? "rgba(52, 211, 153, 0.15)" : p.status === "failed" ? "rgba(239, 68, 68, 0.15)" : "rgba(59, 130, 246, 0.15)",
                        border: p.status === "published" ? "1px solid rgba(52, 211, 153, 0.3)" : p.status === "failed" ? "1px solid rgba(239, 68, 68, 0.3)" : "1px solid rgba(59, 130, 246, 0.3)",
                        color: p.status === "published" ? "#34d399" : p.status === "failed" ? "#ef4444" : "#60a5fa",
                        borderRadius: 4,
                        transition: "all 0.2s ease",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        minWidth: 0
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.filter = "brightness(1.2)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.filter = "none";
                      }}
                    >
                      {(p as any).thumbnail_url && (
                        <img 
                          src={(p as any).thumbnail_url} 
                          alt="thumb" 
                          style={{ width: 16, height: 16, borderRadius: 2, objectFit: "cover", flexShrink: 0 }} 
                        />
                      )}
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {postTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {p.caption || "Draft"}
                      </span>
                    </div>
                  );
                })}
                {dayPosts.length > 3 && (
                  <div 
                    onClick={(e) => {
                      e.stopPropagation();
                      setViewAllDate(dayObj.date);
                    }}
                    style={{ 
                      fontSize: 10, 
                      color: "var(--text-muted)", 
                      textAlign: "center", 
                      marginTop: 4,
                      padding: "4px",
                      borderRadius: 4,
                      cursor: "pointer",
                      background: "rgba(255,255,255,0.03)"
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.08)"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.03)"}
                  >
                    +{dayPosts.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {isCreateModalOpen && (
        <CreatePostModal
          initialDate={selectedDate}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={() => {
            setIsCreateModalOpen(false);
            onRefresh();
          }}
        />
      )}

      {selectedPost && (
        <EditPostModal
          post={selectedPost}
          onClose={() => setSelectedPost(null)}
          onSuccess={() => {
            setSelectedPost(null);
            onRefresh();
          }}
        />
      )}

      {viewAllDate && (
        <ViewDayPostsModal
          date={viewAllDate}
          posts={getPostsForDay(viewAllDate)}
          onClose={() => setViewAllDate(null)}
          onPostClick={(p) => setSelectedPost(p)}
        />
      )}
    </div>
  );
}
