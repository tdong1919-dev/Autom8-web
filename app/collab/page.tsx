"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

const NICHES = [
  "Instagram growth & strategy",
  "Ecommerce / product business",
  "Creator monetization",
  "AI for business",
  "Founder / startup education",
  "Social media marketing",
  "Agency owner",
  "Other",
];

const FOLLOWER_RANGES = [
  "Under 1K",
  "1K – 5K",
  "5K – 10K",
  "10K – 50K",
  "50K – 100K",
  "100K+",
];

const steps = [
  { n: "01", title: "Apply", desc: "Fill out the short form below. Takes 2 minutes." },
  { n: "02", title: "Get approved", desc: "We review and respond within 3–5 business days." },
  { n: "03", title: "Use Autom8 free", desc: "Get 1 month of full platform access — no credit card." },
  { n: "04", title: "Share if it works", desc: "Only if it genuinely helped. One video + one post. Your words." },
];

export default function CollabPage() {
  const [form, setForm] = useState({
    name: "", email: "", instagram_handle: "", follower_count: "", content_niche: "", message: "",
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/collab/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Something went wrong."); return; }
      setSubmitted(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen" style={{ background: "#0b0218", color: "#e6dff5", fontFamily: "Inter, -apple-system, sans-serif" }}>

      {/* NAV */}
      <header style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", background: "rgba(11,2,24,0.85)", backdropFilter: "blur(12px)", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 6, textDecoration: "none" }}>
            <Image src="/logo-icon.png" alt="Autom8" width={32} height={32} style={{ objectFit: "contain" }} />
            <span style={{ fontWeight: 800, fontSize: 17, color: "#fff", letterSpacing: "-0.3px" }}>autom8<em style={{ fontStyle: "italic", background: "linear-gradient(90deg,#f857a6,#7b3ff2)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>ig</em></span>
          </Link>
          <nav style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <Link href="/#features" style={{ color: "rgba(230,223,245,0.6)", fontSize: 14, textDecoration: "none" }}>Features</Link>
            <Link href="/#pricing" style={{ color: "rgba(230,223,245,0.6)", fontSize: 14, textDecoration: "none" }}>Pricing</Link>
            <Link href="/collab" style={{ color: "#f857a6", fontSize: 14, textDecoration: "none", fontWeight: 600 }}>Collab Program</Link>
            <Link href="/signup" style={{ background: "linear-gradient(95deg,#f857a6,#7b3ff2)", color: "#fff", fontSize: 13, fontWeight: 700, padding: "7px 16px", borderRadius: 8, textDecoration: "none" }}>Start / Sign In</Link>
          </nav>
        </div>
      </header>

      {/* HERO */}
      <section style={{ maxWidth: 720, margin: "0 auto", padding: "80px 24px 56px", textAlign: "center" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(248,87,166,0.1)", border: "1px solid rgba(248,87,166,0.3)", borderRadius: 999, padding: "5px 14px", marginBottom: 24 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#f857a6", display: "inline-block" }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: "#f857a6", letterSpacing: "0.06em", textTransform: "uppercase" }}>Creator Partner Program</span>
        </div>
        <h1 style={{ fontSize: "clamp(36px,5vw,58px)", fontWeight: 800, lineHeight: 1.1, margin: "0 0 20px", letterSpacing: "-1px", color: "#fff" }}>
          Collab with<br />
          <span style={{ background: "linear-gradient(95deg,#f857a6,#7b3ff2)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>autom8ig</span>
        </h1>
        <p style={{ fontSize: 18, color: "rgba(230,223,245,0.65)", lineHeight: 1.65, maxWidth: 540, margin: "0 auto 36px" }}>
          Get 1 month of free access. Use the platform for real. If it genuinely helps your business — share your story. That&apos;s it.
        </p>
        <a href="#apply" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "linear-gradient(95deg,#f857a6,#7b3ff2)", color: "#fff", fontWeight: 700, fontSize: 15, padding: "13px 28px", borderRadius: 10, textDecoration: "none", boxShadow: "0 0 32px rgba(123,63,242,0.35)" }}>
          Apply Now →
        </a>
      </section>

      {/* OFFER CARDS */}
      <section style={{ maxWidth: 900, margin: "0 auto 72px", padding: "0 24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 16 }}>
          {[
            {
              emoji: "🎁",
              title: "What you get",
              items: ["1 month free Starter plan access", "Full platform — no credit card needed", "Dedicated onboarding support", "First access to affiliate program"],
            },
            {
              emoji: "🤝",
              title: "What we ask",
              items: ["1 video testimonial (up to 30 sec)", "1 Instagram grid post (live 30+ days)", "Only if the platform genuinely helped", "Your words — never scripted"],
            },
            {
              emoji: "✨",
              title: "Optional upside",
              items: ["Join the affiliate program post-trial", "Earn commission on referrals", "Founding member perks", "Paid collab conversation (for high-reach creators)"],
            },
          ].map(card => (
            <div key={card.title} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: "28px 24px" }}>
              <div style={{ fontSize: 28, marginBottom: 12 }}>{card.emoji}</div>
              <h3 style={{ fontWeight: 700, fontSize: 16, color: "#fff", margin: "0 0 14px" }}>{card.title}</h3>
              <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
                {card.items.map(item => (
                  <li key={item} style={{ fontSize: 14, color: "rgba(230,223,245,0.65)", display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <span style={{ color: "#f857a6", flexShrink: 0, marginTop: 1 }}>→</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{ maxWidth: 900, margin: "0 auto 80px", padding: "0 24px" }}>
        <h2 style={{ fontWeight: 700, fontSize: 24, color: "#fff", margin: "0 0 32px", textAlign: "center" }}>How it works</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 12 }}>
          {steps.map((step, i) => (
            <div key={step.n} style={{ position: "relative", padding: "24px 20px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14 }}>
              {i < steps.length - 1 && (
                <span style={{ display: "none" }} aria-hidden />
              )}
              <div style={{ fontSize: 11, fontWeight: 700, color: "#7b3ff2", letterSpacing: "0.1em", marginBottom: 10 }}>{step.n}</div>
              <h4 style={{ fontWeight: 700, fontSize: 15, color: "#fff", margin: "0 0 6px" }}>{step.title}</h4>
              <p style={{ fontSize: 13, color: "rgba(230,223,245,0.55)", margin: 0, lineHeight: 1.55 }}>{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* WHO WE WORK WITH */}
      <section style={{ maxWidth: 720, margin: "0 auto 80px", padding: "0 24px", textAlign: "center" }}>
        <h2 style={{ fontWeight: 700, fontSize: 24, color: "#fff", margin: "0 0 12px" }}>Who this is for</h2>
        <p style={{ color: "rgba(230,223,245,0.55)", fontSize: 15, margin: "0 0 28px" }}>Creators whose audiences are building businesses on social media.</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
          {["Instagram growth & strategy", "Ecommerce & product biz", "AI for business", "Creator monetization", "Founder education", "Social media marketing", "Agency owners", "Digital entrepreneurs"].map(tag => (
            <span key={tag} style={{ fontSize: 13, color: "rgba(230,223,245,0.7)", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 999, padding: "5px 14px" }}>{tag}</span>
          ))}
        </div>
      </section>

      {/* APPLY FORM */}
      <section id="apply" style={{ maxWidth: 600, margin: "0 auto 100px", padding: "0 24px" }}>
        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: "40px 36px" }}>
          {submitted ? (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
              <h3 style={{ fontWeight: 700, fontSize: 22, color: "#fff", margin: "0 0 10px" }}>Application submitted!</h3>
              <p style={{ color: "rgba(230,223,245,0.6)", fontSize: 15, margin: "0 0 28px", lineHeight: 1.6 }}>
                We review every application and respond within 3–5 business days. Check your email.
              </p>
              <Link href="/" style={{ color: "rgba(230,223,245,0.5)", fontSize: 14, textDecoration: "underline" }}>← Back to home</Link>
            </div>
          ) : (
            <>
              <h2 style={{ fontWeight: 700, fontSize: 22, color: "#fff", margin: "0 0 6px" }}>Apply to partner</h2>
              <p style={{ color: "rgba(230,223,245,0.5)", fontSize: 14, margin: "0 0 28px" }}>Takes about 2 minutes. We read every application.</p>

              {error && (
                <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10, padding: "12px 16px", marginBottom: 20, color: "#fca5a5", fontSize: 14 }}>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <label style={labelStyle}>
                    <span style={labelTextStyle}>Name *</span>
                    <input
                      required
                      value={form.name}
                      onChange={e => set("name", e.target.value)}
                      placeholder="Your name"
                      style={inputStyle}
                    />
                  </label>
                  <label style={labelStyle}>
                    <span style={labelTextStyle}>Email *</span>
                    <input
                      required
                      type="email"
                      value={form.email}
                      onChange={e => set("email", e.target.value)}
                      placeholder="you@email.com"
                      style={inputStyle}
                    />
                  </label>
                </div>

                <label style={labelStyle}>
                  <span style={labelTextStyle}>Instagram handle *</span>
                  <input
                    required
                    value={form.instagram_handle}
                    onChange={e => set("instagram_handle", e.target.value)}
                    placeholder="@yourhandle"
                    style={inputStyle}
                  />
                </label>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <label style={labelStyle}>
                    <span style={labelTextStyle}>Follower count</span>
                    <select value={form.follower_count} onChange={e => set("follower_count", e.target.value)} style={inputStyle}>
                      <option value="">Select range</option>
                      {FOLLOWER_RANGES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </label>
                  <label style={labelStyle}>
                    <span style={labelTextStyle}>Content niche</span>
                    <select value={form.content_niche} onChange={e => set("content_niche", e.target.value)} style={inputStyle}>
                      <option value="">Select niche</option>
                      {NICHES.map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </label>
                </div>

                <label style={labelStyle}>
                  <span style={labelTextStyle}>Why do you want to partner? <span style={{ color: "rgba(230,223,245,0.35)" }}>(optional)</span></span>
                  <textarea
                    value={form.message}
                    onChange={e => set("message", e.target.value)}
                    placeholder="Tell us a bit about your audience and why Autom8 might be a fit..."
                    rows={4}
                    style={{ ...inputStyle, resize: "vertical" }}
                  />
                </label>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    background: loading ? "rgba(123,63,242,0.4)" : "linear-gradient(95deg,#f857a6,#7b3ff2)",
                    color: "#fff", fontWeight: 700, fontSize: 15, padding: "13px 20px", borderRadius: 10,
                    border: "none", cursor: loading ? "not-allowed" : "pointer", marginTop: 4,
                    boxShadow: loading ? "none" : "0 0 24px rgba(123,63,242,0.3)",
                    transition: "opacity 0.15s",
                  }}
                >
                  {loading ? "Submitting…" : "Submit Application →"}
                </button>

                <p style={{ fontSize: 12, color: "rgba(230,223,245,0.35)", textAlign: "center", margin: 0 }}>
                  No commitment until a collaboration agreement is signed.
                </p>
              </form>
            </>
          )}
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.07)", padding: "28px 24px", textAlign: "center" }}>
        <p style={{ fontSize: 13, color: "rgba(230,223,245,0.35)", margin: 0 }}>
          © 2026 autom8ig · <a href="https://www.barebrandingsystems.com" target="_blank" rel="noopener" style={{ color: "inherit" }}>Bare Branding Systems</a>
          {" · "}
          <Link href="/privacy" style={{ color: "inherit" }}>Privacy</Link>
          {" · "}
          <Link href="/" style={{ color: "inherit" }}>Home</Link>
        </p>
      </footer>
    </div>
  );
}

const labelStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 6 };
const labelTextStyle: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: "rgba(230,223,245,0.7)" };
const inputStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 10,
  padding: "10px 14px",
  fontSize: 14,
  color: "#e6dff5",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
  fontFamily: "inherit",
};
