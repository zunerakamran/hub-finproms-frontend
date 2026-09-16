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
        {isReel ? (
          <>
            <span className="admin-thumb__play" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                <path d="M8 5v14l11-7L8 5z" />
              </svg>
            </span>
            <span className="admin-thumb__badge">Reel</span>
          </>
        ) : null}
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
          loop
          playsInline
          autoPlay
          preload="metadata"
          aria-label={post?.title || 'Reel preview'}
        />
        <span className="admin-thumb__play" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
            <path d="M8 5v14l11-7L8 5z" />
          </svg>
        </span>
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

  return (
    <div className="admin-thumb-wrap is-empty">
      <div className="admin-thumb fallback" aria-hidden="true">
        <span>No media</span>
      </div>
    </div>
  )
}
