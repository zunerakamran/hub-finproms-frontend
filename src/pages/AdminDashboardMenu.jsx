import { useEffect, useMemo, useState } from 'react'
import { api } from '../api/client'
import { SortableOrderControls, sortableRowDropProps } from '../components/SortableOrderControls'
import { useHub } from '../context/HubContext'
import {
  assignableSectionsFromNav,
  addCustomSeparator,
  DASHBOARD_NAV_DEFAULTS,
  DASHBOARD_NAV_SECTION_FIELDS,
  fillDashboardNavFromSettings,
  isCustomSectionId,
  moveListItem,
  moveListItemToIndex,
  removeCustomSeparator,
} from '../utils/dashboardNav'

export default function AdminDashboardMenu() {
  const { refreshHub, actingHubId } = useHub()
  const [dashboardNav, setDashboardNav] = useState(fillDashboardNavFromSettings)
  const [dashNavTab, setDashNavTab] = useState('sections')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [dragIndex, setDragIndex] = useState(null)

  const setDashNavField = (bucket, key, value) => {
    setDashboardNav((prev) => ({
      ...prev,
      [bucket]: {
        ...(prev[bucket] || {}),
        [key]: value,
      },
    }))
  }

  const sectionOrder = dashboardNav?.section_order || []

  const itemOrder = useMemo(() => {
    const order = dashboardNav?.item_order || Object.keys(DASHBOARD_NAV_DEFAULTS.items)
    return order.filter((path) => path !== '/my-dashboard')
  }, [dashboardNav?.item_order])

  const moveSection = (index, direction) => {
    setDashboardNav((prev) => ({
      ...prev,
      section_order: moveListItem(prev.section_order || [], index, direction),
    }))
  }

  const moveSectionTo = (fromIndex, toIndex) => {
    setDashboardNav((prev) => ({
      ...prev,
      section_order: moveListItemToIndex(prev.section_order || [], fromIndex, toIndex),
    }))
  }

  const moveItemRelative = (index, direction) => {
    setDashboardNav((prev) => {
      const full = [...(prev.item_order || Object.keys(DASHBOARD_NAV_DEFAULTS.items))]
      const editable = full.filter((path) => path !== '/my-dashboard')
      const nextEditable = moveListItem(editable, index, direction)
      return {
        ...prev,
        item_order: mergeEditableItemOrder(full, nextEditable),
      }
    })
  }

  const moveItemTo = (fromIndex, toIndex) => {
    setDashboardNav((prev) => {
      const full = [...(prev.item_order || Object.keys(DASHBOARD_NAV_DEFAULTS.items))]
      const editable = full.filter((path) => path !== '/my-dashboard')
      const nextEditable = moveListItemToIndex(editable, fromIndex, toIndex)
      return {
        ...prev,
        item_order: mergeEditableItemOrder(full, nextEditable),
      }
    })
  }

  const setItemGroup = (path, group) => {
    setDashboardNav((prev) => ({
      ...prev,
      item_groups: {
        ...(prev.item_groups || {}),
        [path]: group,
      },
    }))
  }

  const addSeparator = () => {
    setDashboardNav((prev) => addCustomSeparator(prev, 'New separator'))
    setDashNavTab('order')
  }

  const removeSeparator = (sectionKey) => {
    setDashboardNav((prev) => removeCustomSeparator(prev, sectionKey))
  }

  const assignableSections = assignableSectionsFromNav(dashboardNav)

  const load = async () => {
    setLoading(true)
    setError('')
    setMessage('')
    try {
      const data = await api.adminDashboardNav()
      setDashboardNav(fillDashboardNavFromSettings(data.dashboard_nav))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [actingHubId])

  useEffect(() => {
    setDragIndex(null)
  }, [dashNavTab])

  const onSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const data = await api.updateDashboardNav({ dashboard_nav: dashboardNav })
      setDashboardNav(fillDashboardNavFromSettings(data.dashboard_nav))
      await refreshHub({ silent: true })
      setMessage(data.message || 'Dashboard menu saved.')
    } catch (err) {
      const errors = err.data?.errors || {}
      setError(errors.dashboard_nav?.[0] || err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section>
      <div className="page-head">
        <div>
          <p className="eyebrow">Hub</p>
          <h1>Dashboard menu</h1>
          <p className="muted">
            Rename sidebar separators and menu items, reorder separators, add custom separators,
            and choose which separator each menu item sits under.
          </p>
        </div>
      </div>

      {loading ? (
        <div
          className="dash-panel dash-panel--loading"
          role="status"
          aria-live="polite"
          aria-label="Loading dashboard menu"
        >
          <div className="page-loader__spinner" />
        </div>
      ) : (
        <form className="admin-form settings-form" onSubmit={onSubmit}>
          {error && <div className="alert">{error}</div>}
          {message && <div className="alert success">{message}</div>}

          <div className="settings-block">
            <p className="muted form-hint">
              Hub separator has separate labels for Central / Shared / White-labelled context.
            </p>

            <div className="page-content-tabs" role="tablist" aria-label="Dashboard menu sections">
              <button
                type="button"
                role="tab"
                aria-selected={dashNavTab === 'sections'}
                className={`page-content-tabs__btn${dashNavTab === 'sections' ? ' is-active' : ''}`}
                onClick={() => setDashNavTab('sections')}
              >
                Separators
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={dashNavTab === 'order'}
                className={`page-content-tabs__btn${dashNavTab === 'order' ? ' is-active' : ''}`}
                onClick={() => setDashNavTab('order')}
              >
                Separator order
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={dashNavTab === 'items'}
                className={`page-content-tabs__btn${dashNavTab === 'items' ? ' is-active' : ''}`}
                onClick={() => setDashNavTab('items')}
              >
                Menu items
              </button>
            </div>

            <div className="page-content-fields">
              {dashNavTab === 'sections' ? (
                <>
                  {DASHBOARD_NAV_SECTION_FIELDS.map((field) => (
                    <label key={`section-${field.key}`}>
                      {field.label}
                      <input
                        value={dashboardNav?.sections?.[field.key] ?? ''}
                        onChange={(e) => setDashNavField('sections', field.key, e.target.value)}
                        placeholder={DASHBOARD_NAV_DEFAULTS.sections[field.key] || ''}
                      />
                    </label>
                  ))}
                  {assignableSections
                    .filter((section) => section.custom)
                    .map((section) => (
                      <div key={`custom-section-${section.key}`} className="dash-nav-custom-section">
                        <label>
                          Custom separator
                          <span className="muted form-hint">{section.key}</span>
                          <input
                            value={dashboardNav?.sections?.[section.key] ?? ''}
                            onChange={(e) =>
                              setDashNavField('sections', section.key, e.target.value)
                            }
                            placeholder="Custom section"
                          />
                        </label>
                        <button
                          type="button"
                          className="btn ghost"
                          onClick={() => removeSeparator(section.key)}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  <div className="dash-nav-add-separator">
                    <button type="button" className="btn ghost" onClick={addSeparator}>
                      Add separator
                    </button>
                  </div>
                </>
              ) : null}

              {dashNavTab === 'order' ? (
                <>
                  <p className="muted form-hint dash-nav-reorder-hint">
                    Drag the ⋮⋮ handle to reorder, or type a position number and press Enter to jump.
                  </p>
                  {sectionOrder.map((sectionKey, index) => {
                    const label =
                      dashboardNav?.sections?.[sectionKey] ||
                      DASHBOARD_NAV_DEFAULTS.sections[sectionKey] ||
                      sectionKey
                    const rowDrop = sortableRowDropProps({
                      index,
                      dragIndex,
                      setDragIndex,
                      onReorder: moveSectionTo,
                      disabled: saving,
                    })
                    return (
                      <div
                        key={`order-${sectionKey}`}
                        onDragOver={rowDrop.onDragOver}
                        onDrop={rowDrop.onDrop}
                        className={`dash-nav-order-row ${rowDrop.className}`.trim()}
                      >
                        <div className="dash-nav-order-row__meta">
                          <strong>{label}</strong>
                          <span className="muted form-hint">
                            {sectionKey}
                            {isCustomSectionId(sectionKey) ? ' · custom' : ''}
                          </span>
                        </div>
                        <SortableOrderControls
                          index={index}
                          total={sectionOrder.length}
                          disabled={saving}
                          onMoveRelative={(direction) => moveSection(index, direction)}
                          onMoveToIndex={(toIndex) => moveSectionTo(index, toIndex)}
                          onDragStartIndex={setDragIndex}
                          onDragEnd={() => setDragIndex(null)}
                          extraActions={
                            isCustomSectionId(sectionKey) ? (
                              <button
                                type="button"
                                className="btn ghost"
                                onClick={() => removeSeparator(sectionKey)}
                              >
                                Remove
                              </button>
                            ) : null
                          }
                        />
                      </div>
                    )
                  })}
                </>
              ) : null}

              {dashNavTab === 'items' ? (
                <>
                  <p className="muted form-hint dash-nav-reorder-hint">
                    Drag the ⋮⋮ handle to reorder, or type a position number and press Enter to jump.
                  </p>
                  {itemOrder.map((path, index) => {
                    const defaultLabel = DASHBOARD_NAV_DEFAULTS.items[path] || path
                    const rowDrop = sortableRowDropProps({
                      index,
                      dragIndex,
                      setDragIndex,
                      onReorder: moveItemTo,
                      disabled: saving,
                    })
                    return (
                      <div
                        key={`item-${path}`}
                        onDragOver={rowDrop.onDragOver}
                        onDrop={rowDrop.onDrop}
                        className={`dash-nav-item-row ${rowDrop.className}`.trim()}
                      >
                        <label>
                          {defaultLabel}
                          <span className="muted form-hint">{path}</span>
                          <input
                            value={dashboardNav?.items?.[path] ?? ''}
                            onChange={(e) => setDashNavField('items', path, e.target.value)}
                            placeholder={defaultLabel}
                          />
                        </label>
                        <label>
                          Separator
                          <select
                            value={
                              dashboardNav?.item_groups?.[path] ||
                              DASHBOARD_NAV_DEFAULTS.item_groups[path] ||
                              'account'
                            }
                            onChange={(e) => setItemGroup(path, e.target.value)}
                          >
                            {assignableSections.map((section) => (
                              <option key={section.key} value={section.key}>
                                {section.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <SortableOrderControls
                          index={index}
                          total={itemOrder.length}
                          disabled={saving}
                          onMoveRelative={(direction) => moveItemRelative(index, direction)}
                          onMoveToIndex={(toIndex) => moveItemTo(index, toIndex)}
                          onDragStartIndex={setDragIndex}
                          onDragEnd={() => setDragIndex(null)}
                        />
                      </div>
                    )
                  })}
                </>
              ) : null}
            </div>
          </div>

          <div className="actions sticky-actions">
            <button className="btn primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save dashboard menu'}
            </button>
          </div>
        </form>
      )}
    </section>
  )
}

/** Keep non-editable paths (e.g. Overview) in place while reordering the rest. */
function mergeEditableItemOrder(fullOrder, nextEditable) {
  const editableQueue = [...nextEditable]
  return fullOrder
    .map((path) => {
      if (path === '/my-dashboard') return path
      return editableQueue.shift() ?? path
    })
    .concat(editableQueue)
}
