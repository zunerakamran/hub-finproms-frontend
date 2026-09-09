import { checklistToMap, toggleChecklistFlag } from '../utils/checklist'

const GROUP_ORDER = ['behaviour']

/**
 * Render hub Functionalities checklist for Power Admin.
 */
export default function ChecklistGroupedForm({ items, flags, setFlags, onSubmit, saving, submitLabel }) {
  const groups = GROUP_ORDER.map((group) => ({
    group,
    label: items.find((i) => i.group === group)?.group_label || 'Functionalities',
    items: items.filter((i) => i.group === group),
  })).filter((g) => g.items.length > 0)

  // Any unknown groups appended (should not appear after Functionalities-only API)
  const known = new Set(GROUP_ORDER)
  const extraGroups = []
  for (const item of items) {
    if (!known.has(item.group) && !extraGroups.find((g) => g.group === item.group)) {
      extraGroups.push({
        group: item.group,
        label: item.group_label || item.group,
        items: items.filter((i) => i.group === item.group),
      })
    }
  }

  const allGroups = [...groups, ...extraGroups]

  return (
    <form className="admin-form checklist-form" onSubmit={onSubmit}>
      {allGroups.map((section) => (
        <div key={section.group} className="checklist-section">
          <h2>{section.label}</h2>
          <p className="muted checklist-section-hint">
            How this hub works (access, credits, content distribution). Opposite options
            auto-uncheck. User capabilities are managed under Capabilities.
          </p>
          <div className="checklist-grid">
            {section.items.map((item) => (
              <label key={item.key} className="checklist-item">
                <input
                  type="checkbox"
                  checked={Boolean(flags[item.key])}
                  onChange={(e) =>
                    setFlags((prev) =>
                      toggleChecklistFlag(prev, item.key, e.target.checked, item.exclusive_with)
                    )
                  }
                />
                <span>
                  <strong>{item.label}</strong>
                  <small className="muted">{item.description}</small>
                  {item.exclusive_with && (
                    <small className="muted exclusive-hint">
                      Opposite of <code>{item.exclusive_with}</code>
                    </small>
                  )}
                </span>
              </label>
            ))}
          </div>
        </div>
      ))}

      <div className="actions">
        <button className="btn primary" disabled={saving}>
          {saving ? 'Saving...' : submitLabel || 'Save checklist'}
        </button>
      </div>
    </form>
  )
}

export { checklistToMap }
