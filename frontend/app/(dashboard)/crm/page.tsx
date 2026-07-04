"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { MessageSquareHeart, ShieldAlert, Sparkles, Filter, RefreshCw } from "lucide-react";

export default function CRMDashboard() {
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState<any[]>([]);
  const [superfans, setSuperfans] = useState<any[]>([]);
  const [filter, setFilter] = useState("all");
  const [userId, setUserId] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function loadData() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      setUserId(session.user.id);
      fetchComments(session.user.id, "all");
      fetchSuperfans(session.user.id);
    }
    loadData();
  }, []);

  const fetchComments = async (uid: string, cat: string) => {
    setLoading(true);
    try {
      const url = new URL("http://localhost:8000/api/crm/comments");
      url.searchParams.append("user_id", uid);
      if (cat !== "all") url.searchParams.append("category", cat);
      
      const res = await fetch(url.toString());
      if (res.ok) setComments(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSuperfans = async (uid: string) => {
    try {
      const res = await fetch(`http://localhost:8000/api/crm/superfans?user_id=${uid}`);
      if (res.ok) setSuperfans(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  const handleFilter = (cat: string) => {
    setFilter(cat);
    if (userId) fetchComments(userId, cat);
  };

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 font-['Space_Grotesk']">Sentiment CRM</h1>
          <p className="text-[var(--text-secondary)]">AI-categorized comments so you never miss a collab or question.</p>
        </div>
        <button className="btn-secondary flex items-center gap-2 px-4 py-2 rounded-lg bg-[rgba(255,255,255,0.05)] text-white border border-[var(--border-subtle)] hover:bg-[rgba(255,255,255,0.1)] transition-colors">
          <RefreshCw size={16} /> Sync Comments
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column - Comments */}
        <div className="lg:col-span-3">
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {[
              { id: 'all', label: 'All Comments', icon: Filter },
              { id: 'collab', label: 'Sponsorships & Collabs', icon: Sparkles },
              { id: 'question', label: 'Questions', icon: MessageSquareHeart },
              { id: 'negative', label: 'Negative / Hate', icon: ShieldAlert },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => handleFilter(f.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                  filter === f.id 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-[rgba(255,255,255,0.05)] text-[var(--text-secondary)] hover:bg-[rgba(255,255,255,0.1)]'
                }`}
              >
                <f.icon size={14} /> {f.label}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {loading ? (
              <div className="text-white p-4">Loading comments...</div>
            ) : comments.length === 0 ? (
              <div className="glass p-8 rounded-2xl text-center text-[var(--text-muted)] border border-[var(--border-subtle)]">
                No comments found for this category.
              </div>
            ) : (
              comments.map((comment: any) => (
                <div key={comment.id} className="glass p-6 rounded-2xl border border-[var(--border-subtle)] relative overflow-hidden group hover:border-purple-500/50 transition-colors">
                  {comment.category === 'collab' && (
                    <div className="absolute top-0 right-0 bg-green-500/20 text-green-400 text-xs font-bold px-3 py-1 rounded-bl-lg">
                      POSSIBLE COLLAB
                    </div>
                  )}
                  {comment.category === 'question' && (
                    <div className="absolute top-0 right-0 bg-blue-500/20 text-blue-400 text-xs font-bold px-3 py-1 rounded-bl-lg">
                      QUESTION
                    </div>
                  )}
                  
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex-shrink-0" />
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-white">{comment.author_name}</span>
                        <span className="text-xs text-[var(--text-muted)]">on {comment.post_title}</span>
                      </div>
                      <p className="text-[var(--text-primary)] text-sm mb-3">"{comment.text}"</p>
                      
                      <button className="text-xs text-purple-400 hover:text-purple-300 font-medium">
                        Auto-Draft Reply
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column - Superfans */}
        <div className="lg:col-span-1">
          <div className="glass p-6 rounded-2xl border border-[var(--border-subtle)] sticky top-24">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Sparkles size={18} className="text-yellow-400" />
              Your Superfans
            </h2>
            <p className="text-xs text-[var(--text-muted)] mb-4">Users who interact with your content the most.</p>
            
            <div className="space-y-4">
              {superfans.length === 0 ? (
                <p className="text-sm text-[var(--text-secondary)]">No superfans identified yet.</p>
              ) : (
                superfans.map((fan, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-[rgba(255,255,255,0.02)] rounded-xl border border-[rgba(255,255,255,0.05)]">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-yellow-500/20 text-yellow-500 flex items-center justify-center font-bold text-xs">
                        #{i + 1}
                      </div>
                      <span className="font-bold text-sm text-white">{fan.author_name}</span>
                    </div>
                    <span className="text-xs font-bold text-[var(--text-secondary)] bg-[rgba(255,255,255,0.1)] px-2 py-1 rounded-md">
                      {fan.comment_count}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
