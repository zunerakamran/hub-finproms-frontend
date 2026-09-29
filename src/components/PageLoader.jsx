/**
 * Minimal full-screen loader while APIs settle.
 */
export default function PageLoader() {
  return (
    <div className="page-loader" role="status" aria-live="polite" aria-busy="true" aria-label="Loading">
      <div className="page-loader__spinner" />
    </div>
  )
}
