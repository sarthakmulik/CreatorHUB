"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  CheckCircle, Clock, Trash2, Plus, Shield, Loader2
} from "lucide-react";
import Image from "next/image";
import { IS_MOCK } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/Toast";

// SVG brand icons
const YTIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="#ff4444">
    <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/>
  </svg>
);

const IGIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="#e1306c">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
  </svg>
);

const XIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="#1d9bf0">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.743l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

const FBIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="#1877f2">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

const LIIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="#0a66c2">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
);

const TTIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="#94a3b8">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.85a8.2 8.2 0 004.79 1.53V6.93a4.85 4.85 0 01-1.02-.24z"/>
  </svg>
);

interface Platform {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
  description: string;
  connected: boolean;
  comingSoon: boolean;
  accountName?: string;
  accountAvatar?: string;
  subscribers?: number;
}

const BASE_PLATFORMS: Platform[] = [
  {
    id: "youtube",
    name: "YouTube",
    icon: <YTIcon />,
    color: "#ff4444",
    bgColor: "rgba(255,68,68,0.08)",
    borderColor: "rgba(255,68,68,0.2)",
    description: "Connect your YouTube channel to track subscribers, views, and video performance.",
    connected: false,
    comingSoon: false,
  },
  {
    id: "instagram",
    name: "Instagram",
    icon: <IGIcon />,
    color: "#e1306c",
    bgColor: "rgba(225,48,108,0.06)",
    borderColor: "rgba(225,48,108,0.18)",
    description: "Connect your Instagram Business account to track followers, reach, and post engagement.",
    connected: false,
    comingSoon: false,
  },
  {
    id: "tiktok",
    name: "TikTok",
    icon: <TTIcon />,
    color: "#94a3b8",
    bgColor: "rgba(148,163,184,0.06)",
    borderColor: "rgba(148,163,184,0.15)",
    description: "Connect your TikTok creator account to track video views, followers, and engagement.",
    connected: false,
    comingSoon: false,
  },
  {
    id: "twitter",
    name: "Twitter / X",
    icon: <XIcon />,
    color: "#1d9bf0",
    bgColor: "rgba(29,155,240,0.06)",
    borderColor: "rgba(29,155,240,0.18)",
    description: "Track your tweet performance, follower growth, and impressions.",
    connected: false,
    comingSoon: true,
  },
  {
    id: "facebook",
    name: "Facebook",
    icon: <FBIcon />,
    color: "#1877f2",
    bgColor: "rgba(24,119,242,0.06)",
    borderColor: "rgba(24,119,242,0.18)",
    description: "Connect your Facebook Page to track reach, engagement, and follower growth.",
    connected: false,
    comingSoon: true,
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    icon: <LIIcon />,
    color: "#0a66c2",
    bgColor: "rgba(10,102,194,0.06)",
    borderColor: "rgba(10,102,194,0.18)",
    description: "Track your LinkedIn post performance, impressions, and follower growth.",
    connected: false,
    comingSoon: true,
  },
];

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function SettingsContent() {
  const [platforms, setPlatforms] = useState<Platform[]>(BASE_PLATFORMS);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionUser, setSessionUser] = useState<any>(null);
  const [displayName, setDisplayName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [disconnectingPlatform, setDisconnectingPlatform] = useState<Platform | null>(null);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const supabase = createClient();
  const { success, error: toastError } = useToast();
  const searchParams = useSearchParams();

  const fetchConnections = async () => {
    if (IS_MOCK) {
      setLoading(false);
      return;
    }
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setSessionUser(user);
      setDisplayName(user.user_metadata?.display_name || "Creator");

      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${API_URL}/api/dashboard/stats?user_id=${user.id}`);
      if (res.ok) {
        const stats = await res.json();
        if (stats.platforms && stats.platforms.length > 0) {
          const connectedPlatforms = stats.platforms.filter((p: any) => p.connected_account_id !== "mock");
          
          setPlatforms(prev => prev.map(p => {
            const connected = connectedPlatforms.find((cp: any) => cp.platform === p.id);
            if (connected) {
              return {
                ...p,
                connected: true,
                accountName: connected.account_name,
                accountAvatar: connected.account_avatar,
                subscribers: connected.subscribers,
              };
            }
            return p;
          }));
        }
      }
    } catch (err) {
      console.error("Failed to fetch connections", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConnections();
  }, []);

  useEffect(() => {
    const errorParam = searchParams.get("error");
    const connectedParam = searchParams.get("connected");
    if (errorParam) {
      toastError(`Connection failed: ${errorParam}`);
      window.history.replaceState({}, '', '/settings');
    } else if (connectedParam) {
      success(`Successfully connected ${connectedParam}!`);
      window.history.replaceState({}, '', '/settings');
    }
  }, [searchParams, success, toastError]);

  const handleConnect = async (platformId: string) => {
    if (platformId === "instagram") {
      const confirmed = window.confirm("To connect Instagram, you MUST have an Instagram Business or Creator account that is linked to a Facebook Page. Do you want to proceed?");
      if (!confirmed) return;
    }
    setConnecting(platformId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";
      const frontendUrl = encodeURIComponent(window.location.origin);
      const res = await fetch(`${API_URL}/api/${platformId}/auth-url?user_id=${user.id}&frontend_url=${frontendUrl}`);
      if (res.ok) {
        const data = await res.json();
        window.location.href = data.auth_url;
      } else {
        toastError(`Failed to connect ${platformId}.`);
        setConnecting(null);
      }
    } catch (err) {
      toastError("Failed to initiate connection");
      setConnecting(null);
    }
  };

  const handleDisconnectConfirm = async () => {
    if (!disconnectingPlatform) return;
    setIsDisconnecting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toastError("User not found.");
        return;
      }
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const res = await fetch(`${API_URL}/api/dashboard/disconnect?platform=${disconnectingPlatform.id}&user_id=${user.id}`, {
        method: 'DELETE',
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      if (res.ok) {
        const data = await res.json().catch(() => ({ success: true }));
        if (data.success === false) {
           toastError(data.message || data.error || "Failed to disconnect.");
        } else {
          setPlatforms(prev => prev.map(p => 
            p.id === disconnectingPlatform.id 
              ? { ...p, connected: false, accountName: undefined, accountAvatar: undefined, subscribers: undefined } 
              : p
          ));
          success(`${disconnectingPlatform.name} disconnected.`);
        }
      } else {
        toastError("Failed to disconnect.");
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        toastError("Connection timed out. Please try again.");
      } else {
        toastError("An error occurred.");
      }
    } finally {
      setIsDisconnecting(false);
      setDisconnectingPlatform(null);
    }
  };

  const handleUpdateProfile = async () => {
    if (!displayName.trim()) return;
    setSavingProfile(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { display_name: displayName.trim() }
      });
      if (error) throw error;
      success("Profile updated!");
    } catch (err) {
      toastError("Failed to update profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <Loader2 className="animate-spin" size={32} color="#7c3aed" />
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, fontFamily: "'Space Grotesk', sans-serif", color: "var(--text-primary)", marginBottom: 6 }}>Settings</h1>
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Manage your connected social media accounts.</p>
      </div>

      <div className="glass animate-fade-in-up" style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 20px", marginBottom: 28, border: "1px solid rgba(52,211,153,0.2)", background: "rgba(52,211,153,0.04)" }}>
        <Shield size={18} color="#34d399" />
        <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
          All OAuth tokens are <strong style={{ color: "#34d399" }}>AES-256 encrypted</strong>. CreatorHub only requests read-only scopes.
        </p>
      </div>

      <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 16 }}>Connected Accounts</h2>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {platforms.map((platform, i) => (
          <div key={platform.id} className="glass animate-fade-in-up" style={{ padding: "20px 24px", border: `1px solid ${platform.connected ? platform.borderColor : "var(--border-subtle)"}`, background: platform.connected ? platform.bgColor : "transparent", animationDelay: `${i * 60}ms`, opacity: 0, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: platform.bgColor, border: `1px solid ${platform.borderColor}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {platform.icon}
            </div>

            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>{platform.name}</span>
                {platform.comingSoon && <span className="badge badge-green" style={{ fontSize: 10 }}>Coming Soon</span>}
              </div>
              {platform.connected && platform.accountName ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <img src={platform.accountAvatar || "https://ui-avatars.com/api/?name=User&background=random"} alt={platform.accountName} width={20} height={20} style={{ borderRadius: "50%" }} />
                  <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{platform.accountName} · {formatNumber(platform.subscribers!)} subscribers</span>
                </div>
              ) : (
                <p style={{ fontSize: 13, color: "var(--text-muted)", maxWidth: 420 }}>{platform.description}</p>
              )}
            </div>

            <div style={{ flexShrink: 0 }}>
              {platform.connected ? (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginRight: 4 }}>
                    <CheckCircle size={15} color="#34d399" />
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#34d399" }}>Connected</span>
                  </div>
                  <button className="btn-danger" onClick={() => setDisconnectingPlatform(platform)}>
                    <Trash2 size={13} />
                    Disconnect
                  </button>
                </div>
              ) : platform.comingSoon ? (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Clock size={15} color="var(--text-muted)" />
                  <span style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 500 }}>
                    Coming Soon
                  </span>
                </div>
              ) : (
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    className="btn-primary"
                    onClick={() => handleConnect(platform.id)}
                    disabled={connecting !== null}
                    style={{ opacity: connecting === platform.id ? 0.7 : 1 }}
                  >
                    {connecting === platform.id ? (
                      <>Connecting...</>
                    ) : (
                      <>
                        <Plus size={15} />
                        Connect {platform.name}
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Profile section */}
      <div style={{ marginTop: 40 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 16 }}>
          Profile
        </h2>
        <div className="glass" style={{ padding: "24px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 440 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Display Name
              </label>
              <input 
                className="input-field" 
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                disabled={savingProfile}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Email Address
              </label>
              <input 
                className="input-field" 
                defaultValue={sessionUser?.email || ""} 
                type="email" 
                disabled 
              />
            </div>
            <button 
              className="btn-primary" 
              style={{ alignSelf: "flex-start", opacity: savingProfile ? 0.7 : 1 }}
              onClick={handleUpdateProfile}
              disabled={savingProfile}
            >
              {savingProfile ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>

      {/* Disconnect Confirmation Modal */}
      {disconnectingPlatform && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999
        }}>
          <div className="glass animate-fade-in-up" style={{
            width: 400, padding: 32, borderRadius: 24, textAlign: "center",
            border: "1px solid rgba(255,68,68,0.2)",
            boxShadow: "0 24px 48px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.05)"
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: "50%", background: "rgba(239, 68, 68, 0.1)",
              display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px auto"
            }}>
              <Trash2 size={32} color="#ef4444" />
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", marginBottom: 12 }}>
              Disconnect {disconnectingPlatform.name}?
            </h3>
            <p style={{ color: "var(--text-secondary)", fontSize: 15, marginBottom: 32, lineHeight: 1.5 }}>
              Are you sure you want to disconnect this account? Any posts scheduled for this platform will fail to publish.
            </p>
            <div style={{ display: "flex", gap: 16 }}>
              <button
                className="btn-secondary"
                style={{ flex: 1, padding: "12px 0" }}
                onClick={() => setDisconnectingPlatform(null)}
                disabled={isDisconnecting}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                style={{ flex: 1, padding: "12px 0", background: "#ef4444", borderColor: "#ef4444" }}
                onClick={handleDisconnectConfirm}
                disabled={isDisconnecting}
              >
                {isDisconnecting ? <Loader2 size={18} className="animate-spin mx-auto" /> : "Disconnect"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <Loader2 className="animate-spin" size={32} color="#7c3aed" />
      </div>
    }>
      <SettingsContent />
    </Suspense>
  );
}
