/**
 * GET /api/scheduler/best-times
 * Computes the user's actual best posting windows per platform from their
 * platform_analytics history: groups posts by weekday + hour (America/New_York)
 * and ranks by average engagement. Honest about sample size.
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const TZ = 'America/New_York'

function fmtHour(h: number): string {
  const ampm = h < 12 ? 'AM' : 'PM'
  let hr = h % 12
  if (hr === 0) hr = 12
  return `${hr} ${ampm}`
}

interface Row {
  platform: string
  posted_time: string
  engagement_score: number | null
  likes: number | null
  comments: number | null
  shares: number | null
  saves: number | null
  reach: number | null
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!SUPABASE_URL || !SERVICE_KEY) return NextResponse.json({ platforms: {}, totalPosts: 0 })

  const url =
    `${SUPABASE_URL}/rest/v1/platform_analytics` +
    `?select=platform,posted_time,engagement_score,likes,comments,shares,saves,reach` +
    `&user_id=eq.${user.id}&posted_time=not.is.null&platform=not.is.null&limit=10000`

  const res = await fetch(url, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    cache: 'no-store',
  })
  if (!res.ok) return NextResponse.json({ platforms: {}, totalPosts: 0, error: `Supabase ${res.status}` })
  const rows: Row[] = await res.json()

  const dtf = new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'long', hour: 'numeric', hour12: false })

  type Bucket = { sum: number; count: number }
  const agg: Record<string, { buckets: Record<string, Bucket>; posts: number; totalEng: number }> = {}

  for (const r of rows) {
    const d = new Date(r.posted_time)
    if (isNaN(d.getTime())) continue
    const eng = (r.engagement_score && r.engagement_score > 0)
      ? r.engagement_score
      : (r.likes ?? 0) + (r.comments ?? 0) + (r.shares ?? 0) + (r.saves ?? 0)

    const parts = dtf.formatToParts(d)
    const weekday = parts.find((p) => p.type === 'weekday')?.value ?? ''
    let hour = parseInt(parts.find((p) => p.type === 'hour')?.value ?? '0', 10)
    if (hour === 24) hour = 0
    if (!weekday) continue

    const platform = (agg[r.platform] ??= { buckets: {}, posts: 0, totalEng: 0 })
    const key = `${weekday}|${hour}`
    const b = (platform.buckets[key] ??= { sum: 0, count: 0 })
    b.sum += eng
    b.count += 1
    platform.posts += 1
    platform.totalEng += eng
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const platforms: Record<string, any> = {}
  for (const [plat, info] of Object.entries(agg)) {
    const windows = Object.entries(info.buckets).map(([key, b]) => {
      const [day, hourStr] = key.split('|')
      const hour = parseInt(hourStr, 10)
      return { day, hour, label: fmtHour(hour), avgEngagement: Math.round((b.sum / b.count) * 10) / 10, posts: b.count }
    })
    const maxAvg = Math.max(...windows.map((w) => w.avgEngagement), 1)
    const ranked = windows
      .map((w) => ({ ...w, score: Math.round((w.avgEngagement / maxAvg) * 100) }))
      .sort((a, b) => b.avgEngagement - a.avgEngagement || b.posts - a.posts)
      .slice(0, 8)

    platforms[plat] = {
      bestWindows: ranked,
      sampleSize: info.posts,
      avgEngagement: Math.round((info.totalEng / info.posts) * 10) / 10,
      topWindow: ranked[0] ? `${ranked[0].day} · ${ranked[0].label}` : null,
    }
  }

  return NextResponse.json({ platforms, totalPosts: rows.length, timezone: TZ })
}
