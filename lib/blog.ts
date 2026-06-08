import fs from "fs";
import path from "path";

export interface PostMeta {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  draft: boolean;
}

export interface Post extends PostMeta {
  content: string;
}

const BLOG_DIR = path.join(process.cwd(), "blog");

function parseFrontmatter(raw: string): { data: Record<string, string>; content: string } {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return { data: {}, content: raw };
  const data: Record<string, string> = {};
  for (const line of match[1].split("\n")) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const val = line.slice(idx + 1).trim().replace(/^["\']|["\']$/g, "");
    data[key] = val;
  }
  return { data, content: match[2].trim() };
}

export function getAllPosts(): PostMeta[] {
  try {
    if (!fs.existsSync(BLOG_DIR)) return [];
    const files = fs.readdirSync(BLOG_DIR).filter((f) => f.endsWith(".md"));
    return files
      .map((filename) => {
        const slug = filename.replace(/\.md$/, "");
        const raw = fs.readFileSync(path.join(BLOG_DIR, filename), "utf-8");
        const { data } = parseFrontmatter(raw);
        return {
          slug,
          title: data.title || slug,
          date: data.date || "",
          excerpt: data.excerpt || "",
          draft: data.draft === "true",
        };
      })
      .filter((p) => !p.draft)
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  } catch {
    return [];
  }
}

export function getPostBySlug(slug: string): Post | null {
  try {
    const filePath = path.join(BLOG_DIR, `${slug}.md`);
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, "utf-8");
    const { data, content } = parseFrontmatter(raw);
    return {
      slug,
      title: data.title || slug,
      date: data.date || "",
      excerpt: data.excerpt || "",
      draft: data.draft === "true",
      content,
    };
  } catch {
    return null;
  }
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  } catch {
    return dateStr;
  }
}

export function readTime(content: string): string {
  const words = content.split(/\s+/).length;
  const mins = Math.max(1, Math.round(words / 200));
  return `${mins} min read`;
}
