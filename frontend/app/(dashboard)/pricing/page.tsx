"use client";
import { API_URL } from "@/lib/utils";

import { useState, useEffect } from "react";
import { Check, Star, Zap, Shield, Crown } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/Toast";

// We'll dynamically load Razorpay script when needed
const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

const PLANS = {
  free: {
    name: "Starter",
    price: "₹0",
    period: "/forever",
    description: "Perfect for new creators getting started.",
    features: [
      "1 Connected Platform",
      "Basic Analytics Dashboard",
      "3 AI Insights per month",
      "30 days historical data",
    ],
    icon: Star,
    color: "#94a3b8", // slate-400
  },
  pro: {
    name: "Pro",
    monthlyPrice: 499,
    yearlyPrice: 4999,
    description: "For serious creators growing their audience.",
    features: [
      "Up to 3 Connected Platforms",
      "Unlimited AI Insights",
      "Content Scheduling (30/mo)",
      "PDF Export Reports",
      "6 months historical data",
    ],
    icon: Zap,
    color: "#3b82f6", // blue-500
    popular: true,
  },
  elite: {
    name: "Elite",
    monthlyPrice: 1499,
    yearlyPrice: 14999,
    description: "For massive creators and agencies.",
    features: [
      "Unlimited Connected Platforms",
      "Unlimited Content Scheduling",
      "Unlimited historical data",
      "Priority 24/7 Support",
      "Custom brand colors",
    ],
    icon: Crown,
    color: "#8b5cf6", // violet-500
  },
};

