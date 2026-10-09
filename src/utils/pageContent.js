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
    hint: 'Hero plus Categories (4 per row), Website templates (3 per row), Tickets, Documents, Features, and footer copy.',
    fields: [
      { key: 'title', label: 'Hero — Heading', multiline: true, hint: 'Use *word* for italic emphasis.' },
      { key: 'lead', label: 'Hero — Lead paragraph', multiline: true, hint: 'Use **word** for bold.' },
      { key: 'cta_browse_posts', label: 'Hero — Button Browse posts' },
      { key: 'cta_browse_reels', label: 'Hero — Button Browse reels' },
      { key: 'cta_get_started', label: 'Hero — Button Get started (guest)' },
      { key: 'cta_log_in', label: 'Hero — Button Log in (guest)' },
      { key: 'guest_hint', label: 'Hero — Guest hint under buttons', multiline: true },
      { key: 'catalog_disabled', label: 'Hero — Catalog disabled message', multiline: true },
      { key: 'empty_posts', label: 'Hero — Empty showcase message', multiline: true },
      { key: 'categories_title', label: 'Categories — Title' },
      { key: 'categories_lead', label: 'Categories — Lead', multiline: true },
      { key: 'categories_empty', label: 'Categories — Empty message', multiline: true },
      { key: 'categories_view_all', label: 'Categories — View all link' },
      { key: 'templates_title', label: 'Website templates — Title' },
      { key: 'templates_lead', label: 'Website templates — Lead', multiline: true },
      { key: 'templates_empty', label: 'Website templates — Empty message', multiline: true },
      { key: 'templates_cta', label: 'Website templates — Card button' },
      { key: 'templates_view_all', label: 'Website templates — View all' },
      { key: 'tickets_title', label: 'Tickets — Title' },
      { key: 'tickets_lead', label: 'Tickets — Lead', multiline: true },
      { key: 'tickets_tab_overview', label: 'Tickets — Tab: Tickets' },
      { key: 'tickets_tab_mine', label: 'Tickets — Tab: My tickets' },
      { key: 'tickets_tab_raise', label: 'Tickets — Tab: Raise a ticket' },
      { key: 'tickets_overview_body', label: 'Tickets — Overview body', multiline: true },
      { key: 'tickets_status_open', label: 'Tickets — Status Open' },
      { key: 'tickets_status_progress', label: 'Tickets — Status In progress' },
      { key: 'tickets_status_completed', label: 'Tickets — Status Completed' },
      { key: 'tickets_browse', label: 'Tickets — Browse button' },
      { key: 'tickets_raise_cta', label: 'Tickets — Raise button' },
      { key: 'tickets_raise_body', label: 'Tickets — Raise body', multiline: true },
      { key: 'tickets_empty', label: 'Tickets — Empty message', multiline: true },
      { key: 'tickets_guest_hint', label: 'Tickets — Guest hint', multiline: true },
      { key: 'tickets_disabled', label: 'Tickets — Module disabled message', multiline: true },
      { key: 'documents_title', label: 'Documents — Title', multiline: true },
      { key: 'documents_lead', label: 'Documents — Lead (above category counts)', multiline: true },
      { key: 'documents_body', label: 'Documents — Guest / empty body', multiline: true },
      { key: 'documents_cta', label: 'Documents — CTA button' },
      { key: 'documents_panel_badge', label: 'Documents — Panel badge', hint: 'Use {count} for total documents.' },
      { key: 'documents_panel_title', label: 'Documents — Panel title' },
      { key: 'documents_panel_subtitle', label: 'Documents — Panel subtitle' },
      { key: 'documents_image_1', label: 'Documents — Fallback image 1', hint: 'Used in the stack when no document previews exist.' },
      { key: 'documents_image_2', label: 'Documents — Fallback image 2' },
      { key: 'documents_image_3', label: 'Documents — Fallback image 3' },
      { key: 'documents_disabled', label: 'Documents — Module disabled message', multiline: true },
      { key: 'features_title', label: 'Features — Section title' },
      { key: 'features_lead', label: 'Features — Section lead', multiline: true },
      { key: 'features_card1_title', label: 'Features — Card 1 title (SM Templates)' },
      { key: 'features_card1_text', label: 'Features — Card 1 text', multiline: true },
      { key: 'features_card1_url', label: 'Features — Card 1 link', hint: 'e.g. /my-dashboard/social-media-compliance' },
      { key: 'features_card2_title', label: 'Features — Card 2 title (Canva editing)' },
      { key: 'features_card2_text', label: 'Features — Card 2 text', multiline: true },
      { key: 'features_card2_url', label: 'Features — Card 2 link', hint: 'e.g. /posts?type=post' },
      { key: 'features_card3_title', label: 'Features — Card 3 title (Website Compliance)' },
      { key: 'features_card3_text', label: 'Features — Card 3 text', multiline: true },
      { key: 'features_card3_url', label: 'Features — Card 3 link', hint: 'e.g. /my-dashboard/website-compliance/request-site' },
      { key: 'features_card4_title', label: 'Features — Card 4 title (Generic Compliance)' },
      { key: 'features_card4_text', label: 'Features — Card 4 text', multiline: true },
      { key: 'features_card4_url', label: 'Features — Card 4 link', hint: 'e.g. /my-dashboard/general-compliance' },
      {
        key: 'nav_tagline',
        label: 'Navbar — Tagline',
        hint: 'Small line under the hub name in the public header. Leave blank to hide.',
      },
      { key: 'footer_tagline', label: 'Footer — Tagline' },
      { key: 'footer_copyright', label: 'Footer — Copyright', hint: 'Use {year} and {brand}.' },
      { key: 'footer_powered_by_name', label: 'Footer — Powered by name', hint: 'Shown after “Powered by”.' },
      {
        key: 'footer_powered_by_logo',
        label: 'Footer — Powered by logo',
        type: 'image',
        hint: 'Upload an image shown next to the Powered by name (PNG, JPG, GIF, or WebP, max 5MB).',
      },
      {
        key: 'footer_powered_by_url',
        label: 'Footer — Powered by URL',
        hint: 'Opens in a new tab when the Powered by line is clicked.',
      },
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
