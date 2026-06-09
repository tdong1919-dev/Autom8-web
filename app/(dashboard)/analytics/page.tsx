"use client";
import { useState, useEffect } from "react";
import Card from "@/components/ui/Card";
import ProgressBar from "@/components/ui/ProgressBar";
import Button from "@/components/ui/Button";
import Link from "next/link";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

export default function AnalyticsPage() {
  const [refreshing, setRefreshing] = useState(false);
  const [usage, setUsage] = useState({ repliesUsed: 0, limit: 250, periodStart: "", periodEnd: "", dailyCounts: [] as number[] });

  const fetchUsage = () => {
    fetch("/api/usage")
      .then(r => r.json())
      .then(json => {
        // Support both { data: { used, limit, ... } } and flat { used, limit, ... }
        const d = json.data ?? json;
        if (d.used !== undefined) {
          setUsage({
            repliesUsed: d.used,
            limit: d.limit,
            periodStart: d.billingPeriodStart ? new Date(d.billingPeriodStart).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "",
            periodEnd: d.billingPeriodEnd ? new Date(d.billingPeriodEnd).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "",
            dailyCounts: d.dailyCounts ?? [],
          });
        }
      })
      .catch(() => {});
  };

  useEffect(() => { fetchUsage(); }, []);

  const chartData = usage.dailyCounts.map((count: number, i: number) => ({ day: i + 1, replies: count }));
  const pct = usage.limit > 0 ? Math.round((usage.repliesUsed / usage.limit) * 100) : 0;

  const handleRefresh = async () => {
    setRefreshing(true);
    fetchUsage();
    await new Promise((r) => setTimeout(r, 800));
    setRefreshing(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Usage Analytics</h1>
        <Button size="sm" variant="ghost" onClick={handleRefresh} loading={refreshing}>
          ↻ Refresh
        </Button>
      </div>

      {/* Period */}
      <p className="text-sm text-white/40">
        Billing period: <span className="text-white/70">{usage.periodStart || "—"}</span>{" "}→{" "}
        <span className="text-white/70">{usage.periodEnd || "—"}</span>
      </p>

      {/* Warning banners */}
      {pct >= 100 && (
        <div className="bg-brand-pink/10 border border-brand-pink/20 text-brand-pink rounded-xl px-5 py-4 text-sm">
          🚫 You&apos;ve reached your reply limit. <Link href="/billing" className="underline font-semibold">Upgrade your plan</Link> to continue.
        </div>
      )}
      {pct >= 80 && pct < 100 && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 rounded-xl px-5 py-4 text-sm">
          ⚠️ You&apos;ve used {pct}% of your replies. <Link href="/billing" className="underline font-semibold">Upgrade now</Link> to avoid interruptions.
        </div>
      )}

      {/* Usage stat */}
      <Card>
        <div className="space-y-3">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Replies Used</p>
              <div className="flex items-end gap-2">
                <span className="text-4xl font-bold text-neon">{usage.repliesUsed}</span>
                <span className="text-white/40 text-lg mb-0.5">/ {usage.limit}</span>
              </div>
            </div>
            <span className={`text-2xl font-bold ${pct >= 80 ? "text-brand-pink" : pct >= 60 ? "text-yellow-400" : "text-neon"}`}>
              {pct}%
            </span>
          </div>
          <ProgressBar value={pct} showLabel={false} />
        </div>
      </Card>

      {/* Chart */}
      <Card header={<h2 className="font-semibold text-sm text-white/70">Daily Replies — Last 30 Days</h2>}>
        <div className="h-52">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barSize={14}>
                <XAxis
                  dataKey="day"
                  tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{ background: "#242424", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff", fontSize: 12 }}
                  cursor={{ fill: "rgba(255,255,255,0.03)" }}
                />
                <Bar dataKey="replies" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.replies > 20 ? "#833ab4" : "#833ab466"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-white/30">No usage data yet</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
