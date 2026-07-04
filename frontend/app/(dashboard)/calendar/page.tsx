"use client";

import { useEffect, useState } from "react";
import CalendarView from "@/components/CalendarView";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { CalendarDays, AlertCircle } from "lucide-react";

export default function CalendarPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const supabase = createClient();
  const router = useRouter();

  const fetchPosts = async () => {
    try {
      setError(null);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";
      const res = await fetch(`${API_URL}/api/calendar/posts?user_id=${user.id}`);
      
      if (!res.ok) {
        throw new Error("Failed to fetch calendar data");
      }
      const data = await res.json();
      setPosts(data);
    } catch (err: any) {
      console.error("Failed to fetch calendar posts", err);
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
    
    // Auto-refresh every minute since the backend publisher might run
    const interval = setInterval(fetchPosts, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ padding: "40px", maxWidth: 1400, margin: "0 auto", animation: "fade-in 0.4s ease" }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif" }} className="gradient-text">
          Content Calendar
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 15, marginTop: 4 }}>
          Plan and schedule your cross-platform content visually.
        </p>
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 100 }}>
          <div className="spinner" style={{ width: 32, height: 32, border: "3px solid rgba(124,58,237,0.3)", borderTopColor: "var(--accent-primary)", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
        </div>
      ) : error ? (
        <div style={{ padding: 40, textAlign: "center", background: "rgba(239, 68, 68, 0.05)", borderRadius: 16, border: "1px dashed rgba(239, 68, 68, 0.3)" }}>
          <AlertCircle size={40} color="#ef4444" style={{ margin: "0 auto 16px auto" }} />
          <h2 style={{ fontSize: 20, color: "var(--text-primary)", marginBottom: 8 }}>Unable to load calendar</h2>
          <p style={{ color: "var(--text-secondary)", marginBottom: 24 }}>{error}</p>
          <button className="btn-secondary" onClick={fetchPosts}>Try Again</button>
        </div>
      ) : posts.length === 0 ? (
        <div style={{ padding: 60, textAlign: "center", background: "var(--surface)", borderRadius: 16, border: "1px dashed var(--border)" }}>
          <CalendarDays size={48} color="var(--accent-primary)" style={{ margin: "0 auto 16px auto", opacity: 0.8 }} />
          <h2 style={{ fontSize: 22, color: "var(--text-primary)", marginBottom: 8, fontWeight: 700 }}>No Content Scheduled</h2>
          <p style={{ color: "var(--text-secondary)", maxWidth: 400, margin: "0 auto 24px auto" }}>
            Your calendar is empty. Start planning your cross-platform content strategy by scheduling a post!
          </p>
          <CalendarView posts={[]} onRefresh={fetchPosts} />
        </div>
      ) : (
        <CalendarView posts={posts} onRefresh={fetchPosts} />
      )}
    </div>
  );
}
