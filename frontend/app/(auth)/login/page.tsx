"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, TrendingUp, Mail, Lock, KeyRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type AuthMode = "login" | "forgot_password" | "set_new_password";

function LoginContent() {
  const router = useRouter();
  const supabase = createClient();
  const searchParams = useSearchParams();
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [mode, setMode] = useState<AuthMode>("login");
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [cooldown, setCooldown] = useState(0);

  // Listen for Supabase password recovery events (from magic link click)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setMode("set_new_password");
        setSuccess("Secure session established. Please set your new password.");
      }
    });
    
    // Check if there's a custom mode passed in the URL
    if (searchParams?.get("mode") === "set_new_password") {
      setMode("set_new_password");
    }

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase.auth, searchParams]);

  const startCooldown = () => {
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
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cooldown > 0) {
      setError(`Too many attempts. Please try again in ${cooldown} seconds.`);
      return;
    }
    
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (signInError) throw signInError;
      if (data.user) {
        window.location.href = "/dashboard";
      }
    } catch (err: any) {
      console.error("Login error:", err);
      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);
      setError(err.message || "Invalid login credentials");
      
      if (newAttempts >= 3) {
        startCooldown();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cooldown > 0) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login?mode=set_new_password`,
      });
      if (resetError) throw resetError;
      
      setSuccess("A password reset link has been sent to your email. Please check your inbox and click the link.");
      // We don't change mode here, we wait for them to click the link
    } catch (err: any) {
      console.error("Forgot password error:", err);
      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);
      
      let errorMessage = err.message || "Failed to send reset email";
      if (errorMessage.toLowerCase().includes("rate limit exceeded") || errorMessage.toLowerCase().includes("too many requests")) {
        errorMessage = "Email rate limit exceeded. To protect your account, please wait about 60 minutes before requesting another link.";
      }
      
      setError(errorMessage);
      
      if (newAttempts >= 3) {
        startCooldown();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSetNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cooldown > 0) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      });
      if (updateError) throw updateError;
      
      // Successfully updated! Send them to dashboard
      window.location.href = "/dashboard";
    } catch (err: any) {
      console.error("Update password error:", err);
      setError(err.message || "Failed to update password");
    } finally {
      setLoading(false);
    }
  };

  // Helper to render the form based on mode
  const renderForm = () => {
    if (mode === "login") {
      return (
        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Email */}
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Email
            </label>
            <div style={{ position: "relative" }}>
              <Mail size={15} color="var(--text-muted)" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
              <input
                className="input-field"
                type="email"
                placeholder="you@example.com"
                style={{ paddingLeft: 40 }}
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Password
              </label>
              <button 
                type="button" 
                onClick={() => { setMode("forgot_password"); setError(null); setSuccess(null); }}
                style={{ fontSize: 12, color: "#a78bfa", background: "none", border: "none", cursor: "pointer", padding: 0 }}
              >
                Forgot password?
              </button>
            </div>
            <div style={{ position: "relative" }}>
              <Lock size={15} color="var(--text-muted)" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
              <input
                className="input-field"
                type={showPw ? "text" : "password"}
                placeholder="••••••••"
                style={{ paddingLeft: 40, paddingRight: 44 }}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPw(v => !v)}
                style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && <p style={{ fontSize: 13, color: "#ef4444", marginBottom: 4 }}>{error}</p>}
          {success && <p style={{ fontSize: 13, color: "#10b981", marginBottom: 4 }}>{success}</p>}

          <button
            type="submit"
            className="btn-primary"
            disabled={loading || cooldown > 0}
            style={{ padding: "13px 20px", opacity: (loading || cooldown > 0) ? 0.8 : 1, marginTop: 4, cursor: (cooldown > 0) ? "not-allowed" : "pointer" }}
          >
            {loading ? "Signing in..." : cooldown > 0 ? `Wait ${cooldown}s` : "Sign In"}
          </button>
        </form>
      );
    }

    if (mode === "forgot_password") {
      return (
        <form onSubmit={handleForgotPassword} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Account Email
            </label>
            <div style={{ position: "relative" }}>
              <Mail size={15} color="var(--text-muted)" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
              <input
                className="input-field"
                type="email"
                placeholder="you@example.com"
                style={{ paddingLeft: 40 }}
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>
          
          {error && <p style={{ fontSize: 13, color: "#ef4444", marginBottom: 4 }}>{error}</p>}
          {success && <p style={{ fontSize: 13, color: "#10b981", marginBottom: 4 }}>{success}</p>}

          <button
            type="submit"
            className="btn-primary"
            disabled={loading || cooldown > 0 || !email}
            style={{ padding: "13px 20px", opacity: (loading || cooldown > 0 || !email) ? 0.8 : 1, marginTop: 4, cursor: (cooldown > 0) ? "not-allowed" : "pointer" }}
          >
            {loading ? "Sending..." : cooldown > 0 ? `Wait ${cooldown}s` : "Send Recovery OTP"}
          </button>
          
          <button 
            type="button" 
            onClick={() => { setMode("login"); setError(null); setSuccess(null); }}
            style={{ fontSize: 13, color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", marginTop: 8 }}
          >
            Back to login
          </button>
        </form>
      );
    }

    if (mode === "set_new_password") {
      return (
        <form onSubmit={handleSetNewPassword} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              New Password
            </label>
            <div style={{ position: "relative" }}>
              <Lock size={15} color="var(--text-muted)" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
              <input
                className="input-field"
                type={showPw ? "text" : "password"}
                placeholder="••••••••"
                style={{ paddingLeft: 40, paddingRight: 44 }}
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPw(v => !v)}
                style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 8 }}>
              Please enter at least 8 characters.
            </p>
          </div>
          
          {error && <p style={{ fontSize: 13, color: "#ef4444", marginBottom: 4 }}>{error}</p>}
          {success && <p style={{ fontSize: 13, color: "#10b981", marginBottom: 4 }}>{success}</p>}

          <button
            type="submit"
            className="btn-primary"
            disabled={loading || cooldown > 0 || password.length < 8}
            style={{ padding: "13px 20px", opacity: (loading || cooldown > 0 || password.length < 8) ? 0.8 : 1, marginTop: 4, cursor: (cooldown > 0) ? "not-allowed" : "pointer" }}
          >
            {loading ? "Saving..." : "Save New Password"}
          </button>
        </form>
      );
    }
  };

  return (
    <div
      className="bg-mesh"
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background blobs */}
      <div style={{ position: "fixed", top: "10%", left: "5%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 70%)", pointerEvents: "none", filter: "blur(60px)" }} />
      <div style={{ position: "fixed", bottom: "10%", right: "5%", width: 350, height: 350, borderRadius: "50%", background: "radial-gradient(circle, rgba(34,211,238,0.1) 0%, transparent 70%)", pointerEvents: "none", filter: "blur(60px)" }} />

      <div className="glass animate-fade-in-up" style={{ width: "100%", maxWidth: 440, padding: "44px 40px", position: "relative" }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 36 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 20px rgba(124,58,237,0.4)" }}>
            <TrendingUp size={20} color="#fff" />
          </div>
          <span style={{ fontSize: 22, fontWeight: 800, fontFamily: "'Space Grotesk', sans-serif" }} className="gradient-text">
            CreatorHub
          </span>
        </div>

        <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--text-primary)", marginBottom: 6, fontFamily: "'Space Grotesk', sans-serif" }}>
          {mode === "login" && "Welcome back"}
          {mode === "forgot_password" && "Reset Password"}
          {mode === "set_new_password" && "Set New Password"}
        </h1>
        <p style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 32 }}>
          {mode === "login" && "Sign in to your creator dashboard"}
          {mode === "forgot_password" && "Enter your email to receive a password reset link"}
          {mode === "set_new_password" && "Choose a strong new password"}
        </p>

        {renderForm()}

        {mode === "login" && (
          <p style={{ textAlign: "center", fontSize: 13, color: "var(--text-muted)", marginTop: 24 }}>
            Don&apos;t have an account?{" "}
            <Link href="/signup" style={{ color: "#a78bfa", fontWeight: 600, textDecoration: "none" }}>
              Sign up free
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#05050a" }}>
        <div style={{ width: 32, height: 32, border: "3px solid rgba(124,58,237,0.3)", borderTopColor: "#7c3aed", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
