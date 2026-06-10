/**
 * YouTube publishing via the Data API v3 resumable upload.
 * Takes a stored refresh token (captured by the one-time connect flow),
 * exchanges it for an access token, then uploads the scheduled video.
 *
 * YouTube is video-only — image posts are rejected.
 */
import type { PublishablePost, PublishResult } from './facebook'

const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const UPLOAD_URL = 'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status'

function parseMediaUrls(mediaUrl: string | null | undefined): string[] {
  if (!mediaUrl) return []
  if (mediaUrl.startsWith('[')) {
    try { return JSON.parse(mediaUrl) } catch { return [mediaUrl] }
  }
  return [mediaUrl]
}

const isVideo = (url: string) => /\.(mp4|mov)$/i.test(url)

async function accessTokenFromRefresh(refreshToken: string): Promise<string> {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID ?? '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })
  const data = await res.json()
  if (!res.ok || !data.access_token) throw new Error(`YouTube token refresh failed: ${JSON.stringify(data)}`)
  return data.access_token
}

export async function publishToYouTube(post: PublishablePost, refreshToken: string): Promise<PublishResult> {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return { ok: false, error: 'Google credentials not configured' }
  }
  if (!refreshToken) return { ok: false, error: 'YouTube not connected (no refresh token)' }

  const urls = parseMediaUrls(post.media_url)
  const videoUrl = urls.find(isVideo)
  if (!videoUrl) return { ok: false, error: 'YouTube requires a video file' }

  try {
    const accessToken = await accessTokenFromRefresh(refreshToken)

    // Pull the video bytes (public Supabase Storage URL).
    const mediaRes = await fetch(videoUrl)
    if (!mediaRes.ok) return { ok: false, error: `video fetch failed (${mediaRes.status})` }
    const buffer = Buffer.from(await mediaRes.arrayBuffer())
    const contentType = mediaRes.headers.get('content-type') ?? 'video/mp4'

    const caption = post.caption ?? ''
    // Title: explicit title, else first line of the caption, else a default.
    const title = (post.title || caption.split('\n')[0] || 'New video').slice(0, 95)

    // 1. Start a resumable session.
    const initRes = await fetch(UPLOAD_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Upload-Content-Type': contentType,
        'X-Upload-Content-Length': String(buffer.length),
      },
      body: JSON.stringify({
        snippet: { title, description: caption },
        status: { privacyStatus: 'public', selfDeclaredMadeForKids: false },
      }),
    })
    if (!initRes.ok) {
      return { ok: false, error: `YouTube init failed: ${await initRes.text()}` }
    }
    const uploadUrl = initRes.headers.get('location')
    if (!uploadUrl) return { ok: false, error: 'YouTube did not return an upload URL' }

    // 2. Upload the bytes.
    const putRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': contentType, 'Content-Length': String(buffer.length) },
      body: buffer,
    })
    const data = await putRes.json().catch(() => ({}))
    if (!putRes.ok) return { ok: false, error: `YouTube upload failed: ${JSON.stringify(data)}` }

    return { ok: true, externalId: data.id }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'youtube publish error' }
  }
}
