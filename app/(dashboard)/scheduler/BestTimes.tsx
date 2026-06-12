"use client";
import { useEffect, useState, useCallback } from "react";
import Card from "@/components/ui/Card";

interface Window { day: string; hour: number; label: string; avgEngagement: number; posts: number; score: number; }
interface PlatformBest { bestWindows: Window[]; sampleSize: number; avgEngagement: number; topWindow: string | null; }
interface ApiResponse { platforms: Record<string, PlatformBest>; totalPosts: number; timezone?: string; }

const PLATFORM: Record<string, { label: string; icon: string; color: string; text: string }> = {
  instagram: { label: "Instagram", icon: "📸", color: "#c026d3", text: "text-fuchsia-400" },
  facebook:  { label: "Facebook",  icon: "👤", color: "#3b82f6", text: "text-blue-400" },
  x:         { label: "X",         icon: "✕",  color: "#a1a1aa", text: "text-zinc-300" },
  youtube:   { label: "YouTube",   icon: "▶",  color: "#ef4444", text: "text-red-400" },
};
const ORDER = ["instagram", "facebook", "x", "youtube"];

function PlatformCard({ platform, data }: { platform: string; data: PlatformBest }) {
  const cfg = PLATFORM[platform] ?? { label: platform, icon: "📊", color: "#888", text: "text-text-muted" };
  return (
    <Card header={
      <div className="flex items-center justify-between gap-2">
        <span className={`text-sm font-bold ${cfg.text}`}>{cfg.icon} {cfg.label}</span>
        <span className="text-[10px] text-text-muted">{data.sampleSize} posts analyzed</span>
      </div>
    }>
      {data.bestWindows.length === 0 ? (
        <p className="text-xs text-text-muted py-4 text-center">Not enough data yet.</p>
      ) : (
        <div className="space-y-2">
          {data.topWindow && (
            <div className="rounded-lg bg-primary/5 border border-primary/15 px-3 py-2 mb-3">
              <p className="text-[10px] text-text-muted uppercase tracking-wider">Top window</p>
              <p className="text-sm font-bold text-primary">{data.topWindow}</p>
            </div>
          )}
          {data.bestWindows.map((w, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-xs font-medium text-text-secondary w-28 shrink-0 truncate">{w.day.slice(0, 3)} · {w.label}</span>
              <div className="flex-1 h-5 bg-surface rounded-lg overflow-hidden">
                <div className="h-full rounded-lg flex items-center px-2 transition-all duration-700"
                  style={{ width: `${Math.max(w.score, 8)}%`, background: i === 0 ? cfg.color : `${cfg.color}55` }}>
                  <span className="text-[10px] text-white font-semibold whitespace-nowrap">{w.posts} post{w.posts !== 1 ? "s" : ""}</span>
                </div>
              </div>
              <span className={`text-xs font-bold w-8 text-right shrink-0 ${i === 0 ? cfg.text : "text-text-muted"}`}>{w.score}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

export default function BestTimes() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/scheduler/best-times");
      setData(await res.json());
    } catch {
      setData({ platforms: {}, totalPosts: 0 });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const platformsWithData = data ? ORDER.filter((p) => data.platforms[p]?.sampleSize > 0) : [];

  return (
    <div className="space-y-6 min-w-0">
      <div className="flex items-end justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-base font-semibold text-text-primary mb-1">Your Best Times to Post</h2>
          <p className="text-xs text-text-muted">
            Computed from your real posting history{data?.totalPosts ? ` (${data.totalPosts} posts)` : ""} — ranked by average engagement, times in ET.
          </p>
        </div>
        <button onClick={load} className="text-xs text-primary border border-primary/30 rounded-lg px-3 py-1.5 hover:bg-primary/5 transition-colors">↻ Refresh</button>
      </div>

      {platformsWithData.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface-elevated p-10 text-center">
          <div className="text-4xl mb-3">📊</div>
          <p className="text-sm font-medium text-text-secondary">Not enough data yet</p>
          <p className="text-xs text-text-muted mt-1 max-w-md mx-auto">
            As your connected platforms collect post analytics, we&apos;ll surface the exact days and hours your content performs best.
          </p>
        </div>
      ) : (
        <>
          <div className="grid md:grid-cols-2 gap-5">
            {platformsWithData.map((p) => <PlatformCard key={p} platform={p} data={data!.platforms[p]} />)}
          </div>
          <div className="rounded-xl border border-border bg-surface-elevated p-4 flex gap-3 items-start">
            <span className="text-xl shrink-0">💡</span>
            <p className="text-xs text-text-secondary leading-relaxed">
              The score is each window&apos;s average engagement relative to your best window. The more you post,
              the sharper these recommendations get — the Smart Scheduler uses this same data to auto-pick posting times.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
