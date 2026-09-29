import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'

/**
 * Banner for Admin-staff on submit/edit flows: own caps vs acting as advisor.
 */
export default function ActingAdvisorBanner({ action = 'submissions' }) {
  const { isAdminStaff } = useAuth()
  const { actingAdvisor, roleLabel } = useHub()

  if (!isAdminStaff) return null

  const staffLabel = roleLabel('admin_staff') || 'Admin-staff'
  const advisorLabel = roleLabel('advisor') || 'Advisor'

  if (actingAdvisor) {
    return (
      <p className="muted" style={{ marginBottom: '1rem' }}>
        Working on behalf of <strong>{actingAdvisor.name}</strong>. This {action.slice(0, -1)} will
        be recorded as {staffLabel} on behalf of that {advisorLabel.toLowerCase()}.
      </p>
    )
  }

  return (
    <p className="muted" style={{ marginBottom: '1rem' }}>
      Submitting as {staffLabel} (own Capabilities access). Use <strong>Work on behalf of</strong>{' '}
      in the top bar to attribute {action} to a firm {advisorLabel.toLowerCase()}.
    </p>
  )
}
