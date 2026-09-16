/**
 * Thumbnail for admin post rows — images use cover; reels use a muted video
 * preview (never <img> of an mp4, which renders blank).
 */
export default function AdminPostThumb({ post }) {
  const isReel = Boolean(post?.is_reel || post?.is_video)
  const videoUrl =
    post?.video_url || (post?.is_video ? post?.attachment_url : null) || null

  if (post?.cover_url) {
    return (
      <div className={`admin-thumb-wrap ${isReel ? 'is-reel' : ''}`.trim()}>
        <img className="admin-thumb" src={post.cover_url} alt="" />
        {isReel ? <span className="admin-thumb__badge">Reel</span> : null}
      </div>
    )
  }

  if (isReel && videoUrl) {
    return (
      <div className="admin-thumb-wrap is-reel">
        <video
          className="admin-thumb admin-thumb--video"
          src={videoUrl}
          muted
          playsInline
          preload="metadata"
          aria-label={post?.title || 'Reel preview'}
        />
        <span className="admin-thumb__badge">Reel</span>
      </div>
    )
  }

  if (isReel) {
    return (
      <div className="admin-thumb-wrap is-reel">
        <div className="admin-thumb fallback reel-thumb">Reel</div>
      </div>
    )
  }

  return <div className="admin-thumb fallback" aria-hidden="true" />
}
