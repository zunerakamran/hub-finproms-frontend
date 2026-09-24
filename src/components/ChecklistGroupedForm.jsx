import { checklistToMap, toggleChecklistFlag } from '../utils/checklist'

const GROUP_ORDER = ['behaviour']

/**
 * Render hub Functionalities checklist for Power Admin.
 * Modules are managed separately under Modules (dashboard_manage_modules).
 */
export default function ChecklistGroupedForm({ items, flags, setFlags, onSubmit, saving, submitLabel }) {
  const labelByKey = Object.fromEntries((items || []).map((item) => [item.key, item.label]))

  const groups = GROUP_ORDER.map((group) => ({
    group,
    label: items.find((i) => i.group === group)?.group_label || 'Functionalities',
    items: items.filter((i) => i.group === group),
  })).filter((g) => g.items.length > 0)

  // Append unknown non-module groups only (modules belong on the Modules page).
  const known = new Set([...GROUP_ORDER, 'modules'])
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
            auto-uncheck. Product modules are managed under Modules. User capabilities are
            managed under Capabilities.
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
                      Opposite of {labelByKey[item.exclusive_with] || item.exclusive_with}
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
