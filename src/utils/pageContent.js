/**
 * Hub public-site copy helpers.
 * Markup: *italic* and **bold**. Placeholders: {credits}, {date}, {count}, {brand}.
 */

export function pageText(pageContent, section, key, fallback = '') {
  const value = pageContent?.[section]?.[key]
  if (value == null || value === '') return fallback
  return String(value)
}

export function fillPageText(text, vars = {}) {
  let out = String(text ?? '')
  for (const [key, value] of Object.entries(vars)) {
    out = out.split(`{${key}}`).join(String(value ?? ''))
  }
  return out
}

export function formatPageHtml(text, vars = {}) {
  const filled = fillPageText(text, vars)
  const escaped = filled
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  return escaped
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
}

/** Field definitions for the Settings editor (label + hint). */
export const PAGE_CONTENT_FIELDS = {
  home: {
    label: 'Home page',
    fields: [
      { key: 'title', label: 'Heading', multiline: true, hint: 'Use *word* for italic emphasis.' },
      { key: 'lead', label: 'Lead paragraph', multiline: true, hint: 'Use **word** for bold.' },
      { key: 'cta_browse_posts', label: 'Button — Browse posts' },
      { key: 'cta_browse_reels', label: 'Button — Browse reels' },
      { key: 'cta_get_started', label: 'Button — Get started (guest)' },
      { key: 'cta_log_in', label: 'Button — Log in (guest)' },
      { key: 'guest_hint', label: 'Guest hint under buttons', multiline: true },
      { key: 'catalog_disabled', label: 'Catalog disabled message', multiline: true },
      { key: 'empty_posts', label: 'Empty showcase message', multiline: true },
    ],
  },
  catalog: {
    label: 'Posts / Reels page',
    hint: 'Posts and Reels share this page (?type=post|reel). Separate titles/leads where noted.',
    fields: [
      { key: 'eyebrow', label: 'Eyebrow' },
      { key: 'title_posts', label: 'Heading (posts)' },
      { key: 'title_reels', label: 'Heading (reels)' },
      { key: 'lead_posts', label: 'Lead (posts)', multiline: true },
      { key: 'lead_reels', label: 'Lead (reels)', multiline: true },
      { key: 'balance_label', label: 'Balance label' },
      { key: 'credits_available', label: 'Credits available label' },
      { key: 'top_up', label: 'Top up button' },
      { key: 'guest_cta_register', label: 'Guest CTA (registration open)', multiline: true },
      { key: 'guest_cta_invite', label: 'Guest CTA (invite-only)', multiline: true },
      { key: 'sign_up', label: 'Sign up button' },
      { key: 'sign_in', label: 'Sign in button' },
      { key: 'lock_title', label: 'Locked banner title' },
      { key: 'lock_body', label: 'Locked banner body', multiline: true },
      { key: 'login', label: 'Login button' },
      { key: 'search_posts', label: 'Search placeholder (posts)' },
      { key: 'search_reels', label: 'Search placeholder (reels)' },
      { key: 'search_button', label: 'Search button' },
      { key: 'category_label', label: 'Category filter label' },
      { key: 'all_categories', label: 'All categories option' },
      { key: 'tag_label', label: 'Tag filter label' },
      { key: 'all_tags', label: 'All tags option' },
      { key: 'clear_all', label: 'Clear all filters' },
      { key: 'reset_filters', label: 'Reset filters button' },
      { key: 'empty_title_posts', label: 'Empty title (posts)' },
      { key: 'empty_title_reels', label: 'Empty title (reels)' },
      { key: 'empty_filtered', label: 'Empty body (with filters)', multiline: true },
      { key: 'empty_body_posts', label: 'Empty body (posts)', multiline: true },
      { key: 'empty_body_reels', label: 'Empty body (reels)', multiline: true },
      { key: 'catalog_unavailable_title', label: 'Catalog unavailable title' },
      { key: 'catalog_unavailable_body', label: 'Catalog unavailable body', multiline: true },
      { key: 'finding_posts', label: 'Loading label (posts)' },
      { key: 'finding_reels', label: 'Loading label (reels)' },
      { key: 'no_match_posts', label: 'No match (posts)' },
      { key: 'no_match_reels', label: 'No match (reels)' },
      { key: 'results_posts', label: 'Results (posts plural)', hint: 'Use {count}' },
      { key: 'results_post', label: 'Results (post singular)', hint: 'Use {count}' },
      { key: 'results_reels', label: 'Results (reels plural)', hint: 'Use {count}' },
      { key: 'results_reel', label: 'Results (reel singular)', hint: 'Use {count}' },
      { key: 'locked_excerpt', label: 'Locked card excerpt', multiline: true },
      { key: 'login_to_unlock', label: 'Card link — login to unlock' },
      { key: 'view_post', label: 'Card link — view post' },
      { key: 'play_reel', label: 'Card link — play reel' },
      { key: 'buy_post', label: 'Card link — buy post' },
      { key: 'buy_reel', label: 'Card link — buy reel' },
      { key: 'badge_owned', label: 'Badge — Owned' },
      { key: 'badge_locked', label: 'Badge — Locked' },
      { key: 'badge_available', label: 'Badge — Available' },
      { key: 'reel_label', label: 'Reel label' },
      { key: 'no_description', label: 'No description fallback' },
    ],
  },
  post_detail: {
    label: 'Post / Reel detail page',
    fields: [
      { key: 'back_posts', label: 'Back link (posts)' },
      { key: 'back_reels', label: 'Back link (reels)' },
      { key: 'login_required', label: 'Locked — kicker' },
      { key: 'locked_lead', label: 'Locked — lead', multiline: true },
      { key: 'step1_title', label: 'Locked step 1 title' },
      { key: 'step1_body', label: 'Locked step 1 body', multiline: true },
      { key: 'step2_title', label: 'Locked step 2 title' },
      { key: 'step2_body', label: 'Locked step 2 body', multiline: true },
      { key: 'step3_title', label: 'Locked step 3 title' },
      { key: 'step3_body', label: 'Locked step 3 body', multiline: true, hint: 'Use {credits}' },
      { key: 'login', label: 'Login button' },
      { key: 'sign_up', label: 'Sign up button' },
      { key: 'last_updated', label: 'Last updated label', hint: 'Use {date}' },
      { key: 'no_description', label: 'Empty description' },
      { key: 'unlocked', label: 'Unlocked badge' },
      { key: 'download', label: 'Preview button' },
      { key: 'no_attachment', label: 'No attachment message', multiline: true },
      { key: 'downloads_disabled', label: 'Preview disabled message', multiline: true },
      { key: 'edit_canva', label: 'Edit with Canva button' },
      { key: 'buy_intro', label: 'Buy intro', multiline: true, hint: 'Use {credits}' },
      { key: 'no_subscription_note', label: 'No subscription note' },
      { key: 'your_balance', label: 'Your balance label' },
      { key: 'unlimited', label: 'Unlimited balance label' },
      { key: 'credits_suffix', label: 'Credits suffix' },
      { key: 'buy_with_credits', label: 'Buy with credits button' },
      { key: 'purchasing', label: 'Purchasing… button' },
      { key: 'get_more_credits', label: 'Get more credits button' },
      { key: 'or_pay_directly', label: 'Or pay directly label', multiline: true },
      { key: 'pay_stripe', label: 'Pay with Stripe button' },
      { key: 'pay_bank', label: 'Pay by bank transfer button' },
      { key: 'stripe_unavailable', label: 'Stripe unavailable button' },
      { key: 'bank_unavailable', label: 'Bank transfer unavailable button' },
      { key: 'redirecting_stripe', label: 'Redirecting to Stripe…' },
      { key: 'processing', label: 'Processing…' },
      { key: 'purchasing_disabled', label: 'Purchasing disabled message', multiline: true },
      { key: 'loading', label: 'Loading label' },
    ],
  },
}
