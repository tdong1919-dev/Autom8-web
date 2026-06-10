/**
 * X (Twitter) publishing via API v2 with OAuth 1.0a user-context signing.
 * Supports text posts and up to 4 images. Video (chunked upload) is not yet
 * supported and fails gracefully so the post is flagged rather than silently lost.
 *
 * Credentials are app-level (Autom8's own account) via env vars for now; the
 * same code path can later read per-user tokens when customers connect their own.
 */
import OAuth from 'oauth-1.0a'
import crypto from 'crypto'
import type { PublishablePost, PublishResult } from './facebook'

const TWEET_URL = 'https://api.twitter.com/2/tweets'
const UPLOAD_URL = 'https://upload.twitter.com/1.1/media/upload.json'
const MAX_LEN = 280

function oauthClient() {
  return new OAuth({
    consumer: { key: process.env.X_API_KEY ?? '', secret: process.env.X_API_SECRET ?? '' },
    signature_method: 'HMAC-SHA1',
    hash_function(base, key) {
      return crypto.createHmac('sha1', key).update(base).digest('base64')
    },
  })
}

const userToken = () => ({
  key: process.env.X_ACCESS_TOKEN ?? '',
  secret: process.env.X_ACCESS_TOKEN_SECRET ?? '',
})

// OAuth1 header for a request with no body params to sign (JSON body / multipart
// bodies are not part of the signature base string — only oauth params are).
function authHeader(url: string, method: string): string {
  const oauth = oauthClient()
  return oauth.toHeader(oauth.authorize({ url, method }, userToken())).Authorization
}

function parseMediaUrls(mediaUrl: string | null | undefined): string[] {
  if (!mediaUrl) return []
  if (mediaUrl.startsWith('[')) {
    try { return JSON.parse(mediaUrl) } catch { return [mediaUrl] }
  }
  return [mediaUrl]
}

const isVideo = (url: string) => /\.(mp4|mov)$/i.test(url)

async function uploadImage(url: string): Promise<string> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`media fetch failed (${res.status})`)
  const mime = res.headers.get('content-type') ?? 'image/jpeg'
  const buffer = Buffer.from(await res.arrayBuffer())

  const form = new FormData()
  form.append('media', new Blob([buffer], { type: mime }))

  const up = await fetch(UPLOAD_URL, {
    method: 'POST',
    headers: { Authorization: authHeader(UPLOAD_URL, 'POST') },
    body: form,
  })
  const data = await up.json()
  if (!up.ok) throw new Error(`X media upload: ${JSON.stringify(data)}`)
  return data.media_id_string
}

export async function publishToX(post: PublishablePost): Promise<PublishResult> {
  if (!process.env.X_API_KEY || !process.env.X_ACCESS_TOKEN) {
    return { ok: false, error: 'X credentials not configured' }
  }

  let text = (post.caption ?? '').trim()
  if (text.length > MAX_LEN) text = text.slice(0, MAX_LEN - 1) + '…'

  const urls = parseMediaUrls(post.media_url)

  try {
    // Video isn't supported yet (needs chunked INIT/APPEND/FINALIZE upload).
    if (urls.some(isVideo)) {
      return { ok: false, error: 'X video posting not yet supported — post videos manually for now' }
    }

    // Upload up to 4 images (X limit).
    const mediaIds: string[] = []
    for (const url of urls.slice(0, 4)) {
      mediaIds.push(await uploadImage(url))
    }

    if (!text && mediaIds.length === 0) {
      return { ok: false, error: 'Nothing to post (no text or media)' }
    }

    const body: Record<string, unknown> = {}
    if (text) body.text = text
    if (mediaIds.length) body.media = { media_ids: mediaIds }

    const res = await fetch(TWEET_URL, {
      method: 'POST',
      headers: {
        Authorization: authHeader(TWEET_URL, 'POST'),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (!res.ok) return { ok: false, error: JSON.stringify(data) }
    return { ok: true, externalId: data.data?.id }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'x publish error' }
  }
}
