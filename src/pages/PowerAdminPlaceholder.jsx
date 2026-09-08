export default function PowerAdminPlaceholder({ title, description }) {
  return (
    <section>
      <div className="page-head">
        <div>
          <p className="eyebrow">Power Admin</p>
          <h1>{title}</h1>
          <p className="muted">{description}</p>
        </div>
      </div>
      <div className="empty-state">
        <h2>Coming soon</h2>
        <p className="muted">This power_admin screen will be built with the white-label foundation.</p>
      </div>
    </section>
  )
}
