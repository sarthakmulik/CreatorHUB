"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { TrendingUp, DollarSign, Users, Eye, Mail } from "lucide-react";

export default function PublicMediaKit() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch(`http://localhost:8000/api/media-kit/${id}`);
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
    if (id) {
      loadData();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#05050a] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[#05050a] flex items-center justify-center text-white">
        Media Kit not found.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#05050a] text-white font-sans selection:bg-purple-500/30">
      <div className="fixed inset-0 bg-[url('/mesh-bg.png')] bg-cover bg-center opacity-30 pointer-events-none" />
      
      <main className="relative z-10 max-w-5xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="w-24 h-24 mx-auto bg-gradient-to-br from-purple-600 to-blue-600 rounded-full mb-6 p-[2px]">
            <div className="w-full h-full bg-[#0d0d1f] rounded-full flex items-center justify-center overflow-hidden">
              {data.creator.avatar_url ? (
                <img src={data.creator.avatar_url} alt="Creator" className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl font-bold">{data.creator.name[0]}</span>
              )}
            </div>
          </div>
          <h1 className="text-5xl font-extrabold mb-4 font-['Space_Grotesk'] tracking-tight">
            {data.creator.name}
          </h1>
          <p className="text-xl text-[var(--text-secondary)] max-w-2xl mx-auto">
            Content creator pushing the boundaries of digital storytelling. Partner with me to reach a highly engaged, global audience.
          </p>
          <div className="mt-8">
            <a href={`mailto:collab@example.com`} className="inline-flex items-center gap-2 bg-white text-black px-6 py-3 rounded-full font-bold hover:bg-gray-200 transition-colors">
              <Mail size={18} /> Get in Touch
            </a>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <div className="bg-[rgba(13,13,31,0.6)] backdrop-blur-xl border border-[rgba(255,255,255,0.1)] p-8 rounded-3xl text-center">
            <Users className="mx-auto mb-4 text-blue-400" size={32} />
            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">Total Reach</h3>
            <p className="text-4xl font-extrabold">{data.stats.total_followers.toLocaleString()}</p>
          </div>
          
          <div className="bg-[rgba(13,13,31,0.6)] backdrop-blur-xl border border-[rgba(255,255,255,0.1)] p-8 rounded-3xl text-center">
            <Eye className="mx-auto mb-4 text-purple-400" size={32} />
            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">30-Day Views</h3>
            <p className="text-4xl font-extrabold">{data.stats.total_30_day_views.toLocaleString()}</p>
          </div>

          <div className="bg-gradient-to-br from-purple-900/40 to-blue-900/40 backdrop-blur-xl border border-purple-500/30 p-8 rounded-3xl text-center">
            <DollarSign className="mx-auto mb-4 text-green-400" size={32} />
            <h3 className="text-sm font-bold uppercase tracking-wider text-purple-200 mb-2">Starting Rate</h3>
            <p className="text-4xl font-extrabold text-white">${data.stats.sponsorship_value.toLocaleString()}</p>
          </div>
        </div>

        {/* Platforms */}
        <div className="bg-[rgba(13,13,31,0.6)] backdrop-blur-xl border border-[rgba(255,255,255,0.1)] p-8 rounded-3xl">
          <h2 className="text-2xl font-bold mb-8 text-center font-['Space_Grotesk']">Audience Breakdown</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.platforms.map((p: any, i: number) => (
              <div key={i} className="bg-[rgba(0,0,0,0.2)] border border-[rgba(255,255,255,0.05)] p-6 rounded-2xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-[var(--surface-raised)] flex items-center justify-center capitalize font-bold">
                    {p.platform[0]}
                  </div>
                  <div>
                    <h4 className="font-bold capitalize">{p.platform}</h4>
                    <p className="text-xs text-[var(--text-muted)]">@{p.account_name}</p>
                  </div>
                </div>
                <div>
                  <p className="text-2xl font-bold mb-1">{p.followers.toLocaleString()}</p>
                  <p className="text-sm text-[var(--text-secondary)]">Followers</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
