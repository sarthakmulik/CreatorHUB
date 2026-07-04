import Link from "next/link";
import { ArrowRight, Play, ShieldCheck, Zap } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-mesh flex flex-col font-sans">
      
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[var(--bg-base)]/80 backdrop-blur-md border-b border-[var(--border-subtle)]">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center shadow-[0_0_15px_rgba(124,58,237,0.5)]">
              <Play className="w-4 h-4 text-white fill-current" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">CreatorHub</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-[var(--text-secondary)] hover:text-white transition-colors">
              Log in
            </Link>
            <Link href="/login" className="btn-primary px-5 py-2.5 text-sm shadow-[0_0_20px_rgba(124,58,237,0.3)]">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-grow flex items-center justify-center px-6 pt-32 pb-20">
        <div className="max-w-4xl w-full flex flex-col items-center text-center animate-fade-in-up">
          
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-sm font-medium mb-8 animate-float">
            <ShieldCheck className="w-4 h-4" />
            <span>Official YouTube API Partner</span>
          </div>

          {/* Hero Title */}
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-tight text-white">
            The ultimate command center for{" "}
            <span className="gradient-text">creators</span>
          </h1>
          
          {/* Subtitle */}
          <p className="text-lg md:text-xl text-[var(--text-secondary)] max-w-2xl mb-12 leading-relaxed">
            Stop bouncing between apps. Connect your YouTube, Instagram, and TikTok to track analytics, generate AI insights, and accelerate your channel's growth all in one dashboard.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 mb-24 w-full sm:w-auto">
            <Link href="/login" className="btn-primary px-8 py-4 text-base font-semibold w-full sm:w-auto">
              Get Started{" "}
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
            <Link href="/login" className="btn-secondary px-8 py-4 text-base font-semibold w-full sm:w-auto">
              Log in
            </Link>
          </div>

          {/* Google Verification / Data Usage Section (MANDATORY FOR GOOGLE) */}
          <div className="w-full max-w-3xl glass p-8 text-left border-l-4 border-l-purple-500 rounded-r-xl">
            <div className="flex items-start gap-4">
              <Zap className="w-6 h-6 text-purple-400 shrink-0 mt-1" />
              <div>
                <h4 className="text-lg font-bold text-white mb-2">Secure & Transparent Data Usage</h4>
                <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                  CreatorHub is fully audited and securely accesses your YouTube analytics (such as views, likes, and comments) via the official YouTube Data API. We strictly use this data only to generate personalized growth insights and render your dashboard. We do not sell your analytics, share them with third parties, or make unauthorized modifications to your channel.
                </p>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2 opacity-80">
            <div className="w-6 h-6 rounded-md bg-purple-600 flex items-center justify-center">
              <Play className="w-3 h-3 text-white fill-current" />
            </div>
            <span className="font-bold text-white tracking-tight">CreatorHub</span>
          </div>
          
          <p className="text-sm text-[var(--text-muted)]">
            © 2026 CreatorHub. All rights reserved.
          </p>

          <div className="flex gap-6 text-sm">
            <Link href="/privacy" className="text-[var(--text-muted)] hover:text-purple-400 transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="text-[var(--text-muted)] hover:text-purple-400 transition-colors">Terms of Service</Link>
            <a href="mailto:sarthakmulik16@gmail.com" className="text-[var(--text-muted)] hover:text-purple-400 transition-colors">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
