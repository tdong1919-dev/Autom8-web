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
    /* pb-24 clears the fixed mobile bottom nav */
    <div className="px-4 py-5 md:px-7 md:py-7 max-w-4xl mx-auto pb-24 md:pb-10 space-y-6">

      {/* Header */}
      <div>
        <p className="text-xs text-text-muted uppercase tracking-wider mb-1">Resources</p>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-text-primary">
          Autom8 Blog
        </h1>
        <p className="text-sm text-text-secondary mt-1 leading-relaxed">
          Guides, growth strategies, and AI automation insights.
        </p>
      </div>

      {posts.length === 0 ? (
        <p className="text-text-muted text-sm">No posts yet — check back soon.</p>
      ) : (
        <>
          {/* Featured post — full card is tappable */}
          <Link
            href={`/blog/${posts[0].slug}`}
            className="block rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-transparent to-accent-purple/5 p-5 md:p-8 relative overflow-hidden active:opacity-80 transition-opacity"
          >
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(123,63,242,0.05),transparent_60%)] pointer-events-none" />
            <div className="relative">
              <span className="inline-flex items-center gap-1.5 bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full mb-3">
                ⭐ Latest
              </span>
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-text-primary mb-2 leading-snug">
                {posts[0].title}
              </h2>
              <p className="text-sm text-text-secondary leading-relaxed mb-4 line-clamp-3">
                {posts[0].excerpt}
              </p>
              {/* Stack on mobile, row on sm+ */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-text-muted flex-wrap">
                  <span>{formatDate(posts[0].date)}</span>
                  <span>·</span>
                  <span>{readTime(posts[0].excerpt)} read</span>
                </div>
                <span className="text-sm font-semibold text-primary">
                  Read Article →
                </span>
              </div>
            </div>
          </Link>

          {/* Post grid — single col on mobile, 2 col on sm+ */}
          {posts.length > 1 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
              {posts.slice(1).map((post) => (
                /* Full card tappable */
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="flex flex-col p-4 md:p-5 rounded-xl border border-border bg-surface hover:border-primary/20 active:opacity-80 transition-all min-h-[140px]"
                >
                  <h3 className="text-sm font-semibold text-text-primary mb-2 leading-snug flex-1 line-clamp-3">
                    {post.title}
                  </h3>
                  <p className="text-xs text-text-muted leading-relaxed mb-3 line-clamp-2">
                    {post.excerpt}
                  </p>
                  <div className="flex items-center justify-between text-xs text-text-muted mt-auto">
                    <span>{formatDate(post.date)}</span>
                    <span className="text-primary font-medium">Read →</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
