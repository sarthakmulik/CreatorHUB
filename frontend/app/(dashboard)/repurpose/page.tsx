"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Scissors, Video, Loader2, CalendarPlus, CheckCircle2, XCircle } from "lucide-react";
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
      const res = await fetch(`http://localhost:8000/api/repurpose/status?user_id=${session.user.id}`);
      if (res.ok) setVideos(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000); // Poll every 5s for status updates
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url || !userId) return;
    setSubmitting(true);
    
    try {
      await fetch("http://localhost:8000/api/repurpose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, youtube_url: url })
      });
      setUrl("");
      loadData(); // optimistic reload
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-white mb-2 font-['Space_Grotesk'] flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-orange-500 flex items-center justify-center text-white">
            <Scissors size={20} />
          </div>
          AI Repurposing Engine
        </h1>
        <p className="text-[var(--text-secondary)] max-w-2xl">
          Turn your long-form YouTube videos into highly engaging 60-second vertical Shorts & Reels with one click.
        </p>
      </div>

      <div className="glass p-8 rounded-2xl border border-[var(--border-subtle)] mb-10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-pink-500/10 rounded-full blur-3xl pointer-events-none" />
        <h2 className="text-xl font-bold text-white mb-4">Create New Short</h2>
        <form onSubmit={handleSubmit} className="flex gap-4">
          <div className="relative flex-1">
            <Video size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input 
              type="url"
              required
              placeholder="Paste YouTube Video URL (e.g. https://www.youtube.com/watch?v=...)"
              className="w-full bg-[rgba(0,0,0,0.2)] border border-[var(--border-subtle)] rounded-xl py-4 pl-12 pr-4 text-white placeholder-[var(--text-muted)] focus:outline-none focus:border-pink-500/50 transition-colors"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>
          <button 
            type="submit" 
            disabled={submitting || !url}
            className="bg-gradient-to-r from-pink-600 to-orange-500 text-white font-bold px-8 py-4 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
          >
            {submitting ? <><Loader2 size={18} className="animate-spin" /> Processing...</> : "Generate Short"}
          </button>
        </form>
      </div>

      <div>
        <h2 className="text-xl font-bold text-white mb-6">Your Repurposed Videos</h2>
        {loading && <div className="text-[var(--text-muted)]">Loading...</div>}
        
        {!loading && videos.length === 0 && (
          <div className="text-center py-12 border border-dashed border-[var(--border-subtle)] rounded-2xl text-[var(--text-muted)]">
            No videos repurposed yet. Paste a link above to get started!
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {videos.map(video => (
            <div key={video.id} className="glass rounded-2xl border border-[var(--border-subtle)] overflow-hidden flex flex-col">
              <div className="aspect-[9/16] bg-[rgba(0,0,0,0.3)] relative flex items-center justify-center">
                {video.status === 'processing' && (
                  <div className="text-center">
                    <Loader2 size={32} className="mx-auto text-pink-500 animate-spin mb-4" />
                    <p className="text-sm font-medium text-pink-400">AI is analyzing audio...</p>
                    <p className="text-xs text-[var(--text-muted)] mt-1">Finding viral hooks</p>
                  </div>
                )}
                {video.status === 'completed' && video.clipped_video_url && (
                  <video 
                    src={video.clipped_video_url} 
                    className="w-full h-full object-cover"
                    controls
                    muted
                  />
                )}
                {video.status === 'failed' && (
                  <div className="text-center text-red-400">
                    <XCircle size={32} className="mx-auto mb-4" />
                    <p className="text-sm font-medium">Processing failed</p>
                  </div>
                )}
              </div>
              
              <div className="p-4 flex flex-col flex-1 justify-between bg-[rgba(13,13,31,0.6)]">
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    {video.status === 'completed' ? <CheckCircle2 size={16} className="text-green-400" /> : <Loader2 size={16} className="text-pink-400 animate-spin" />}
                    <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                      {video.status}
                    </span>
                  </div>
                  <a href={video.original_video_url} target="_blank" className="text-sm text-blue-400 hover:underline truncate block">
                    {video.original_video_url}
                  </a>
                </div>
                
                {video.status === 'completed' && (
                  <Link 
                    href="/calendar"
                    className="w-full bg-white/10 hover:bg-white/20 text-white font-medium py-2 rounded-lg text-center text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    <CalendarPlus size={16} /> Schedule Post
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
