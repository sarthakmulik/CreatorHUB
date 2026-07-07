"use client";
import { API_URL } from "@/lib/utils";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Scissors, Video, Loader2, CalendarPlus, CheckCircle2, XCircle, Sparkles } from "lucide-react";
import Link from "next/link";

export default function RepurposeDashboard() {
  const [loading, setLoading] = useState(true);
  const [videos, setVideos] = useState<any[]>([]);
  const [url, setUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const supabase = createClient();

  const loadData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    setUserId(session.user.id);
    try {
      const res = await fetch(`${API_URL}/api/repurpose/status?user_id=${session.user.id}`);
      if (res.ok) setVideos(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url || !userId) return;
    setSubmitting(true);
    
    try {
      await fetch(`${API_URL}/api/repurpose`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, youtube_url: url })
      });
      setUrl("");
      loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto min-h-screen relative">
      {/* Premium Background Mesh specific to this page */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gradient-to-r from-pink-500/20 to-orange-500/20 blur-[100px] pointer-events-none rounded-full" />
      
      <div className="relative z-10">
        <div className="mb-12 animate-fade-in-up">
          <h1 className="text-4xl font-extrabold text-white mb-3 font-['Space_Grotesk'] flex items-center gap-4 tracking-tight">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-500 to-orange-500 flex items-center justify-center text-white shadow-[0_0_30px_rgba(236,72,153,0.3)] border border-white/20">
              <Scissors size={28} className="animate-float" />
            </div>
            AI Repurposing Engine
          </h1>
          <p className="text-lg text-[var(--text-secondary)] max-w-2xl leading-relaxed">
            Turn your long-form YouTube videos into highly engaging 60-second vertical Shorts & Reels with one click.
          </p>
        </div>

        <div className="glass-bright p-10 rounded-[2rem] mb-16 relative overflow-hidden animate-fade-in-up delay-100 group">
          <div className="absolute inset-0 bg-gradient-to-br from-pink-500/5 to-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
          
          <h2 className="text-2xl font-bold text-white mb-6 font-['Space_Grotesk'] flex items-center gap-2">
            <Sparkles size={20} className="text-pink-400" /> Let's create something viral
          </h2>
          
          <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-4 relative z-10">
            <div className="relative flex-1 group/input">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-pink-500 to-orange-500 rounded-2xl blur opacity-30 group-focus-within/input:opacity-100 transition duration-500" />
              <div className="relative flex items-center bg-[#0d0d1f] rounded-2xl">
                <Video size={22} className="absolute left-5 text-[var(--text-muted)] group-focus-within/input:text-pink-400 transition-colors" />
                <input 
                  type="url"
                  required
                  placeholder="Paste YouTube Video URL (e.g. https://www.youtube.com/watch?v=...)"
                  className="w-full bg-transparent py-5 pl-14 pr-6 text-white placeholder-[var(--text-muted)] focus:outline-none text-lg rounded-2xl"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
              </div>
            </div>
            
            <button 
              type="submit" 
              disabled={submitting || !url}
              className="relative px-10 py-5 rounded-2xl font-bold text-white text-lg disabled:opacity-50 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_10px_30px_rgba(236,72,153,0.4)] active:translate-y-0 overflow-hidden flex items-center justify-center gap-3 min-w-[200px]"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-pink-600 to-orange-500" />
              <div className="absolute inset-0 bg-white/20 translate-y-full hover:translate-y-0 transition-transform duration-300" />
              <span className="relative z-10 flex items-center gap-2">
                {submitting ? <><Loader2 size={20} className="animate-spin" /> Processing</> : "Generate Short"}
              </span>
            </button>
          </form>
        </div>

        <div className="animate-fade-in-up delay-200">
          <h2 className="text-2xl font-bold text-white mb-8 font-['Space_Grotesk']">Your Content Library</h2>
          
          {loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3].map(i => (
                <div key={i} className="glass rounded-3xl overflow-hidden aspect-[9/16] relative skeleton border-none" />
              ))}
            </div>
          )}
          
          {!loading && videos.length === 0 && (
            <div className="glass p-16 rounded-[2rem] border border-[var(--border-subtle)] text-center relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-pink-500/5" />
              <div className="w-24 h-24 bg-[var(--bg-surface)] rounded-full mx-auto mb-6 flex items-center justify-center border border-[var(--border-subtle)] group-hover:scale-110 transition-transform duration-500 shadow-xl">
                <Scissors size={40} className="text-[var(--text-muted)] group-hover:text-pink-400 transition-colors" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2 font-['Space_Grotesk']">No shorts created yet</h3>
              <p className="text-[var(--text-secondary)]">Paste a YouTube link above to instantly generate your first viral clip.</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {videos.map((video, idx) => (
              <div 
                key={video.id} 
                className="glass rounded-3xl border border-[var(--border-subtle)] overflow-hidden flex flex-col hover:border-pink-500/30 transition-all duration-300 hover:shadow-[0_10px_40px_rgba(236,72,153,0.15)] group animate-fade-in-up"
                style={{ animationDelay: `${(idx % 4) * 100}ms` }}
              >
                <div className="aspect-[9/16] bg-[#080816] relative flex items-center justify-center overflow-hidden">
                  
                  {video.status === 'processing' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-transparent to-pink-900/20">
                      <div className="relative w-20 h-20 mb-6">
                        <div className="absolute inset-0 border-4 border-pink-500/20 rounded-full" />
                        <div className="absolute inset-0 border-4 border-pink-500 rounded-full border-t-transparent animate-spin" />
                        <Scissors size={24} className="absolute inset-0 m-auto text-pink-400 animate-pulse" />
                      </div>
                      <p className="text-lg font-bold text-white mb-1 font-['Space_Grotesk']">Analyzing...</p>
                      <p className="text-sm text-pink-400 font-medium tracking-wide">Finding viral hooks</p>
                    </div>
                  )}

                  {video.status === 'completed' && video.clipped_video_url && (
                    <video 
                      src={video.clipped_video_url} 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      controls
                      muted
                      loop
                    />
                  )}

                  {video.status === 'failed' && (
                    <div className="text-center text-red-400 bg-red-950/30 w-full h-full flex flex-col items-center justify-center">
                      <XCircle size={40} className="mx-auto mb-4 opacity-80" />
                      <p className="font-bold font-['Space_Grotesk']">Processing Failed</p>
                    </div>
                  )}

                  {/* Gradient Overlay for info section at bottom */}
                  <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />
                </div>
                
                <div className="p-5 flex flex-col flex-1 justify-between bg-[rgba(13,13,31,0.8)] backdrop-blur-md relative z-10 border-t border-[var(--border-subtle)] -mt-4 rounded-t-3xl pt-6">
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-3">
                      {video.status === 'completed' ? (
                        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-green-400 bg-green-400/10 px-2.5 py-1 rounded-full border border-green-400/20">
                          <CheckCircle2 size={12} /> Ready
                        </span>
                      ) : video.status === 'processing' ? (
                        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-pink-400 bg-pink-400/10 px-2.5 py-1 rounded-full border border-pink-400/20">
                          <Loader2 size={12} className="animate-spin" /> Processing
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-red-400 bg-red-400/10 px-2.5 py-1 rounded-full border border-red-400/20">
                          <XCircle size={12} /> Error
                        </span>
                      )}
                    </div>
                    <a href={video.original_video_url} target="_blank" className="text-xs text-[var(--text-muted)] hover:text-white transition-colors truncate block">
                      Source: {new URL(video.original_video_url).pathname.replace('/', '') || 'YouTube'}
                    </a>
                  </div>
                  
                  {video.status === 'completed' ? (
                    <Link 
                      href="/calendar"
                      className="w-full bg-[var(--bg-surface)] hover:bg-white text-white hover:text-black font-semibold py-3.5 rounded-xl text-center text-sm transition-all duration-300 flex items-center justify-center gap-2 border border-[var(--border-subtle)] hover:border-white shadow-lg"
                    >
                      <CalendarPlus size={18} /> Schedule Post
                    </Link>
                  ) : (
                    <div className="w-full h-[46px] rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-xs text-[var(--text-muted)] font-medium">
                      Actions pending...
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
