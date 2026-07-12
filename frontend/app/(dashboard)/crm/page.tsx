"use client";
import { API_URL } from "@/lib/utils";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { MessageSquareHeart, ShieldAlert, Sparkles, Filter, RefreshCw, Crown, MessageCircle, ArrowUpRight } from "lucide-react";

export default function CRMDashboard() {
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState<any[]>([]);
  const [superfans, setSuperfans] = useState<any[]>([]);
  const [filter, setFilter] = useState("all");
  const [userId, setUserId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [draftReplies, setDraftReplies] = useState<Record<string, string>>({});
  const [generatingDraft, setGeneratingDraft] = useState<string | null>(null);
  const supabase = createClient();

  const loadData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    setUserId(session.user.id);
    await fetchComments(session.user.id, filter);
    await fetchSuperfans(session.user.id);
  };

  useEffect(() => {
    loadData();
  }, []);

  const fetchComments = async (uid: string, cat: string) => {
    setLoading(true);
    try {
      const url = new URL(`${API_URL}/api/crm/comments`);
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
      const res = await fetch(`${API_URL}/api/crm/superfans?user_id=${uid}`);
      if (res.ok) setSuperfans(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  const handleFilter = (cat: string) => {
    setFilter(cat);
    if (userId) fetchComments(userId, cat);
  };

  const handleSync = async () => {
    setSyncing(true);
    // Find the first connected IG account to sync. In a real app we'd let user select.
    try {
      const statsRes = await fetch(`${API_URL}/api/dashboard/stats?user_id=${userId}`);
      if (statsRes.ok) {
        const stats = await statsRes.json();
        const ig = (stats.platforms || []).find((p: any) => p.platform === "instagram");
        if (ig) {
          await fetch(`${API_URL}/api/crm/comments/sync/${ig.connected_account_id}`, { method: 'POST' });
        }
      }
    } catch(e) {}
    
    setTimeout(() => {
      loadData();
      setSyncing(false);
    }, 2500);
  };

  const handleDraftReply = async (commentId: string, text: string) => {
    setGeneratingDraft(commentId);
    try {
      const res = await fetch(`${API_URL}/api/ai/draft-reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment_text: text })
      });
      if (res.ok) {
        const data = await res.json();
        setDraftReplies(prev => ({ ...prev, [commentId]: data.reply }));
      }
    } catch (err) {
      console.error(err);
    }
    setGeneratingDraft(null);
  };

  const getCategoryBorder = (category: string) => {
    switch (category) {
      case 'collab': return 'border-l-4 border-l-green-400';
      case 'question': return 'border-l-4 border-l-blue-400';
      case 'negative': return 'border-l-4 border-l-red-400';
      default: return 'border-l-4 border-l-purple-500';
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen relative">
      {/* Background glow */}
      <div className="absolute top-0 right-0 w-[600px] h-[400px] bg-brand-gradient blur-[120px] opacity-10 pointer-events-none rounded-full" />
      
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6 relative z-10 animate-fade-in-up">
        <div>
          <h1 className="text-4xl font-extrabold text-white mb-3 font-['Space_Grotesk'] tracking-tight flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white shadow-[0_0_20px_rgba(124,58,237,0.3)]">
              <MessageSquareHeart size={24} className="animate-float" />
            </div>
            Sentiment CRM
          </h1>
          <p className="text-lg text-[var(--text-secondary)]">AI automatically categorizes comments so you never miss a brand deal.</p>
        </div>
        <button 
          onClick={handleSync}
          disabled={syncing}
          className="group relative px-6 py-3 rounded-xl font-bold text-white transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-70 disabled:hover:scale-100 flex items-center gap-3 overflow-hidden"
        >
          <div className="absolute inset-0 bg-[rgba(255,255,255,0.05)] border border-[var(--border-subtle)] rounded-xl group-hover:border-purple-500/50 transition-colors" />
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          <RefreshCw size={18} className={`relative z-10 ${syncing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} /> 
          <span className="relative z-10">{syncing ? 'Syncing...' : 'Sync Latest'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 relative z-10">
        
        {/* Left Column - Comments */}
        <div className="lg:col-span-3">
          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-8 animate-fade-in-up delay-100">
            {[
              { id: 'all', label: 'All Comments', icon: Filter, color: 'text-purple-400', bgHover: 'hover:bg-purple-500/20' },
              { id: 'collab', label: 'Sponsorships & Collabs', icon: Sparkles, color: 'text-green-400', bgHover: 'hover:bg-green-500/20' },
              { id: 'question', label: 'Questions', icon: MessageCircle, color: 'text-blue-400', bgHover: 'hover:bg-blue-500/20' },
              { id: 'negative', label: 'Negative / Hate', icon: ShieldAlert, color: 'text-red-400', bgHover: 'hover:bg-red-500/20' },
            ].map(f => {
              const isActive = filter === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => handleFilter(f.id)}
                  className={`
                    flex items-center gap-2.5 px-5 py-3 rounded-2xl text-sm font-semibold transition-all duration-300 border backdrop-blur-md
                    ${isActive 
                      ? `bg-[rgba(255,255,255,0.1)] border-white/20 shadow-lg text-white` 
                      : `bg-[rgba(13,13,31,0.5)] border-[var(--border-subtle)] text-[var(--text-secondary)] ${f.bgHover} hover:text-white hover:border-white/10`
                    }
                  `}
                >
                  <f.icon size={16} className={isActive ? f.color : 'opacity-70'} /> 
                  {f.label}
                </button>
              );
            })}
          </div>

          <div className="space-y-5">
            {loading ? (
              // Skeletons
              [1,2,3].map(i => (
                <div key={i} className="h-32 glass rounded-2xl skeleton border-none" />
              ))
            ) : comments.length === 0 ? (
              // Empty State
              <div className="glass-bright p-16 rounded-3xl text-center border border-[var(--border-subtle)] relative overflow-hidden animate-fade-in-up">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-purple-500/5 pointer-events-none" />
                <MessageCircle size={48} className="mx-auto mb-4 text-[var(--border-bright)]" />
                <h3 className="text-xl font-bold text-white mb-2 font-['Space_Grotesk']">Inbox Zero</h3>
                <p className="text-[var(--text-secondary)] max-w-md mx-auto">No comments match this filter. Engage with your audience or try a different category!</p>
              </div>
            ) : (
              // Comments Feed
              comments.map((comment: any, idx: number) => (
                <div 
                  key={comment.id} 
                  className={`
                    glass p-6 rounded-2xl border border-[var(--border-subtle)] border-l-4 relative group 
                    hover:border-[var(--border-bright)] hover:shadow-2xl hover:shadow-purple-500/5 transition-all duration-300
                    hover:-translate-y-1 animate-fade-in-up ${getCategoryBorder(comment.category)}
                  `}
                  style={{ animationDelay: `${(idx % 5) * 100}ms` }}
                >
                  {/* Category Badges */}
                  {comment.category === 'collab' && (
                    <div className="absolute top-4 right-4 bg-green-500/10 text-green-400 border border-green-500/20 text-[10px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-[0_0_15px_rgba(74,222,128,0.1)]">
                      <Sparkles size={12} /> SPONSORSHIP
                    </div>
                  )}
                  {comment.category === 'question' && (
                    <div className="absolute top-4 right-4 bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5">
                      <MessageCircle size={12} /> QUESTION
                    </div>
                  )}
                  {comment.category === 'negative' && (
                    <div className="absolute top-4 right-4 bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5">
                      <ShieldAlert size={12} /> FLAGGED
                    </div>
                  )}
                  
                  <div className="flex gap-5">
                    {/* Avatar placeholder with gradient */}
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex-shrink-0 shadow-lg flex items-center justify-center font-bold text-lg text-white">
                      {comment.author_name[0].toUpperCase()}
                    </div>
                    
                    <div className="flex-1 pr-24">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-bold text-white text-[15px]">{comment.author_name}</span>
                        <span className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                          on <span className="font-medium text-[var(--text-secondary)] italic">"{comment.post_title}"</span>
                        </span>
                      </div>
                      
                      <p className="text-[var(--text-primary)] text-base mb-4 leading-relaxed bg-[rgba(255,255,255,0.02)] p-4 rounded-xl border border-[rgba(255,255,255,0.02)]">
                        {comment.text}
                      </p>
                      
                      <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-4">
                          <button 
                            onClick={() => handleDraftReply(comment.id, comment.text)}
                            disabled={generatingDraft === comment.id}
                            className="text-sm font-semibold text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-2 bg-purple-500/10 px-4 py-2 rounded-lg hover:bg-purple-500/20 disabled:opacity-50"
                          >
                            {generatingDraft === comment.id ? <RefreshCw size={16} className="animate-spin" /> : <MessageSquareHeart size={16} />} 
                            {generatingDraft === comment.id ? "Drafting..." : "Auto-Draft Reply"}
                          </button>
                          <button className="text-sm font-medium text-[var(--text-muted)] hover:text-white transition-colors flex items-center gap-1">
                            View on Platform <ArrowUpRight size={14} />
                          </button>
                        </div>
                        {draftReplies[comment.id] && (
                          <div className="bg-[rgba(168,85,247,0.1)] border border-purple-500/20 p-3 rounded-lg relative animate-fade-in-up">
                            <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest absolute -top-2 bg-[var(--bg-surface)] px-2">AI Draft</span>
                            <textarea 
                              className="w-full bg-transparent border-none text-sm text-[var(--text-primary)] outline-none resize-none mt-1"
                              value={draftReplies[comment.id]}
                              onChange={(e) => setDraftReplies(prev => ({...prev, [comment.id]: e.target.value}))}
                              rows={2}
                            />
                            <div className="flex justify-end mt-2">
                              <button className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold px-3 py-1.5 rounded-md transition-colors shadow-lg">
                                Publish Reply
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column - Superfans */}
        <div className="lg:col-span-1 animate-fade-in-up delay-200">
          <div className="glass-bright p-7 rounded-[2rem] border border-[var(--border-bright)] sticky top-28 shadow-2xl shadow-purple-900/20 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-b from-yellow-500/5 to-transparent pointer-events-none" />
            
            <div className="flex items-center justify-between mb-6 relative z-10">
              <h2 className="text-xl font-bold text-white font-['Space_Grotesk'] flex items-center gap-2">
                <Crown size={22} className="text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]" />
                Superfans
              </h2>
            </div>
            
            <p className="text-sm text-[var(--text-secondary)] mb-6 relative z-10">Users who consistently drive engagement across your content.</p>
            
            <div className="space-y-3 relative z-10">
              {superfans.length === 0 ? (
                <div className="p-4 text-center text-sm text-[var(--text-muted)] border border-dashed border-[var(--border-subtle)] rounded-xl">
                  Analyzing engagement...
                </div>
              ) : (
                superfans.map((fan, i) => {
                  const isTop3 = i < 3;
                  return (
                    <div 
                      key={i} 
                      className={`
                        flex items-center justify-between p-4 rounded-xl transition-all duration-300 hover:scale-[1.02] cursor-default
                        ${isTop3 
                          ? 'bg-gradient-to-r from-[rgba(250,204,21,0.1)] to-[rgba(13,13,31,0.8)] border border-yellow-500/20 shadow-[0_4px_15px_rgba(250,204,21,0.05)]' 
                          : 'bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.05)]'
                        }
                      `}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`
                          w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shadow-inner
                          ${i === 0 ? 'bg-gradient-to-br from-yellow-300 to-yellow-600 text-black shadow-[0_0_10px_rgba(250,204,21,0.4)]' : 
                            i === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-500 text-black' :
                            i === 2 ? 'bg-gradient-to-br from-amber-600 to-orange-800 text-white' :
                            'bg-[var(--bg-surface)] text-[var(--text-muted)]'
                          }
                        `}>
                          #{i + 1}
                        </div>
                        <span className={`font-semibold text-sm ${isTop3 ? 'text-white' : 'text-[var(--text-secondary)]'}`}>
                          {fan.author_name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MessageSquareHeart size={14} className={isTop3 ? 'text-yellow-500/70' : 'text-[var(--text-muted)]'} />
                        <span className={`text-xs font-bold ${isTop3 ? 'text-yellow-400' : 'text-[var(--text-secondary)]'}`}>
                          {fan.comment_count}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            
            <button className="w-full mt-6 bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] text-white text-sm font-semibold py-3 rounded-xl transition-colors border border-[rgba(255,255,255,0.05)]">
              View Analytics
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
