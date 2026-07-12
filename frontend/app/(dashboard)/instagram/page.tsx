"use client";

import { useEffect, useState } from "react";
import {
  Camera as IgIcon, Users, MapPin, Globe2, Heart, Bookmark,
  Share2, MessageCircle, Eye, TrendingUp, RefreshCw, Loader2, ArrowRight,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { API_URL } from "@/lib/utils";
import BestTimeHeatmap from "@/components/BestTimeHeatmap";

/* ────────────────────────────────────────────────────────────────────────── */
/*  Types                                                                      */
/* ────────────────────────────────────────────────────────────────────────── */

interface AudienceData {
  demographics: {
    gender_age: { id: string; value: number }[];
    cities: { id: string; value: number }[];
    countries: { id: string; value: number }[];
  };
  date: string | null;
}

interface PostRow {
  id: string;
  title: string | null;
  thumbnail_url: string | null;
  published_at: string;
  views: number;
  likes: number;
  comments: number;
  platform: string;
  // deep metrics (filled in via /insights lookups)
  reach?: number;
  impressions?: number;
  saves?: number;
  shares?: number;
  replies?: number;
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Helpers                                                                    */
/* ────────────────────────────────────────────────────────────────────────── */

function formatNumber(n: number): string {
  if (!n && n !== 0) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// Aggregate gender/age buckets like "F.18-24" into gender splits + age bands
function parseGenderAge(items: { id: string; value: number }[]) {
  let male = 0, female = 0, unknown = 0;
  const ageBands: Record<string, number> = {};
  for (const it of items) {
    const [gender, age] = it.id.split(".");
    if (gender === "M") male += it.value;
    else if (gender === "F") female += it.value;
    else unknown += it.value;
    if (age) ageBands[age] = (ageBands[age] || 0) + it.value;
  }
  const total = male + female + unknown || 1;
  return {
    male: { pct: (male / total) * 100, raw: male },
    female: { pct: (female / total) * 100, raw: female },
    ageBands: Object.entries(ageBands)
      .sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }))
      .map(([band, val]) => ({ band, val, pct: (val / total) * 100 })),
  };
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Page                                                                       */
/* ────────────────────────────────────────────────────────────────────────── */

export default function InstagramPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [accountName, setAccountName] = useState<string>("");
  const [audience, setAudience] = useState<AudienceData | null>(null);
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [error, setError] = useState("");

  const loadAll = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setError("Not signed in."); return; }

      // 1. Find the user's Instagram connected account via dashboard stats
      const statsRes = await fetch(`${API_URL}/api/dashboard/stats?user_id=${user.id}`);
      if (!statsRes.ok) throw new Error("Failed to load account");
      const stats = await statsRes.json();
      const ig = (stats.platforms || []).find((p: any) => p.platform === "instagram");
      if (!ig) {
        setError("Connect your Instagram account in Settings to unlock deep analytics.");
        setLoading(false);
        return;
      }
      setAccountId(ig.connected_account_id);
      setAccountName(ig.account_name || "Instagram");

      // 2. Audience demographics + posts in parallel
      const [audRes, vidsRes] = await Promise.all([
        fetch(`${API_URL}/api/instagram/audience/${ig.connected_account_id}`).then(r => r.ok ? r.json() : null).catch(() => null),
        fetch(`${API_URL}/api/dashboard/videos?user_id=${user.id}`).then(r => r.ok ? r.json() : []).catch(() => []),
      ]);

      if (audRes) setAudience(audRes);
      const igPosts: PostRow[] = (vidsRes || [])
        .filter((v: any) => v.platform === "instagram" && v.status === "published")
        .map((v: any) => ({
          id: v.id,
          title: v.title,
          thumbnail_url: v.thumbnail_url,
          published_at: v.published_at,
          views: v.views, likes: v.likes, comments: v.comments,
          platform: v.platform,
        }));
      setPosts(igPosts);

      // 3. Lazy-load deep insights per post (small N, sequential to avoid rate limits)
      const enriched = await Promise.all(
        igPosts.slice(0, 12).map(async (p) => {
          try {
            const r = await fetch(`${API_URL}/api/instagram/insights/${p.id}`);
            if (!r.ok) return p;
            const j = await r.json();
            const m = j.metrics || {};
            return {
              ...p,
              reach: m.reach, impressions: m.impressions,
              saves: m.saves ?? m.saved, shares: m.shares, replies: m.replies,
            };
          } catch { return p; }
        })
      );
      setPosts(prev => {
        const map = new Map(enriched.map(e => [e.id, e]));
        return prev.map(p => map.get(p.id) ?? p);
      });
    } catch (e: any) {
      setError(e.message || "Failed to load Instagram analytics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); /* eslint-disable-next-line */ }, []);

  const handleSync = async () => {
    if (!accountId) return;
    setSyncing(true);
    try {
      await fetch(`${API_URL}/api/instagram/sync/${accountId}`, { method: "POST" });
      await loadAll();
    } catch { /* ignore */ } finally { setSyncing(false); }
  };

  const handleRefreshAudience = async () => {
    if (!accountId) return;
    setSyncing(true);
    try {
      await fetch(`${API_URL}/api/instagram/audience/${accountId}?refresh=true`);
      await loadAll();
    } catch { /* ignore */ } finally { setSyncing(false); }
  };

  /* ── Loading ──────────────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <Loader2 className="animate-spin" size={32} color="#7c3aed" />
      </div>
    );
  }

  /* ── Not connected ────────────────────────────────────────────────────── */
  if (error && !accountId) {
    return (
      <div>
        <PageHeader accountName="Instagram" syncing={false} onSync={() => {}} />
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          padding: "80px 20px", textAlign: "center", background: "var(--surface)",
          borderRadius: 24, border: "1px dashed var(--border)",
        }}>
          <div style={{
            width: 80, height: 80, borderRadius: 20, background: "rgba(225,48,108,0.1)",
            display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24,
            border: "1px solid rgba(225,48,108,0.2)",
          }}>
            <IgIcon size={40} color="#e1306c" />
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)", marginBottom: 12 }}>
            Instagram not connected
          </h2>
          <p style={{ fontSize: 16, color: "var(--text-secondary)", maxWidth: 420, marginBottom: 32, lineHeight: 1.5 }}>
            {error}
          </p>
          <a href="/settings" className="btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "12px 24px", fontSize: 16 }}>
            Connect Instagram <ArrowRight size={18} />
          </a>
        </div>
      </div>
    );
  }

  /* ── Derived data ─────────────────────────────────────────────────────── */
  const demo = audience?.demographics || { gender_age: [], cities: [], countries: [] };
  const parsed = parseGenderAge(demo.gender_age);
  const topCities = [...demo.cities].sort((a, b) => b.value - a.value).slice(0, 8);
  const topCountries = [...demo.countries].sort((a, b) => b.value - a.value).slice(0, 5);

  // Engagement-quality ring across posts with reach data:
  // (saves + shares + replies) / reach — the metric sponsors actually ask for
  const reachPosts = posts.filter(p => p.reach && p.reach > 0);
  let qualityPct = 0;
  if (reachPosts.length) {
    const sq = reachPosts.reduce((acc, p) => acc + ((p.saves || 0) + (p.shares || 0) + (p.replies || 0)), 0);
    const totalReach = reachPosts.reduce((acc, p) => acc + (p.reach || 0), 0);
    qualityPct = totalReach ? (sq / totalReach) * 100 : 0;
  }

  return (
    <div>
      <PageHeader accountName={accountName} syncing={syncing} onSync={handleSync} onRefreshAudience={handleRefreshAudience} />

      {/* Section: Audience */}
      <h2 style={sectionTitle}>Audience</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 18, marginBottom: 32 }}>
        {/* Gender split + age bands */}
        <div className="glass animate-fade-in-up" style={cardStyle}>
          <div style={cardHeader}>
            <div style={iconBadge("rgba(124,58,237,0.12)", "rgba(124,58,237,0.2)", "#a78bfa")}><Users size={18} /></div>
            <span style={cardTitle}>Gender &amp; Age</span>
          </div>
          {demo.gender_age.length === 0 ? (
            <Empty>Demographics unavailable for this account.</Empty>
          ) : (
            <>
              <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
                <GenderBar label="Female" pct={parsed.female.pct} color="#ec4899" />
                <GenderBar label="Male" pct={parsed.male.pct} color="#6366f1" />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {parsed.ageBands.map(b => (
                  <div key={b.band} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12 }}>
                    <span style={{ width: 56, color: "var(--text-secondary)" }}>{b.band}</span>
                    <div style={{ flex: 1, height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 99 }}>
                      <div style={{ width: `${b.pct}%`, height: "100%", borderRadius: 99, background: "linear-gradient(90deg,#7c3aed,#6366f1)" }} />
                    </div>
                    <span style={{ width: 40, textAlign: "right", color: "var(--text-muted)" }}>{b.pct.toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Top cities */}
        <div className="glass animate-fade-in-up" style={{ ...cardStyle, animationDelay: "60ms" }}>
          <div style={cardHeader}>
            <div style={iconBadge("rgba(34,211,238,0.12)", "rgba(34,211,238,0.2)", "#22d3ee")}><MapPin size={18} /></div>
            <span style={cardTitle}>Top Cities</span>
          </div>
          {topCities.length === 0 ? (
            <Empty>City data unavailable.</Empty>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {topCities.map((c, i) => {
                const name = c.id.split(",")[0];
                const pct = topCities[0].value ? (c.value / topCities[0].value) * 100 : 0;
                return (
                  <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
                    <span style={{ width: 18, color: "var(--text-muted)", fontWeight: 600 }}>#{i + 1}</span>
                    <span style={{ flex: 1, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</span>
                    <div style={{ width: 90, height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 99 }}>
                      <div style={{ width: `${pct}%`, height: "100%", borderRadius: 99, background: "linear-gradient(90deg,#06b6d4,#22d3ee)" }} />
                    </div>
                    <span style={{ width: 44, textAlign: "right", color: "var(--text-muted)", fontSize: 12 }}>{c.value.toFixed(1)}%</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top countries */}
        <div className="glass animate-fade-in-up" style={{ ...cardStyle, animationDelay: "120ms" }}>
          <div style={cardHeader}>
            <div style={iconBadge("rgba(52,211,153,0.12)", "rgba(52,211,153,0.2)", "#34d399")}><Globe2 size={18} /></div>
            <span style={cardTitle}>Top Countries</span>
          </div>
          {topCountries.length === 0 ? (
            <Empty>Country data unavailable.</Empty>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {topCountries.map((c, i) => (
                <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
                  <span style={{ width: 18, color: "var(--text-muted)", fontWeight: 600 }}>#{i + 1}</span>
                  <span style={{ flex: 1, color: "var(--text-primary)" }}>{c.id}</span>
                  <span style={{ color: "var(--text-muted)", fontSize: 12 }}>{c.value.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Section: Best Time Heatmap */}
      <div style={{ marginBottom: 32 }}>
        <BestTimeHeatmap accountId={accountId || undefined} />
      </div>

      {/* Section: Engagement quality */}
      <h2 style={sectionTitle}>Engagement Quality</h2>
      <div className="glass animate-fade-in-up" style={{ ...cardStyle, display: "flex", alignItems: "center", gap: 32, flexWrap: "wrap", marginBottom: 32 }}>
        <QualityRing pct={qualityPct} />
        <div style={{ flex: 1, minWidth: 240 }}>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 16 }}>
            <strong style={{ color: "var(--text-primary)" }}>Quality engagement</strong> = saves + shares + replies ÷ reach.
            This is the metric brands actually care about — it shows how many viewers actively act on your content, not just scroll past.
          </p>
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
            <MetricPill icon={<Bookmark size={14} />} label="Saves" value={reachPosts.reduce((a, p) => a + (p.saves || 0), 0)} color="#fbbf24" />
            <MetricPill icon={<Share2 size={14} />} label="Shares" value={reachPosts.reduce((a, p) => a + (p.shares || 0), 0)} color="#22d3ee" />
            <MetricPill icon={<MessageCircle size={14} />} label="Replies" value={reachPosts.reduce((a, p) => a + (p.replies || 0), 0)} color="#34d399" />
          </div>
        </div>
      </div>

      {/* Section: Per-post deep metrics */}
      <h2 style={sectionTitle}>Post Breakdown</h2>
      <div className="glass animate-fade-in-up" style={{ padding: "8px 8px", overflowX: "auto", marginBottom: 32 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
          <thead>
            <tr>
              {["Post", "Reach", "Impr.", "Likes", "Saves", "Shares", "Replies", "When"].map(h => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {posts.length === 0 && (
              <tr><td colSpan={8} style={emptyTd}>No posts synced yet. Hit Sync to pull latest.</td></tr>
            )}
            {posts.map(p => (
              <tr key={p.id} style={{ borderTop: "1px solid var(--border-subtle)" }}>
                <td style={tdStyle}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {p.thumbnail_url ? (
                      <img src={p.thumbnail_url} alt="" style={{ width: 36, height: 36, borderRadius: 8, objectFit: "cover" }} />
                    ) : (
                      <div style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(225,48,108,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <IgIcon size={16} color="#e1306c" />
                      </div>
                    )}
                    <span style={{ color: "var(--text-primary)", fontSize: 13, maxWidth: 200, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {p.title || "Untitled"}
                    </span>
                  </div>
                </td>
                <td style={tdStyle}><MetricVal icon={<Eye size={12} />} value={p.reach} /></td>
                <td style={tdStyle}><MetricVal icon={<TrendingUp size={12} />} value={p.impressions} /></td>
                <td style={tdStyle}><MetricVal icon={<Heart size={12} />} value={p.likes} color="#ec4899" /></td>
                <td style={tdStyle}><MetricVal icon={<Bookmark size={12} />} value={p.saves} color="#fbbf24" /></td>
                <td style={tdStyle}><MetricVal icon={<Share2 size={12} />} value={p.shares} color="#22d3ee" /></td>
                <td style={tdStyle}><MetricVal icon={<MessageCircle size={12} />} value={p.replies} color="#34d399" /></td>
                <td style={{ ...tdStyle, color: "var(--text-muted)", fontSize: 12 }}>{timeAgo(p.published_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Sub-components                                                             */
/* ────────────────────────────────────────────────────────────────────────── */

function PageHeader({ accountName, syncing, onSync, onRefreshAudience }: {
  accountName: string; syncing: boolean; onSync: () => void; onRefreshAudience?: () => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 32, flexWrap: "wrap", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 14,
          background: "rgba(225,48,108,0.1)", border: "1px solid rgba(225,48,108,0.2)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <IgIcon size={22} color="#e1306c" />
        </div>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, fontFamily: "'Space Grotesk', sans-serif", color: "var(--text-primary)", lineHeight: 1.1 }}>
            <span className="gradient-text">{accountName}</span>
          </h1>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>Instagram deep analytics</p>
        </div>
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        {onRefreshAudience && (
          <button className="btn-secondary" onClick={onRefreshAudience} disabled={syncing} style={{ display: "flex", alignItems: "center", gap: 8, opacity: syncing ? 0.7 : 1 }}>
            <Users size={14} /> {syncing ? "Refreshing..." : "Refresh Audience"}
          </button>
        )}
        <button className="btn-secondary" onClick={onSync} disabled={syncing} style={{ display: "flex", alignItems: "center", gap: 8, opacity: syncing ? 0.7 : 1 }}>
          <RefreshCw size={14} className={syncing ? "animate-spin" : ""} /> {syncing ? "Syncing..." : "Sync"}
        </button>
      </div>
    </div>
  );
}

function GenderBar({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div style={{ flex: 1 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
        <span style={{ color: "var(--text-secondary)" }}>{label}</span>
        <span style={{ color, fontWeight: 700 }}>{pct.toFixed(0)}%</span>
      </div>
      <div style={{ height: 8, background: "rgba(255,255,255,0.06)", borderRadius: 99, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 99 }} />
      </div>
    </div>
  );
}

function QualityRing({ pct }: { pct: number }) {
  const radius = 52;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (Math.min(pct, 100) / 100) * circ;
  const color = pct >= 8 ? "#34d399" : pct >= 4 ? "#fbbf24" : "#ef4444";
  return (
    <div style={{ position: "relative", width: 128, height: 128, flexShrink: 0 }}>
      <svg width={128} height={128} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={64} cy={64} r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={10} />
        <circle cx={64} cy={64} r={radius} fill="none" stroke={color} strokeWidth={10}
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.6s ease" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 28, fontWeight: 800, color }}>{pct.toFixed(1)}%</span>
        <span style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Quality</span>
      </div>
    </div>
  );
}

function MetricPill({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 11, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 5 }}>
        <span style={{ color }}>{icon}</span> {label}
      </span>
      <span style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>{formatNumber(value)}</span>
    </div>
  );
}

function MetricVal({ icon, value, color }: { icon: React.ReactNode; value?: number; color?: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, color: color || "var(--text-secondary)" }}>
      {icon}{value != null ? formatNumber(value) : "—"}
    </span>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: 13, color: "var(--text-muted)", padding: "16px 0", textAlign: "center" }}>{children}</p>;
}

/* ── shared inline styles (kept local to this page) ─────────────────────── */
const sectionTitle = { fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 16 } as const;
const cardStyle = { padding: "20px", borderRadius: 16 } as const;
const cardHeader = { display: "flex", alignItems: "center", gap: 10, marginBottom: 16 } as const;
const cardTitle = { fontSize: 14, fontWeight: 700, color: "var(--text-primary)" } as const;
const thStyle = { textAlign: "left", padding: "12px 10px", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)" } as const;
const tdStyle = { padding: "12px 10px", verticalAlign: "middle" } as const;
const emptyTd = { ...tdStyle, color: "var(--text-muted)", fontSize: 13, textAlign: "center", padding: "32px 10px" } as const;
const iconBadge = (bg: string, border: string, color: string) => ({
  width: 32, height: 32, borderRadius: 9, background: bg, border: `1px solid ${border}`,
  display: "flex", alignItems: "center", justifyContent: "center", color,
}) as const;
