"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Copy, ExternalLink, TrendingUp, DollarSign, Users, Eye } from "lucide-react";
import Link from "next/link";

export default function MediaKitDashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function loadData() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      setUserId(session.user.id);

      try {
        const res = await fetch(`http://localhost:8000/api/media-kit/${session.user.id}`);
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (err) {
        console.error("Failed to load media kit", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [supabase.auth]);

  const copyLink = () => {
    if (userId) {
      navigator.clipboard.writeText(`${window.location.origin}/kit/${userId}`);
      alert("Link copied to clipboard!");
    }
  };

  if (loading) {
    return <div className="p-8 text-white">Loading your Media Kit...</div>;
  }

  if (!data) {
    return <div className="p-8 text-white">No data available. Please connect some accounts first.</div>;
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 font-['Space_Grotesk']">Your Dynamic Media Kit</h1>
          <p className="text-[var(--text-secondary)]">Manage your live media kit for brand sponsorships.</p>
        </div>
        <div className="flex gap-4">
          <Link href={`/kit/${userId}`} target="_blank" className="btn-secondary flex items-center gap-2 px-4 py-2 rounded-lg bg-[rgba(255,255,255,0.05)] text-white hover:bg-[rgba(255,255,255,0.1)] transition-colors border border-[var(--border-subtle)]">
            <ExternalLink size={16} /> Preview
          </Link>
          <button onClick={copyLink} className="btn-primary flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--primary)] text-white hover:opacity-90 transition-opacity">
            <Copy size={16} /> Copy Link
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="glass p-6 rounded-2xl border border-[var(--border-subtle)]">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400">
              <Users size={20} />
            </div>
            <h3 className="text-[var(--text-secondary)] font-medium">Total Reach</h3>
          </div>
          <p className="text-3xl font-bold text-white">{data.stats.total_followers.toLocaleString()}</p>
        </div>

        <div className="glass p-6 rounded-2xl border border-[var(--border-subtle)]">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400">
              <Eye size={20} />
            </div>
            <h3 className="text-[var(--text-secondary)] font-medium">30-Day Views</h3>
          </div>
          <p className="text-3xl font-bold text-white">{data.stats.total_30_day_views.toLocaleString()}</p>
        </div>

        <div className="glass p-6 rounded-2xl border border-purple-500/30 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent pointer-events-none" />
          <div className="flex items-center gap-3 mb-4 relative z-10">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center text-green-400">
              <DollarSign size={20} />
            </div>
            <h3 className="text-[var(--text-secondary)] font-medium">Est. Post Value</h3>
          </div>
          <p className="text-3xl font-bold text-white relative z-10">${data.stats.sponsorship_value.toLocaleString()}</p>
          <p className="text-xs text-[var(--text-muted)] mt-2 relative z-10">Based on ${data.creator.niche_cpm} CPM</p>
        </div>
      </div>
      
      <div className="glass p-8 rounded-2xl border border-[var(--border-subtle)]">
        <h2 className="text-xl font-bold text-white mb-6">Connected Platforms</h2>
        <div className="space-y-4">
          {data.platforms.map((p: any, i: number) => (
            <div key={i} className="flex justify-between items-center p-4 bg-[rgba(255,255,255,0.03)] rounded-xl border border-[var(--border-subtle)]">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-[var(--surface-raised)] flex items-center justify-center capitalize text-sm font-bold text-white">
                  {p.platform[0]}
                </div>
                <div>
                  <p className="text-white font-medium">{p.account_name}</p>
                  <p className="text-[var(--text-muted)] text-sm capitalize">{p.platform}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-white font-bold">{p.followers.toLocaleString()} <span className="text-xs font-normal text-[var(--text-muted)]">followers</span></p>
                <p className="text-sm text-[var(--text-secondary)]">{p.views_30_days.toLocaleString()} <span className="text-xs font-normal text-[var(--text-muted)]">views</span></p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
