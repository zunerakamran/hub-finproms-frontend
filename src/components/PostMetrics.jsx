function formatCount(value) {
  return Number(value || 0).toLocaleString()
}

/**
 * Renders only metrics present on the post payload.
 * Backend omits reach_count / views_count / buy_count when the user's plan
 * does not allow them — do not default missing values to 0.
 */
export default function PostMetrics({ post, className = 'post-metrics' }) {
  if (!post) {
    return null
  }

  const items = []

  if (post.reach_count != null) {
    items.push(
      <span key="reach" title="Reach">
        {formatCount(post.reach_count)} reach
      </span>,
    )
  }

  if (post.views_count != null) {
    items.push(
      <span key="views" title="Views">
        {formatCount(post.views_count)} views
      </span>,
    )
  }

  if (post.buy_count != null) {
    items.push(
      <span key="buys" title="Buys">
        {formatCount(post.buy_count)} buys
      </span>,
    )
  }

  if (!items.length) {
    return null
  }

  return <div className={className}>{items}</div>
}
