import ReelPlayer from './ReelPlayer'

/**
 * Thumbnail for admin post rows — images use cover; reels use an autoplaying
 * muted preview when a video URL is available (same player as the website).
 */
function isVideoUrl(url) {
  if (!url || typeof url !== 'string') return false
  const clean = url.split('?')[0].split('#')[0].toLowerCase()
  return /\.(mp4|mov|webm|m4v)$/i.test(clean)
}

function isReelPost(post) {
  if (!post) return false
  if (post.is_reel || post.is_video) return true

  const type = String(post.type || post.content_type || '')
    .trim()
    .toLowerCase()
  if (type === 'reel' || type === 'reels') return true

  const mime = String(post.attachment_mime || '').toLowerCase()
  if (mime.startsWith('video/')) return true

  const name = String(post.attachment_name || '').toLowerCase()
  if (/\.(mp4|mov|webm|m4v)$/i.test(name)) return true

  return (
    isVideoUrl(post.cover_url) ||
    isVideoUrl(post.video_url) ||
    isVideoUrl(post.attachment_url)
  )
}

function getReelVideoUrl(post) {
  if (!post) return null
  if (post.video_url) return post.video_url
  if (
    post.attachment_url &&
    (post.is_video || post.is_reel || isVideoUrl(post.attachment_url))
  ) {
    return post.attachment_url
  }
  if (isVideoUrl(post.cover_url)) return post.cover_url
  return null
}

export default function AdminPostThumb({ post }) {
  if (isReelPost(post)) {
    const videoUrl = getReelVideoUrl(post)
    if (videoUrl) {
      return (
        <div className="admin-thumb-wrap is-reel">
          <ReelPlayer src={videoUrl} title={post.title || ''} compact />
        </div>
      )
    }

    if (post?.cover_url && !isVideoUrl(post.cover_url)) {
      return (
        <div className="admin-thumb-wrap is-reel">
          <img className="admin-thumb" src={post.cover_url} alt="" />
        </div>
      )
    }

    return (
      <div className="admin-thumb-wrap is-reel">
        <div className="admin-thumb fallback reel-thumb">Reel</div>
      </div>
    )
  }

  if (post?.cover_url) {
    return (
      <div className="admin-thumb-wrap">
        <img className="admin-thumb" src={post.cover_url} alt="" />
      </div>
    )
  }

  return (
    <div className="admin-thumb-wrap is-empty">
      <div className="admin-thumb fallback" aria-hidden="true">
        <span>No media</span>
      </div>
    </div>
  )
}
