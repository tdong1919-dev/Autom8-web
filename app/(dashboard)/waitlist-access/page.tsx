"use client";
import { useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

const perks = [
  { icon: "🤖", title: "Largest AI & Agentic Solution Library", desc: "First access to a growing catalog of AI automations built specifically for creators, coaches, and businesses." },
  { icon: "🛠", title: "Customized Automation Ecosystem", desc: "We build you a personalized automation setup around your brand, platforms, and goals." },
  { icon: "📚", title: "Education & Training", desc: "Learn how to autom8 your business and reclaim your time — step-by-step, with live support." },
  { icon: "💰", title: "Paid Collaboration Opportunities", desc: "Get paid to collaborate as we grow — brand deals, content opportunities, and more." },
  { icon: "🎬", title: "Creator Opportunities", desc: "Be featured, amplified, and supported as a creator in the Autom8 ecosystem." },
  { icon: "💼", title: "Job & Income Opportunities", desc: "Learn to build your own automations, list them on the platform, and earn recurring income." },
];

export default function WaitlistAccessPage() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", interest: "" });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const set = (key: string, val: string) => setForm((p) => ({ ...p, [key]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1000));
    setSubmitted(true);
    setLoading(false);
  };

  return (
    <div className="p-5 md:p-7 max-w-3xl mx-auto space-y-6">
      {/* Hero */}
      <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/8 via-transparent to-accent-purple/8 p-7 md:p-10 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(123,63,242,0.06),transparent_70%)] pointer-events-none" />
        <div className="relative">
          <span className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary text-xs font-semibold px-3 py-1 rounded-full mb-5">
            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
            Currently in Development
          </span>
          <div className="text-5xl mb-4">🚀</div>
          <h1 className="text-3xl md:text-4xl font-bold text-text-primary mb-3 tracking-tight">
            Exclusive Access Waitlist
          </h1>
          <p className="text-text-secondary max-w-xl mx-auto leading-relaxed text-sm md:text-base">
            Be the first to access the largest library of AI and agentic solutions — including a customized automation ecosystem, education on how to autom8 your life, and real income opportunities.
          </p>
        </div>
      </div>

      {/* Perks grid */}
      <div>
        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-4">What you&apos;ll get</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {perks.map((perk) => (
            <div key={perk.title} className="flex items-start gap-4 p-4 rounded-xl border border-border bg-surface hover:border-primary/20 transition-colors">
              <span className="text-2xl shrink-0">{perk.icon}</span>
              <div>
                <p className="text-sm font-semibold text-text-primary mb-1">{perk.title}</p>
                <p className="text-xs text-text-muted leading-relaxed">{perk.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Signup Form */}
      {submitted ? (
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-8 text-center">
          <div className="text-4xl mb-3">🎉</div>
          <h2 className="text-xl font-bold text-text-primary mb-2">You&apos;re on the list!</h2>
          <p className="text-sm text-text-secondary max-w-sm mx-auto">
            We&apos;ll notify you by email and SMS the moment exclusive access opens. You&apos;re in early — stay ready.
          </p>
        </div>
      ) : (
        <Card header={
          <div>
            <h2 className="text-base font-semibold text-text-primary">Join the Waitlist</h2>
            <p className="text-xs text-text-muted mt-0.5">Email &amp; SMS intake — be first in line</p>
          </div>
        }>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">Full Name *</label>
                <input
                  required
                  type="text"
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="Your name"
                  className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-sm text-text-primary placeholder-text-muted outline-none focus:border-primary/40 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">Email *</label>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-sm text-text-primary placeholder-text-muted outline-none focus:border-primary/40 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">Phone (for SMS updates)</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="(555) 000-0000"
                className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-sm text-text-primary placeholder-text-muted outline-none focus:border-primary/40 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">What excites you most?</label>
              <div className="flex flex-wrap gap-2">
                {["Building automations", "AI tools library", "Creator opportunities", "Earning income", "Education", "All of the above"].map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => set("interest", opt)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all
                      ${form.interest === opt
                        ? "bg-primary/10 border-primary/30 text-primary"
                        : "bg-surface border-border text-text-secondary hover:text-text-primary"
                      }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full">
              Secure My Spot →
            </Button>

            <p className="text-center text-xs text-text-muted">
              No spam. We&apos;ll only contact you about early access and opportunities.
            </p>
          </form>
        </Card>
      )}
    </div>
  );
}
