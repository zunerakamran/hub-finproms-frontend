/**
 * Resolve which hub logo to show for a UI surface.
 * Dark backgrounds prefer the white logo when one is uploaded; otherwise fall back to the normal logo.
 *
 * @param {{ logo_url?: string|null, white_logo_url?: string|null }|null|undefined} branding
 * @param {{ onDark?: boolean }} [options]
 * @returns {string|null}
 */
export function brandLogoUrl(branding, { onDark = false } = {}) {
  if (!branding) return null
  if (onDark && branding.white_logo_url) {
    return branding.white_logo_url
  }
  return branding.logo_url || null
}
