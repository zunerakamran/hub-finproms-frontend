export function sectionDisplayName(section) {
  if (!section) return 'Section'
  return section.display_name || section.name || 'Section'
}

export function sectionTemplateKey(section) {
  if (!section) return ''
  if (typeof section === 'string') return section
  return section.section_key || section.name || ''
}

export function isSectionVisible(section) {
  if (!section) return true
  return section.is_visible !== false
}