export default function PricingPage() {
  const supabase = createClient();
  const { success, error: toastError } = useToast();
  const [sessionUser, setSessionUser] = useState<any>(null);
  const [isYearly, setIsYearly] = useState(true);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const [currentPlan, setCurrentPlan] = useState<string>("free");

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setSessionUser(user);
      if (user) {
        fetch(`${API_URL}/api/payments/me?user_id=${user.id}`)
          .then(res => res.json())
          .then(data => {
             if (data && data.tier) {
               setCurrentPlan(data.tier);
             }
          })
          .catch(err => console.error("Failed to fetch plan tier", err));
      }
    });
  }, [supabase.auth]);

  const handleUpgrade = async (planId: string) => {
    if (!sessionUser) return;
    setLoadingPlan(planId);

    try {
      // 1. Load script
      const res = await loadRazorpayScript();
      if (!res) {
        toastError("Razorpay SDK failed to load. Are you online?");
        setLoadingPlan(null);
        return;
      }

      // 2. Create Order on Backend
      const orderResponse = await fetch(`${API_URL}/api/payments/create-order?user_id=${sessionUser.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_id: planId }),
      });
      
      const orderData = await orderResponse.json();
      
      if (!orderResponse.ok) {
        throw new Error(orderData.detail || "Failed to create order");
      }

      // 3. Open Razorpay Checkout Modal
      const options = {
        key: orderData.key_id || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID, // Use backend key directly!
        amount: orderData.amount,
        currency: orderData.currency,
        name: "CreatorHub",
        description: `Upgrade to ${planId.replace('_', ' ').toUpperCase()}`,
        order_id: orderData.order_id,
        handler: async function (response: any) {
          try {
            // 4. Verify payment on Backend
            const verifyRes = await fetch(`${API_URL}/api/payments/verify?user_id=${sessionUser.id}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });
            
            const verifyData = await verifyRes.json();
            if (verifyRes.ok) {
              success("Payment successful! You've been upgraded.");
              setTimeout(() => window.location.reload(), 1500);
            } else {
              toastError("Payment verification failed: " + verifyData.detail);
              setLoadingPlan(null);
            }
          } catch (e) {
            toastError("Failed to verify payment with server.");
            setLoadingPlan(null);
          }
        },
        prefill: {
          email: sessionUser.email,
        },
        theme: {
          color: "#7c3aed",
        },
        modal: {
          ondismiss: function() {
            setLoadingPlan(null);
          }
        }
      };

      const paymentObject = new (window as any).Razorpay(options);
      
      // Handle payment failure gracefully
      paymentObject.on('payment.failed', function (response: any) {
        toastError(response.error.description || "Payment failed");
        setLoadingPlan(null);
      });
      
      paymentObject.open();

    } catch (err: any) {
      console.error(err);
      toastError(err.message || "Something went wrong.");
      setLoadingPlan(null);
    }
  };

  return (
    <div style={{ padding: "40px", maxWidth: 1200, margin: "0 auto", minHeight: "100vh" }}>
      <div style={{ textAlign: "center", marginBottom: 60 }} className="animate-fade-in">
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 20, background: "rgba(124,58,237,0.1)", color: "#a78bfa", fontSize: 14, fontWeight: 600, marginBottom: 24 }}>
          <Shield size={16} /> Secure checkout powered by Razorpay
        </div>
        <h1 style={{ fontSize: 48, fontWeight: 800, fontFamily: "'Space Grotesk', sans-serif", color: "var(--text-primary)", marginBottom: 16 }}>
          Simple pricing for <span className="gradient-text">creators</span>
        </h1>
        <p style={{ fontSize: 18, color: "var(--text-muted)", maxWidth: 600, margin: "0 auto" }}>
          Unlock the full potential of your audience with advanced analytics, unlimited AI insights, and cross-platform scheduling.
        </p>

        {/* Toggle */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, marginTop: 40 }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: !isYearly ? "var(--text-primary)" : "var(--text-muted)" }}>Monthly</span>
          <button 
            onClick={() => setIsYearly(!isYearly)}
            style={{ 
              width: 56, height: 32, borderRadius: 16, background: "rgba(255,255,255,0.1)", position: "relative", cursor: "pointer", border: "1px solid rgba(255,255,255,0.05)"
            }}
          >
            <div style={{ 
              width: 24, height: 24, borderRadius: "50%", background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)",
              position: "absolute", top: 3, left: isYearly ? 28 : 4, transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
            }} />
          </button>
          <span style={{ fontSize: 15, fontWeight: 600, color: isYearly ? "var(--text-primary)" : "var(--text-muted)", display: "flex", alignItems: "center", gap: 8 }}>
            Yearly <span style={{ padding: "4px 8px", background: "rgba(16,185,129,0.1)", color: "#34d399", fontSize: 11, borderRadius: 12 }}>Save 17%</span>
          </span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
        
        {/* Starter Plan */}
        <div className="glass hover-bg" style={{ padding: 32, borderRadius: 24, border: "1px solid rgba(255,255,255,0.05)", position: "relative", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <div style={{ padding: 10, borderRadius: 12, background: "rgba(148,163,184,0.1)", color: PLANS.free.color }}>
              <PLANS.free.icon size={24} />
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)" }}>{PLANS.free.name}</h3>
          </div>
          <p style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 24 }}>{PLANS.free.description}</p>
          <div style={{ marginBottom: 32 }}>
            <span style={{ fontSize: 40, fontWeight: 800, color: "var(--text-primary)" }}>{PLANS.free.price}</span>
            <span style={{ color: "var(--text-muted)" }}>{PLANS.free.period}</span>
          </div>
          <button 
            className="btn-secondary" 
            style={{ width: "100%", padding: "12px", marginBottom: 32, opacity: currentPlan === 'free' ? 0.6 : 1 }} 
            disabled
          >
            {currentPlan === 'free' ? "Current Plan" : "Downgrade (Contact Support)"}
          </button>
          <div style={{ display: "flex", flexDirection: "column", gap: 16, flex: 1 }}>
            {PLANS.free.features.map((f, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Check size={18} color={PLANS.free.color} />
                <span style={{ fontSize: 14, color: "var(--text-secondary)" }}>{f}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Pro Plan */}
        <div className="glass" style={{ padding: 32, borderRadius: 24, border: `1px solid ${PLANS.pro.color}`, background: "rgba(59, 130, 246, 0.05)", position: "relative", display: "flex", flexDirection: "column", transform: "scale(1.02)", zIndex: 1, boxShadow: "0 20px 40px rgba(0,0,0,0.2)" }}>
          <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)", color: "#fff", padding: "4px 12px", borderRadius: 12, fontSize: 12, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>
            Most Popular
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <div style={{ padding: 10, borderRadius: 12, background: "rgba(59,130,246,0.1)", color: PLANS.pro.color }}>
              <PLANS.pro.icon size={24} />
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)" }}>{PLANS.pro.name}</h3>
          </div>
          <p style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 24 }}>{PLANS.pro.description}</p>
          <div style={{ marginBottom: 32 }}>
            <span style={{ fontSize: 40, fontWeight: 800, color: "var(--text-primary)" }}>₹{isYearly ? PLANS.pro.yearlyPrice : PLANS.pro.monthlyPrice}</span>
            <span style={{ color: "var(--text-muted)" }}>{isYearly ? "/year" : "/month"}</span>
          </div>
          <button 
            className={currentPlan === 'pro' ? "btn-secondary" : "btn-primary"} 
            style={{ width: "100%", padding: "12px", marginBottom: 32, background: currentPlan === 'pro' ? undefined : PLANS.pro.color, opacity: currentPlan === 'pro' ? 0.6 : 1 }}
            onClick={() => handleUpgrade(isYearly ? "pro_yearly" : "pro_monthly")}
            disabled={loadingPlan !== null || currentPlan === 'pro'}
          >
            {loadingPlan === (isYearly ? "pro_yearly" : "pro_monthly") 
              ? "Loading..." 
              : currentPlan === 'pro' ? "Current Plan" : "Upgrade to Pro"}
          </button>
          <div style={{ display: "flex", flexDirection: "column", gap: 16, flex: 1 }}>
            {PLANS.pro.features.map((f, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Check size={18} color={PLANS.pro.color} />
                <span style={{ fontSize: 14, color: "var(--text-primary)" }}>{f}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Elite Plan */}
        <div className="glass hover-bg" style={{ padding: 32, borderRadius: 24, border: "1px solid rgba(255,255,255,0.05)", position: "relative", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <div style={{ padding: 10, borderRadius: 12, background: "rgba(139,92,246,0.1)", color: PLANS.elite.color }}>
              <PLANS.elite.icon size={24} />
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)" }}>{PLANS.elite.name}</h3>
          </div>
          <p style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 24 }}>{PLANS.elite.description}</p>
          <div style={{ marginBottom: 32 }}>
            <span style={{ fontSize: 40, fontWeight: 800, color: "var(--text-primary)" }}>₹{isYearly ? PLANS.elite.yearlyPrice : PLANS.elite.monthlyPrice}</span>
            <span style={{ color: "var(--text-muted)" }}>{isYearly ? "/year" : "/month"}</span>
          </div>
          <button 
            className={currentPlan === 'elite' ? "btn-secondary" : "btn-primary"} 
            style={{ width: "100%", padding: "12px", marginBottom: 32, background: currentPlan === 'elite' ? undefined : PLANS.elite.color, opacity: currentPlan === 'elite' ? 0.6 : 1 }}
            onClick={() => handleUpgrade(isYearly ? "elite_yearly" : "elite_monthly")}
            disabled={loadingPlan !== null || currentPlan === 'elite'}
          >
             {loadingPlan === (isYearly ? "elite_yearly" : "elite_monthly") 
               ? "Loading..." 
               : currentPlan === 'elite' ? "Current Plan" : "Upgrade to Elite"}
          </button>
          <div style={{ display: "flex", flexDirection: "column", gap: 16, flex: 1 }}>
            {PLANS.elite.features.map((f, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Check size={18} color={PLANS.elite.color} />
                <span style={{ fontSize: 14, color: "var(--text-secondary)" }}>{f}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
