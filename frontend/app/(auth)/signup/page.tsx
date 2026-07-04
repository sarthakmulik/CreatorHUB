"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, TrendingUp, Mail, Lock, User, Globe, CheckCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const PERKS = [
  "Connect YouTube, Instagram & TikTok",
  "Unified analytics dashboard",
  "AI-powered growth insights",
  "Content scheduling calendar",
];

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [cooldown, setCooldown] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cooldown > 0) {
      setError(`Too many attempts. Please try again in ${cooldown} seconds.`);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: name
          }
        }
      });
      
      if (signUpError) {
        throw signUpError;
      }
      
      if (data.user) {
        window.location.href = "/dashboard";
      }
    } catch (err: any) {
      console.error("Signup error:", err);
      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);
      setError(err.message || "Failed to sign up");
      
      if (newAttempts >= 3) {
        setCooldown(30);
        setError("Too many failed attempts. Please wait 30 seconds.");
        let timeLeft = 30;
        const timer = setInterval(() => {
          timeLeft -= 1;
          setCooldown(timeLeft);
          if (timeLeft <= 0) {
            clearInterval(timer);
            setFailedAttempts(0);
            setError(null);
          }
        }, 1000);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="bg-mesh"
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "stretch",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Left pane — branding */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "60px 56px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Gradient bg */}
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 90% 80% at 30% 50%, rgba(124,58,237,0.2) 0%, transparent 70%)", pointerEvents: "none" }} />

        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 60 }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 6px 24px rgba(124,58,237,0.4)" }}>
            <TrendingUp size={22} color="#fff" />
          </div>
          <span style={{ fontSize: 24, fontWeight: 800, fontFamily: "'Space Grotesk', sans-serif" }} className="gradient-text">
            CreatorHub
          </span>
        </div>

        <h2 style={{ fontSize: 36, fontWeight: 900, color: "var(--text-primary)", lineHeight: 1.15, marginBottom: 16, fontFamily: "'Space Grotesk', sans-serif" }}>
          Your entire creator<br />
          <span className="gradient-text">empire in one place</span>
        </h2>
        <p style={{ fontSize: 15, color: "var(--text-secondary)", marginBottom: 40, lineHeight: 1.7, maxWidth: 380 }}>
          Connect all your social platforms, track growth, and get AI-powered insights — so you can focus on creating.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {PERKS.map(perk => (
            <div key={perk} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 22, height: 22, borderRadius: 6, background: "rgba(124,58,237,0.2)", border: "1px solid rgba(124,58,237,0.35)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <CheckCircle size={13} color="#a78bfa" />
              </div>
              <span style={{ fontSize: 14, color: "var(--text-secondary)" }}>{perk}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right pane — form */}
      <div
        style={{
          width: 480,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 48px",
          borderLeft: "1px solid var(--border-subtle)",
          background: "rgba(13,13,31,0.6)",
          backdropFilter: "blur(24px)",
        }}
      >
        <div style={{ width: "100%", maxWidth: 380 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--text-primary)", marginBottom: 6, fontFamily: "'Space Grotesk', sans-serif" }}>
            Create your account
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 28 }}>Free forever · No credit card required</p>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 13 }}>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Name
              </label>
              <div style={{ position: "relative" }}>
                <User size={14} color="var(--text-muted)" style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
                <input 
                  className="input-field" 
                  type="text" 
                  placeholder="Your creator name" 
                  style={{ paddingLeft: 38 }} 
                  required 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Email
              </label>
              <div style={{ position: "relative" }}>
                <Mail size={14} color="var(--text-muted)" style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
                <input 
                  className="input-field" 
                  type="email" 
                  placeholder="you@example.com" 
                  style={{ paddingLeft: 38 }} 
                  required 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Password
              </label>
              <div style={{ position: "relative" }}>
                <Lock size={14} color="var(--text-muted)" style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
                <input 
                  className="input-field" 
                  type={showPw ? "text" : "password"} 
                  placeholder="Min. 8 characters" 
                  style={{ paddingLeft: 38, paddingRight: 42 }} 
                  required 
                  minLength={8} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button type="button" onClick={() => setShowPw(v => !v)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}>
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error && (
              <p style={{ fontSize: 13, color: "#ef4444", marginBottom: 4 }}>
                {error}
              </p>
            )}

            <p style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.5 }}>
              By signing up you agree to our{" "}
              <a href="#" style={{ color: "#a78bfa", textDecoration: "none" }}>Terms</a> and{" "}
              <a href="#" style={{ color: "#a78bfa", textDecoration: "none" }}>Privacy Policy</a>.
            </p>

            <button type="submit" className="btn-primary" disabled={loading || cooldown > 0} style={{ padding: "13px 20px", opacity: (loading || cooldown > 0) ? 0.8 : 1, marginTop: 4, cursor: (cooldown > 0) ? "not-allowed" : "pointer" }}>
              {loading ? "Creating account..." : cooldown > 0 ? `Wait ${cooldown}s` : "Create Account →"}
            </button>
          </form>

          <p style={{ textAlign: "center", fontSize: 13, color: "var(--text-muted)", marginTop: 20 }}>
            Already have an account?{" "}
            <Link href="/login" style={{ color: "#a78bfa", fontWeight: 600, textDecoration: "none" }}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
