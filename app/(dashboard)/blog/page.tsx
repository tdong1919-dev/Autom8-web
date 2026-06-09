import Link from "next/link";
import type { Metadata } from "next";
import { getAllPosts, formatDate, readTime } from "@/lib/blog";

export const metadata: Metadata = {
  title: "Blog | Autom8",
  description: "Guides, strategies, and AI automation insights for creators and business owners.",
};

export default function BlogPage() {
  const posts = getAllPosts();

  return (
    <div className="p-5 md:p-7 max-w-4xl mx-auto space-y-8">
      <div>
        <p className="text-xs text-text-muted uppercase tracking-wider mb-1">Resources</p>
        <h1 className="text-3xl font-semibold tracking-tight text-text-primary">Autom8 Blog</h1>
        <p className="text-sm text-text-secondary mt-1">
          High-value guides, growth strategies, and AI automation insights.
        </p>
      </div>

      {posts.length === 0 ? (
        <p className="text-text-muted text-sm">No posts yet — check back soon.</p>
      ) : (
        <>
          {/* Featured */}
          <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-transparent to-accent-purple/5 p-6 md:p-8 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(123,63,242,0.05),transparent_60%)] pointer-events-none" />
            <div className="relative">
              <span className="inline-flex items-center gap-1.5 bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full mb-4">
                ⭐ Latest
              </span>
              <h2 className="text-xl md:text-2xl font-bold text-text-primary mb-3 leading-snug">
                {posts[0].title}
              </h2>
              <p className="text-sm text-text-secondary leading-relaxed mb-5">{posts[0].excerpt}</p>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 text-xs text-text-muted">
                  <span>{formatDate(posts[0].date)}</span>
                  <span>·</span>
                  <span>{readTime(posts[0].excerpt)} read</span>
                </div>
                <Link href={`/blog/${posts[0].slug}`} className="text-sm font-semibold text-primary hover:underline">
                  Read Article →
                </Link>
              </div>
            </div>
          </div>

          {/* Grid */}
          {posts.length > 1 && (
            <div className="grid sm:grid-cols-2 gap-4">
              {posts.slice(1).map((post) => (
                <div key={post.slug} className="flex flex-col p-5 rounded-xl border border-border bg-surface hover:border-primary/20 transition-colors">
                  <h3 className="text-sm font-semibold text-text-primary mb-2 leading-snug flex-1">{post.title}</h3>
                  <p className="text-xs text-text-muted leading-relaxed mb-4">{post.excerpt}</p>
                  <div className="flex items-center justify-between text-xs text-text-muted mt-auto">
                    <span>{formatDate(post.date)} · {readTime(post.excerpt)}</span>
                    <Link href={`/blog/${post.slug}`} className="text-primary hover:underline font-medium">Read →</Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
