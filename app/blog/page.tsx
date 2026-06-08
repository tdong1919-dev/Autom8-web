import Link from "next/link";
import type { Metadata } from "next";
import { getAllPosts, formatDate, readTime } from "@/lib/blog";

export const metadata: Metadata = {
  title: "Blog — AI Automation Insights | Autom8",
  description:
    "Practical insights on AI automation, Instagram growth, workflow systems, and building operations that scale.",
  openGraph: {
    title: "Blog — AI Automation Insights | Autom8",
    description:
      "Practical insights on AI automation, Instagram growth, workflow systems, and building operations that scale.",
    url: "https://autom8ig.io/blog",
    siteName: "Autom8",
    type: "website",
  },
};

export default function BlogPage() {
  const posts = getAllPosts();

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Header */}
      <div className="border-b border-[#262626]">
        <div className="max-w-4xl mx-auto px-6 py-6 flex items-center justify-between">
          <Link href="/" className="text-white font-semibold text-lg tracking-tight">
            Autom8
          </Link>
          <Link
            href="/login"
            className="text-sm text-[#A1A1AA] hover:text-white transition-colors"
          >
            Sign in →
          </Link>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-6 py-20">
        {/* Hero */}
        <div className="mb-16">
          <span className="inline-block text-xs font-mono tracking-widest text-[#7b3ff2] uppercase mb-4">
            Insights
          </span>
          <h1 className="text-5xl font-bold text-white tracking-tight mb-4">
            The Autom8 Blog
          </h1>
          <p className="text-[#A1A1AA] text-lg max-w-xl leading-relaxed">
            Practical thinking on AI automation, Instagram growth, workflow
            systems, and the operations that let founders scale without burning
            out.
          </p>
        </div>

        {/* Posts */}
        {posts.length === 0 ? (
          <p className="text-[#6B7280]">No posts yet — check back soon.</p>
        ) : (
          <div className="space-y-px">
            {posts.map((post, i) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="group block border border-[#262626] rounded-xl p-7 bg-[#121212] hover:border-[#7b3ff2]/50 hover:bg-[#1A1A1A] transition-all duration-200"
              >
                <div className="flex items-start justify-between gap-6">
                  <div className="flex-1 min-w-0">
                    {i === 0 && (
                      <span className="inline-block text-xs font-mono tracking-widest text-[#f857a6] uppercase mb-3">
                        Latest
                      </span>
                    )}
                    <h2 className="text-xl font-semibold text-white group-hover:text-[#7b3ff2] transition-colors leading-snug mb-3">
                      {post.title}
                    </h2>
                    <p className="text-[#A1A1AA] text-sm leading-relaxed line-clamp-2 mb-4">
                      {post.excerpt}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-[#6B7280] font-mono">
                      <span>{formatDate(post.date)}</span>
                      <span>·</span>
                      <span>{readTime(post.excerpt)}</span>
                    </div>
                  </div>
                  <span className="text-[#6B7280] group-hover:text-[#7b3ff2] group-hover:translate-x-1 transition-all text-xl mt-1 shrink-0">
                    →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#262626] mt-24">
        <div className="max-w-4xl mx-auto px-6 py-8 flex items-center justify-between text-sm text-[#6B7280]">
          <span>© {new Date().getFullYear()} Autom8. All rights reserved.</span>
          <Link href="/" className="hover:text-white transition-colors">
            autom8ig.io
          </Link>
        </div>
      </footer>
    </div>
  );
}
