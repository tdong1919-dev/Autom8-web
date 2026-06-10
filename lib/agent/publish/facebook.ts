/**
 * Facebook Page publishing via the Meta Graph API.
 * Uses the Page access token already stored from the Meta connection.
 * Supports text, single image, video, and multi-photo (carousel) posts.
 */

const GRAPH = 'https://graph.facebook.com/v23.0'

export interface PublishablePost {
  caption?: string | null
  media_url?: string | null
  title?: string | null
}

export interface PublishResult {
  ok: boolean
  error?: string
  externalId?: string
}

function parseMediaUrls(mediaUrl: string | null | undefined): string[] {
  if (!mediaUrl) return []
  if (mediaUrl.startsWith('[')) {
    try { return JSON.parse(mediaUrl) } catch { return [mediaUrl] }
  }
  return [mediaUrl]
}

const isVideo = (url: string) => /\.(mp4|mov)$/i.test(url)

export async function publishToFacebook(
  post: PublishablePost,
  pageId: string,
  pageToken: string
): Promise<PublishResult> {
  const caption = post.caption ?? ''
  const urls = parseMediaUrls(post.media_url)

  try {
    // Text-only post
    if (urls.length === 0) {
      if (!caption.trim()) return { ok: false, error: 'Nothing to post (no caption or media)' }
      const res = await fetch(`${GRAPH}/${pageId}/feed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: caption, access_token: pageToken }),
      })
      const data = await res.json()
      return res.ok ? { ok: true, externalId: data.id } : { ok: false, error: JSON.stringify(data.error ?? data) }
    }

    // Single video
    if (urls.length === 1 && isVideo(urls[0])) {
      const res = await fetch(`${GRAPH}/${pageId}/videos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_url: urls[0], description: caption, access_token: pageToken }),
      })
      const data = await res.json()
      return res.ok ? { ok: true, externalId: data.id } : { ok: false, error: JSON.stringify(data.error ?? data) }
    }

    // Single image
    if (urls.length === 1) {
      const res = await fetch(`${GRAPH}/${pageId}/photos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urls[0], caption, access_token: pageToken }),
      })
      const data = await res.json()
      return res.ok ? { ok: true, externalId: data.id } : { ok: false, error: JSON.stringify(data.error ?? data) }
    }

    // Multi-photo (carousel): upload each as unpublished, then attach to one feed post.
    const mediaFbids: { media_fbid: string }[] = []
    for (const url of urls) {
      const upRes = await fetch(`${GRAPH}/${pageId}/photos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, published: false, access_token: pageToken }),
      })
      const upData = await upRes.json()
      if (!upRes.ok) return { ok: false, error: JSON.stringify(upData.error ?? upData) }
      mediaFbids.push({ media_fbid: upData.id })
    }

    const res = await fetch(`${GRAPH}/${pageId}/feed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: caption, attached_media: mediaFbids, access_token: pageToken }),
    })
    const data = await res.json()
    return res.ok ? { ok: true, externalId: data.id } : { ok: false, error: JSON.stringify(data.error ?? data) }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'facebook publish error' }
  }
}
