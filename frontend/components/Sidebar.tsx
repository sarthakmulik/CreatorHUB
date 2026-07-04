"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  CalendarDays,
  Sparkles,
  Settings,
  ChevronRight,
  TrendingUp,
  LogOut,
  CreditCard,
  Briefcase,
  MessageSquareHeart,
  Scissors,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/calendar",  label: "Calendar",  icon: CalendarDays },
  { href: "/insights",  label: "Insights",  icon: Sparkles },
  { href: "/media-kit", label: "Media Kit", icon: Briefcase },
  { href: "/crm",       label: "CRM",       icon: MessageSquareHeart },
  { href: "/repurpose", label: "Repurpose", icon: Scissors },
  { href: "/pricing",   label: "Upgrade",   icon: CreditCard },
  { href: "/settings",  label: "Settings",  icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [sessionUser, setSessionUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setSessionUser(user);
      setLoading(false);
    });
  }, [supabase.auth]);

  const handleSignOut = async () => {
    setSigningOut(true);
    await supabase.auth.signOut();
    router.push("/login");
  };

  const displayName = sessionUser?.user_metadata?.display_name || "Creator";
  const displayEmail = sessionUser?.email || "Loading...";

  return (
    <aside
      style={{
        width: 240,
        minHeight: "100vh",
        background: "rgba(13,13,31,0.85)",
        backdropFilter: "blur(24px)",
        borderRight: "1px solid rgba(120,80,255,0.15)",
        display: "flex",
        flexDirection: "column",
        padding: "24px 16px",
        position: "fixed",
        top: 0,
        left: 0,
        bottom: 0,
        zIndex: 50,
      }}
    >
      {/* Logo */}
      <div style={{ marginBottom: 32 }}>
        <Link
          href="/dashboard"
          style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 20px rgba(124,58,237,0.4)",
            }}
          >
            <TrendingUp size={18} color="#fff" />
          </div>
          <span
            style={{
              fontSize: 18,
              fontWeight: 700,
              fontFamily: "'Space Grotesk', sans-serif",
            }}
            className="gradient-text"
          >
            CreatorHub
          </span>
        </Link>
      </div>

      {/* Nav items */}
      <nav style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
        <p
          style={{
            fontSize: 10,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            color: "var(--text-muted)",
            padding: "0 8px",
            marginBottom: 8,
          }}
        >
          Menu
        </p>
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={`sidebar-link ${active ? "active" : ""}`}
            >
              <Icon size={18} />
              <span style={{ flex: 1 }}>{label}</span>
              {active && <ChevronRight size={14} style={{ opacity: 0.6 }} />}
            </Link>
          );
        })}

        {/* User Card */}
        <div style={{ marginTop: "auto", position: "relative" }}>
          <div
            className="hover-bg"
            style={{
              padding: "12px",
              borderRadius: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              cursor: "default",
              transition: "all 0.2s",
              border: "1px solid var(--border-subtle)",
              background: "rgba(255, 255, 255, 0.02)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #7c3aed 0%, #3b82f6 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontWeight: "bold",
                  fontSize: 14,
                  flexShrink: 0
                }}
              >
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div style={{ minWidth: 0, overflow: "hidden", flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {displayName}
                </p>
                {loading ? (
                  <div style={{ width: 80, height: 12, borderRadius: 4, marginTop: 2 }} className="skeleton" />
                ) : (
                  <p style={{ fontSize: 11, color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {displayEmail}
                  </p>
                )}
              </div>
            </div>
            
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              title="Sign Out"
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: 6,
                borderRadius: 8,
                color: "var(--text-muted)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              className="hover-bg"
            >
              {signingOut ? (
                 <div className="spinner" style={{ width: 14, height: 14, border: "2px solid rgba(239, 68, 68, 0.3)", borderTopColor: "#ef4444", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
              ) : (
                <LogOut size={16} />
              )}
            </button>
          </div>
        </div>
      </nav>
    </aside>
  );
}
