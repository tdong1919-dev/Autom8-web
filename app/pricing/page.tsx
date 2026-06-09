"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface Plan {
  id: string;
  name: string;
  price: number;
  replyLimit: number;
  features: string[];
  popular?: boolean;
}

const PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    price: 29,
    replyLimit: 250,
    features: [
      "250 AI replies / month",
      "1 Instagram account",
      "Brand voice editor",
      "Manual review queue",
      "Email support",
    ],
  },
  {
    id: "growth",
    name: "Growth",
    price: 79,
    replyLimit: 1000,
    features: [
      "1,000 AI replies / month",
      "2 Instagram accounts",
      "Brand voice editor",
      "Auto-approve rules",
      "Priority support",
    ],
    popular: true,
  },
  {
    id: "agency_starter",
    name: "Agency",
    price: 149,
    replyLimit: 500,
    features: [
      "500 AI replies / month",
      "Up to 5 client accounts",
      "White-label dashboard",
      "Brand voice per client",
      "Email support",
    ],
  },
];

interface SignupModalProps {
  plan: Plan;
  onClose: () => void;
}

function SignupModal({ plan, onClose }: SignupModalProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: signUpError } = await supabase.auth.signUp({ email, password });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    // Redirect to Stripe checkout for selected plan
    router.push(`/api/billing/checkout?plan=${plan.id}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-md p-8 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/40 hover:text-white/80 text-xl leading-none"
          aria-label="Close"
        >
          ×
        </button>

        <div className="mb-6">
          <p className="text-xs text-white/40 uppercase tracking-widest mb-1">Starting your trial</p>
          <h2 className="text-2xl font-bold text-white">
            {plan.name} — ${plan.price}/mo
          </h2>
          <p className="text-sm text-white/50 mt-1">
            14-day free trial. No credit card required until trial ends.
          </p>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="block text-xs text-white/50 mb-1.5 uppercase tracking-wider">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 text-sm focus:outline-none focus:border-white/30"
            />
          </div>
          <div>
            <label className="block text-xs text-white/50 mb-1.5 uppercase tracking-wider">
              Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 6 characters"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 text-sm focus:outline-none focus:border-white/30"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#7B61FF] hover:bg-[#6B51EF] disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
          >
            {loading ? "Creating account..." : `Start Free Trial — ${plan.name}`}
          </button>
        </form>

        <p className="text-center text-xs text-white/30 mt-5">
          Already have an account?{" "}
          <Link href="/login" className="text-white/60 hover:text-white underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function PricingPage() {
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Nav */}
      <nav className="border-b border-white/5 px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <Link href="/" className="text-white font-bold text-lg tracking-tight">
          Autom8
        </Link>
        <Link
          href="/login"
          className="text-sm text-white/50 hover:text-white transition-colors"
        >
          Log in
        </Link>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-16 space-y-12">
        {/* Header */}
        <div className="text-center space-y-4">
          <p className="text-xs text-[#7B61FF] uppercase tracking-widest font-semibold">Pricing</p>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight">
            Start free. Scale when ready.
          </h1>
          <p className="text-white/50 text-lg max-w-xl mx-auto">
            Every missed comment is a missed lead. Autom8 replies for you — 24/7.
          </p>
          <div className="flex items-center justify-center gap-6 text-sm text-white/40">
            <span>✓ 14-day free trial</span>
            <span>✓ No credit card required</span>
            <span>✓ Cancel anytime</span>
          </div>
        </div>

        {/* Plan cards */}
        <div className="grid md:grid-cols-3 gap-6 items-stretch">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-2xl border p-7 transition-all ${
                plan.popular
                  ? "border-[#7B61FF]/60 bg-[#111] shadow-[0_0_40px_rgba(123,97,255,0.15)] md:scale-105"
                  : "border-white/10 bg-[#0d0d0d] hover:border-white/20"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#7B61FF] text-white text-[11px] font-bold px-4 py-1 rounded-full tracking-wide whitespace-nowrap">
                  MOST POPULAR
                </div>
              )}

              <div className="mb-5">
                <h3 className="text-base font-bold text-white mb-3">{plan.name}</h3>
                <div className="flex items-end gap-1">
                  <span className="text-4xl font-black text-white">${plan.price}</span>
                  <span className="text-white/40 text-sm pb-1.5">/ mo</span>
                </div>
                <p className="text-xs text-white/40 mt-1">
                  {plan.replyLimit.toLocaleString()} replies / month
                </p>
              </div>

              <ul className="space-y-2.5 flex-1 mb-7">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-white/60">
                    <span className="text-[#7B61FF] mt-0.5 shrink-0 text-xs">✓</span>
                    {f}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => setSelectedPlan(plan)}
                className={`w-full py-3 rounded-xl font-semibold text-sm transition-colors ${
                  plan.popular
                    ? "bg-[#7B61FF] hover:bg-[#6B51EF] text-white"
                    : "bg-white/8 hover:bg-white/12 text-white border border-white/10"
                }`}
              >
                Start Free Trial →
              </button>
            </div>
          ))}
        </div>

        {/* Trust signals */}
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { icon: "🔒", title: "Cancel anytime", desc: "No lock-in. Cancel or switch plans from your dashboard." },
            { icon: "⚡", title: "Instant activation", desc: "Your AI starts replying within minutes of setup." },
            { icon: "💬", title: "14-day free trial", desc: "Try it risk-free. No credit card required to start." },
          ].map((item) => (
            <div key={item.title} className="rounded-xl border border-white/8 bg-white/3 p-4 text-center">
              <div className="text-2xl mb-2">{item.icon}</div>
              <p className="text-sm font-medium text-white mb-1">{item.title}</p>
              <p className="text-xs text-white/40">{item.desc}</p>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-white/30">
          Managing multiple clients or need a custom plan?{" "}
          <Link href="mailto:hello@autom8ig.io" className="text-white/50 hover:text-white underline">
            Talk to us →
          </Link>
        </p>
      </div>

      {selectedPlan && (
        <SignupModal plan={selectedPlan} onClose={() => setSelectedPlan(null)} />
      )}
    </div>
  );
}
