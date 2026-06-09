/**
 * Publisher Agent
 * Replicates: SS F4 Publisher
 *
 * Checks all scheduled posts that are due, routes by platform,
 * publishes to IG Graph API (image, reel, carousel).
 * Multi-tenant: all users processed in one run.
 */

import { createServiceClient } from '@/lib/supabase/service'

interface PublisherResult {
  processed: number
  posted: number
  errors: number
}

export async function runPublisher(): Promise<PublisherResult> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createServiceClient() as any
  let processed = 0, posted = 0, errors = 0

  // Get all due scheduled posts
  const { data: duePosts } = await supabase
    .from('content_queue')
    .select('*, social_accounts(page_token_encrypted, external_account_id)')
    .eq('status', 'scheduled')
    .lte('scheduled_time', new Date().toISOString())
    .order('scheduled_time', { ascending: true })

  if (!duePosts?.length) return { processed: 0, posted: 0, errors: 0 }

  for (const post of duePosts) {
    processed++
    const account = post.social_accounts as { page_token_encrypted: string | null; external_account_id: string | null } | null
    const pageToken = account?.page_token_encrypted
    const igBusinessId = account?.external_account_id

    if (!pageToken || !igBusinessId) {
      errors++
      continue
    }

    try {
      let success = false

      if (post.platform === 'instagram') {
        success = await publishToInstagram(post, igBusinessId, pageToken)
      }
      // Additional platforms can be added here

      if (success) {
        await supabase
          .from('content_queue')
          .update({ status: 'posted', posted_at: new Date().toISOString() })
          .eq('id', post.id)
        posted++
      } else {
        await supabase
          .from('content_queue')
          .update({ status: 'failed' })
          .eq('id', post.id)
        errors++
      }
    } catch {
      errors++
      await supabase
        .from('content_queue')
        .update({ status: 'failed' })
        .eq('id', post.id)
    }
  }

  return { processed, posted, errors }
}

async function publishToInstagram(
  post: Record<string, unknown>,
  igBusinessId: string,
  pageToken: string
): Promise<boolean> {
  const mediaUrl = String(post.media_url ?? '')
  const caption = String(post.caption ?? '')

  // Detect post type from URL
  const isVideo = /\.(mp4|mov)$/i.test(mediaUrl)
  const isCarousel = Array.isArray(post.media_url) || (typeof mediaUrl === 'string' && mediaUrl.startsWith('['))

  if (isCarousel) {
    return publishCarousel(post, igBusinessId, pageToken)
  }

  // Create media container
  const containerBody: Record<string, string> = {
    caption,
    access_token: pageToken,
  }

  if (isVideo) {
    containerBody.media_type = 'REELS'
    containerBody.video_url = mediaUrl
  } else {
    containerBody.image_url = mediaUrl
  }

  const containerRes = await fetch(
    `https://graph.facebook.com/v23.0/${igBusinessId}/media`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(containerBody),
    }
  )

  if (!containerRes.ok) return false
  const { id: creationId } = await containerRes.json()

  // Wait for video processing
  if (isVideo) await sleep(15000)

  // Publish
  const publishRes = await fetch(
    `https://graph.facebook.com/v23.0/${igBusinessId}/media_publish`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creation_id: creationId, access_token: pageToken }),
    }
  )

  return publishRes.ok
}

async function publishCarousel(
  post: Record<string, unknown>,
  igBusinessId: string,
  pageToken: string
): Promise<boolean> {
  let urls: string[]
  try {
    urls = typeof post.media_url === 'string' ? JSON.parse(post.media_url) : (post.media_url as string[])
  } catch {
    return false
  }

  // Create child containers
  const childIds: string[] = []
  for (const url of urls) {
    const isVideo = /\.(mp4|mov)$/i.test(url)
    const body: Record<string, string | boolean> = {
      is_carousel_item: true,
      access_token: pageToken,
    }
    if (isVideo) {
      body.media_type = 'VIDEO'
      body.video_url = url
    } else {
      body.image_url = url
    }

    const res = await fetch(`https://graph.facebook.com/v23.0/${igBusinessId}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) return false
    const { id } = await res.json()
    childIds.push(id)
  }

  // Create carousel container
  const carouselRes = await fetch(`https://graph.facebook.com/v23.0/${igBusinessId}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      media_type: 'CAROUSEL',
      children: childIds.join(','),
      caption: String(post.caption ?? ''),
      access_token: pageToken,
    }),
  })
  if (!carouselRes.ok) return false
  const { id: carouselId } = await carouselRes.json()

  await sleep(15000)

  const publishRes = await fetch(`https://graph.facebook.com/v23.0/${igBusinessId}/media_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ creation_id: carouselId, access_token: pageToken }),
  })

  return publishRes.ok
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
