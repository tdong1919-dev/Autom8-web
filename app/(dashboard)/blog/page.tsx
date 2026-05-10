"use client";

const posts = [
  {
    slug: "how-to-automate-instagram-replies",
    title: "How to Automate Instagram Replies Without Losing Your Brand Voice",
    excerpt: "Learn how AI can respond to comments, DMs, and story mentions 24/7 while sounding exactly like you — driving leads while you sleep.",
    tag: "Strategy",
    date: "May 5, 2026",
    readTime: "5 min",
    cta: true,
  },
  {
    slug: "best-times-to-post-instagram-2026",
    title: "The Best Times to Post on Instagram in 2026 (Data-Backed)",
    excerpt: "Stop guessing. We analyzed millions of posts to find the peak engagement windows for your niche — and how to auto-schedule for maximum reach.",
    tag: "Growth",
    date: "Apr 28, 2026",
    readTime: "7 min",
    cta: true,
  },
  {
    slug: "ai-brand-voice-guide",
    title: "Train Your AI to Sound Like You: A Brand Voice Guide for Creators",
    excerpt: "Your followers can tell when it's not really you. Here's how to train your AI to match your tone, CTAs, and style — perfectly.",
    tag: "AI Tips",
    date: "Apr 18, 2026",
    readTime: "6 min",
    cta: false,
  },
];

export default function BlogPage() {
  return (
    <div className="p-5 md:p-7 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <p className="text-xs text-text-muted uppercase tracking-wider mb-1">Resources</p>
        <h1 className="text-3xl font-semibold tracking-tight text-text-primary">Autom8 Blog</h1>
        <p className="text-sm text-text-secondary mt-1">
          High-value guides, growth strategies, and AI automation tips — built for creators and business owners.
        </p>
      </div>

      {/* Featured Post */}
      <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-transparent to-accent-purple/5 p-6 md:p-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(123,63,242,0.05),transparent_60%)] pointer-events-none" />
        <div className="relative">
          <span className="inline-flex items-center gap-1.5 bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full mb-4">
            ⭐ Featured
          </span>
          <h2 className="text-xl md:text-2xl font-bold text-text-primary mb-3 leading-snug">
            {posts[0].title}
          </h2>
          <p className="text-sm text-text-secondary leading-relaxed mb-5">{posts[0].excerpt}</p>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-xs text-text-muted">
              <span>{posts[0].date}</span>
              <span>·</span>
              <span>{posts[0].readTime} read</span>
            </div>
            <a
              href={`/blog/${posts[0].slug}`}
              className="text-sm font-semibold text-primary hover:underline"
            >
              Read Article →
            </a>
          </div>
        </div>
      </div>

      {/* Post grid */}
      <div className="grid sm:grid-cols-2 gap-4">
        {posts.slice(1).map((post) => (
          <div key={post.slug} className="flex flex-col p-5 rounded-xl border border-border bg-surface hover:border-primary/20 transition-colors">
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary mb-3">{post.tag}</span>
            <h3 className="text-sm font-semibold text-text-primary mb-2 leading-snug flex-1">{post.title}</h3>
            <p className="text-xs text-text-muted leading-relaxed mb-4">{post.excerpt}</p>
            {post.cta && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 mb-4 text-xs text-primary font-medium text-center">
                🚀 Start your free trial today →
              </div>
            )}
            <div className="flex items-center justify-between text-xs text-text-muted mt-auto">
              <span>{post.date} · {post.readTime}</span>
              <a href={`/blog/${post.slug}`} className="text-primary hover:underline font-medium">Read →</a>
            </div>
          </div>
        ))}
      </div>

      {/* How to upload blogs - Admin guide */}
      <div className="rounded-2xl border border-border bg-surface-elevated p-6 space-y-5">
        <div className="flex items-center gap-2">
          <span className="text-xl">📖</span>
          <h2 className="text-base font-semibold text-text-primary">How to Add Blog Posts</h2>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-surface p-4">
            <p className="text-xs font-bold text-primary uppercase tracking-wider mb-2">Method 1 — Manual Upload</p>
            <ol className="space-y-2 text-xs text-text-secondary">
              <li><span className="text-text-muted font-mono">1.</span> Create a new file at <code className="bg-surface-elevated px-1.5 py-0.5 rounded text-primary font-mono">app/(dashboard)/blog/[slug]/page.tsx</code></li>
              <li><span className="text-text-muted font-mono">2.</span> Add your post as a React component with title, content, tags, and CTA blocks</li>
              <li><span className="text-text-muted font-mono">3.</span> Add the post metadata to the <code className="bg-surface-elevated px-1.5 py-0.5 rounded text-primary font-mono">posts</code> array in <code className="bg-surface-elevated px-1.5 py-0.5 rounded text-primary font-mono">app/(dashboard)/blog/page.tsx</code></li>
              <li><span className="text-text-muted font-mono">4.</span> Deploy to Vercel — it auto-publishes</li>
            </ol>
          </div>

          <div className="rounded-xl border border-border bg-surface p-4">
            <p className="text-xs font-bold text-primary uppercase tracking-wider mb-2">Method 2 — AI Auto-Generation (Recommended)</p>
            <ol className="space-y-2 text-xs text-text-secondary">
              <li><span className="text-text-muted font-mono">1.</span> Connect a CMS like <strong className="text-text-primary">Contentful, Sanity, or Notion</strong> as your blog database</li>
              <li><span className="text-text-muted font-mono">2.</span> Set up an n8n workflow: trigger (weekly cron) → GPT-4 generates SEO post → pushes to CMS API</li>
              <li><span className="text-text-muted font-mono">3.</span> Update <code className="bg-surface-elevated px-1.5 py-0.5 rounded text-primary font-mono">blog/page.tsx</code> to fetch from CMS instead of the static <code className="bg-surface-elevated px-1.5 py-0.5 rounded text-primary font-mono">posts</code> array</li>
              <li><span className="text-text-muted font-mono">4.</span> Each post should include: target keyword, H1/H2 structure, 1,000–2,000 words, internal links, and a &quot;Start Free Trial&quot; CTA</li>
            </ol>
          </div>

          <div className="rounded-xl border border-warning/20 bg-warning/5 p-4">
            <p className="text-xs font-bold text-warning uppercase tracking-wider mb-2">SEO Checklist for Every Post</p>
            <div className="grid sm:grid-cols-2 gap-1.5">
              {[
                "Target 1 primary keyword per post",
                "Include keyword in H1, first paragraph, meta description",
                "Add 3–5 internal links to other posts or features",
                "End every post with a CTA: 'Start free trial →'",
                "Include a FAQ section for featured snippets",
                "Add alt text to all images",
                "Aim for 1,200+ words for competitive keywords",
                "Publish consistently (1–2x/week for fastest growth)",
              ].map((item) => (
                <div key={item} className="flex items-start gap-1.5 text-xs text-text-secondary">
                  <span className="text-warning mt-0.5 shrink-0">✓</span>
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
