"use client";

import { useEffect, useState } from "react";
import { Eye, Users, BarChart3, Tv, RefreshCw, Loader2, LogOut, Filter, Download, ArrowRight, LayoutDashboard } from "lucide-react";
import StatCard from "@/components/StatCard";
import GrowthChart from "@/components/GrowthChart";
import VideoTable from "@/components/VideoTable";
import { SkeletonStatCard, SkeletonGrowthChart, SkeletonVideoTable } from "@/components/Skeletons";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import {
  MOCK_DASHBOARD_STATS,
  MOCK_VIDEOS,
  MOCK_SNAPSHOTS,
} from "@/lib/mock-data";
import { IS_MOCK } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function DashboardClient({ 
  userId, 
  initialStats, 
  initialSnapshots, 
  initialVideos 
}: { 
  userId: string;
  initialStats?: any;
  initialSnapshots?: any[];
  initialVideos?: any[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const [stats, setStats] = useState<any>(initialStats || null);
  const [videos, setVideos] = useState<any[]>(initialVideos || []);
  const [snapshots, setSnapshots] = useState<any[]>(initialSnapshots || []);
  const [loading, setLoading] = useState(!initialStats && !IS_MOCK);
  const [syncing, setSyncing] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [sessionUser, setSessionUser] = useState<any>(null);
  
  // Platform Filter State
  const [selectedPlatform, setSelectedPlatform] = useState<string>("all");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  
  const [now, setNow] = useState<string>("");
  
  useEffect(() => {
    setNow(new Date().toLocaleDateString("en-US", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    }));
  }, []);

  const fetchData = async () => {
    if (IS_MOCK) {
      setStats(MOCK_DASHBOARD_STATS);
      setVideos(MOCK_VIDEOS);
      setSnapshots(MOCK_SNAPSHOTS);
      setLoading(false);
      return;
    }

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";
      
      const statsReq = fetch(`${API_URL}/api/dashboard/stats?user_id=${userId}`);
      const growthReq = fetch(`${API_URL}/api/dashboard/growth?user_id=${userId}`);
      const videosReq = fetch(`${API_URL}/api/dashboard/videos?user_id=${userId}`);

      const [statsRes, growthRes, videosRes] = await Promise.allSettled([statsReq, growthReq, videosReq]);

      if (statsRes.status === "fulfilled" && statsRes.value.ok) {
        setStats(await statsRes.value.json());
      } else {
        throw new Error("Failed to fetch stats");
      }

      if (growthRes.status === "fulfilled" && growthRes.value.ok) {
        setSnapshots(await growthRes.value.json());
      }

      if (videosRes.status === "fulfilled" && videosRes.value.ok) {
        setVideos(await videosRes.value.json());
      } else {
        setVideos([]);
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
      setStats({ total_followers: 0, total_views: 0, engagement_rate: 0, platforms: [] });
      setVideos([]);
      setSnapshots([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setSessionUser(user);
    });
    // If we don't have initial data (or if it's mock), fetch it client-side
    if (!initialStats) {
      fetchData();
    }
  }, [userId, initialStats]);

  const handleSync = async () => {
    if (IS_MOCK || !stats?.platforms?.length) return;
    setSyncing(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";
      // We sync all connected platforms
      for (const p of stats.platforms) {
        if (p.connected_account_id !== "mock") {
           // We might need a generic sync endpoint later, but for now we'll just ignore or call youtube sync
           if (p.platform === "youtube") {
               await fetch(`${API_URL}/api/youtube/sync/${p.connected_account_id}`, { method: "POST" });
           }
        }
      }
      await fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setSyncing(false);
    }
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    await supabase.auth.signOut();
    router.push("/login");
  };

  const exportPDF = async () => {
    setExportingPDF(true);
    try {
      const dashboardEl = document.getElementById("dashboard-content");
      if (!dashboardEl) return;
      
      const canvas = await html2canvas(dashboardEl, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#060611" // Match --bg-base
      });
      
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save("creatorhub-dashboard.pdf");
    } catch (err) {
      console.error("PDF Export failed", err);
    } finally {
      setExportingPDF(false);
    }
  };

  if (loading) {
    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 32 }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%" }} className="skeleton" />
          <div>
            <div style={{ width: 250, height: 28, borderRadius: 6, marginBottom: 6 }} className="skeleton" />
            <div style={{ width: 150, height: 14, borderRadius: 4 }} className="skeleton" />
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 18, marginBottom: 28 }}>
          <SkeletonStatCard />
          <SkeletonStatCard />
          <SkeletonStatCard />
          <SkeletonStatCard />
        </div>
        <div style={{ marginBottom: 28 }}><SkeletonGrowthChart /></div>
        <SkeletonVideoTable />
      </div>
    );
  }

  // Filter Data based on selectedPlatform
  let filteredStats = stats;
  let filteredVideos = videos;
  let filteredSnapshots = snapshots;
  let activePlatformName = "All Platforms";
  
  if (selectedPlatform !== "all" && stats?.platforms) {
    const specificPlatform = stats.platforms.find((p: any) => p.platform === selectedPlatform);
    if (specificPlatform) {
      activePlatformName = specificPlatform.account_name || specificPlatform.platform;
      filteredStats = {
        total_followers: specificPlatform.subscribers,
        total_views: specificPlatform.total_views,
        engagement_rate: specificPlatform.engagement_rate,
        platforms: [specificPlatform]
      };
      filteredVideos = videos.filter((v: any) => v.platform === selectedPlatform);
      filteredSnapshots = snapshots.filter((s: any) => s.platform === selectedPlatform);
    }
  }

  // To display the chart properly when filtering by specific platform, we just pass the first match's snapshots
  const chartSnapshots = selectedPlatform === "all" 
    ? (snapshots.length > 0 ? snapshots[0].snapshots : []) 
    : (filteredSnapshots.length > 0 ? filteredSnapshots[0].snapshots : []);

  const videoCount = filteredVideos.length || 0;
  const displayName = sessionUser?.user_metadata?.display_name || "Creator";
  const hasAccounts = stats?.platforms?.length > 0 && stats?.platforms[0]?.connected_account_id !== "mock" || IS_MOCK;

  return (
    <div id="dashboard-content">
      {/* ─── Page Header ─────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 32, flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #7c3aed 0%, #3b82f6 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontWeight: "bold",
                fontSize: 18,
                border: "2px solid var(--border-bright)"
              }}
            >
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 style={{ fontSize: 26, fontWeight: 800, fontFamily: "'Space Grotesk', sans-serif", color: "var(--text-primary)", lineHeight: 1.1 }}>
                Welcome back, <span className="gradient-text">{displayName}</span>
              </h1>
              <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{now}</p>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          
          {/* Platform Filter Dropdown */}
          {hasAccounts && (
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="btn-secondary"
                style={{ 
                  display: "flex", alignItems: "center", gap: 8, 
                  background: "var(--surface)", border: "1px solid var(--border)", 
                  padding: "8px 16px", borderRadius: 8, fontSize: 14, fontWeight: 600, 
                  color: "var(--text-primary)" 
                }}
              >
                {selectedPlatform === "all" ? "Show All" : selectedPlatform.charAt(0).toUpperCase() + selectedPlatform.slice(1)}
                <Filter size={14} color="var(--text-muted)" />
              </button>

              {dropdownOpen && (
                <div style={{ 
                  position: "absolute", top: "100%", right: 0, marginTop: 8, 
                  background: "var(--bg-base)", border: "1px solid var(--border)", 
                  borderRadius: 12, padding: 8, zIndex: 50, display: "flex", 
                  flexDirection: "column", minWidth: 160, boxShadow: "0 10px 40px rgba(0,0,0,0.5)" 
                }}>
                  <div 
                    onClick={() => { setSelectedPlatform("all"); setDropdownOpen(false); }} 
                    style={{ 
                      padding: "10px 12px", textAlign: "left", 
                      background: selectedPlatform === "all" ? "rgba(255,255,255,0.05)" : "transparent", 
                      color: selectedPlatform === "all" ? "var(--accent-primary)" : "var(--text-secondary)", 
                      fontSize: 14, fontWeight: 600, cursor: "pointer", borderRadius: 6,
                      transition: "all 0.2s"
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
                    onMouseLeave={(e) => e.currentTarget.style.background = selectedPlatform === "all" ? "rgba(255,255,255,0.05)" : "transparent"}
                  >
                    Show All
                  </div>
                  {stats?.platforms?.map((p: any) => (
                    <div 
                      key={p.platform} 
                      onClick={() => { setSelectedPlatform(p.platform); setDropdownOpen(false); }} 
                      style={{ 
                        padding: "10px 12px", textAlign: "left", 
                        background: selectedPlatform === p.platform ? "rgba(255,255,255,0.05)" : "transparent", 
                        color: selectedPlatform === p.platform ? "var(--accent-primary)" : "var(--text-secondary)", 
                        fontSize: 14, fontWeight: 600, cursor: "pointer", borderRadius: 6,
                        transition: "all 0.2s"
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
                      onMouseLeave={(e) => e.currentTarget.style.background = selectedPlatform === p.platform ? "rgba(255,255,255,0.05)" : "transparent"}
                    >
                      {p.platform.charAt(0).toUpperCase() + p.platform.slice(1)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Sync button */}
          {hasAccounts && (
            <button
              onClick={handleSync}
              disabled={syncing}
              className="btn-secondary"
              style={{ display: "flex", alignItems: "center", gap: 8, opacity: syncing ? 0.7 : 1 }}
            >
              <RefreshCw size={14} className={syncing ? "animate-spin" : ""} />
              {syncing ? "Syncing..." : "Sync"}
            </button>
          )}

          {/* Export PDF Button */}
          {hasAccounts && (
            <button
              onClick={exportPDF}
              disabled={exportingPDF}
              className="btn-secondary"
              style={{ display: "flex", alignItems: "center", gap: 8, opacity: exportingPDF ? 0.7 : 1 }}
            >
              {exportingPDF ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              Export PDF
            </button>
          )}
          
          {/* Sign Out button */}
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="btn-secondary"
            style={{ display: "flex", alignItems: "center", gap: 8, color: "#ef4444", borderColor: "rgba(239,68,68,0.2)" }}
          >
            <LogOut size={14} />
            {signingOut ? "..." : "Sign Out"}
          </button>
        </div>
      </div>

      {!hasAccounts ? (
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "80px 20px",
          textAlign: "center",
          background: "var(--surface)",
          borderRadius: 24,
          border: "1px dashed var(--border)",
          boxShadow: "inset 0 0 40px rgba(0,0,0,0.2)"
        }}>
          <div style={{
            width: 80, height: 80, borderRadius: 20, background: "rgba(124, 58, 237, 0.1)",
            display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24,
            border: "1px solid rgba(124, 58, 237, 0.2)"
          }}>
            <LayoutDashboard size={40} color="var(--accent-primary)" />
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)", marginBottom: 12 }}>
            Your dashboard is empty
          </h2>
          <p style={{ fontSize: 16, color: "var(--text-secondary)", maxWidth: 400, marginBottom: 32, lineHeight: 1.5 }}>
            Connect your YouTube, Instagram, or TikTok accounts to start tracking your unified analytics, audience growth, and content performance.
          </p>
          <button
            onClick={() => router.push("/settings")}
            className="btn-primary"
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 24px", fontSize: 16 }}
          >
            Connect a Platform
            <ArrowRight size={18} />
          </button>
        </div>
      ) : (
        <>
          {/* ─── Connected Platform Banner ────────────────────────── */}
      {filteredStats?.platforms?.length > 0 && selectedPlatform !== "all" && (
        <div
          className="glass animate-fade-in-up"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            padding: "16px 24px",
            marginBottom: 28,
            border: "1px solid rgba(255,0,0,0.15)",
            background: "rgba(255,0,0,0.04)",
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: selectedPlatform === "instagram" ? "rgba(225,48,108,0.12)" : "rgba(255,0,0,0.12)",
              border: `1px solid ${selectedPlatform === "instagram" ? "rgba(225,48,108,0.2)" : "rgba(255,0,0,0.2)"}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {selectedPlatform === "instagram" ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#e1306c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
              </svg>
            ) : <Tv size={20} color="#ff4444" />}
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
              {activePlatformName}
            </p>
            <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
              {selectedPlatform.charAt(0).toUpperCase() + selectedPlatform.slice(1)} · {videoCount} items
            </p>
          </div>
          <div className="badge badge-green">Connected</div>
        </div>
      )}

      {/* ─── Stat Cards ──────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 18,
          marginBottom: 28,
        }}
      >
        <StatCard
          label={selectedPlatform === "instagram" ? "Followers" : "Subscribers"}
          value={filteredStats?.total_followers || 0}
          trend={+3.2}
          trendLabel="vs last month"
          icon={<Users size={16} color="#a78bfa" />}
          color="purple"
          delay={0}
        />
        <StatCard
          label="Views"
          value={filteredStats?.total_views || 0}
          trend={+8.7}
          trendLabel="vs last month"
          icon={<Eye size={16} color="#22d3ee" />}
          color="cyan"
          delay={100}
        />
        <StatCard
          label="Engagement"
          value={filteredStats?.engagement_rate || 0}
          suffix="%"
          format="decimal"
          trend={+0.4}
          trendLabel="vs last month"
          icon={<BarChart3 size={16} color="#34d399" />}
          color="green"
          delay={200}
        />
        <StatCard
          label={selectedPlatform === "instagram" ? "Reels/Posts" : "Videos"}
          value={videoCount}
          icon={<Tv size={16} color="#fbbf24" />}
          color="amber"
          delay={300}
        />
      </div>

      {chartSnapshots.length > 0 && (
          <div className="animate-fade-in-up delay-400" style={{ marginBottom: 28 }}>
            <GrowthChart snapshots={chartSnapshots} accountName={activePlatformName} platform={selectedPlatform} />
          </div>
      )}

      {/* ─── Video Table ──────────────────────────────────────── */}
      <div className="animate-fade-in-up delay-500">
        <VideoTable videos={filteredVideos} />
      </div>
        </>
      )}
    </div>
  );
}
