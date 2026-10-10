/**
 * Build a live deploy-wiring preview from saved hub + in-progress form meta.
 */
export function buildDeployPreview(hub, meta) {
  const slug = hub?.deploy?.hub_slug_env || hub?.slug || ''
  const frontend = (meta?.frontend_url || '').trim()
  const api = (meta?.api_url || '').trim()
  const notes = (meta?.deploy_notes || '').trim()
  const isActive = Boolean(meta?.is_active)
  const isCentral = hub?.type === 'central' || hub?.is_central
  const needsRemoteDb = !isCentral // Shared + White-label need remote DB on Central registry
  const dbHost = (meta?.db_host || '').trim()
  const dbDatabase = (meta?.db_database || '').trim()
  const dbUsername = (meta?.db_username || '').trim()
  const dbPassword = (meta?.db_password || '').trim()
  const passwordSet = Boolean(hub?.deploy?.database?.password_set) || Boolean(dbPassword)
  const hasDb = Boolean(dbHost && dbDatabase && dbUsername && passwordSet)
  const ready = isActive && Boolean(frontend) && (!needsRemoteDb || hasDb)
  const driver = (meta?.db_driver || hub?.deploy?.database?.driver || 'mysql').trim() || 'mysql'
  const port = meta?.db_port ? String(meta.db_port).trim() : hub?.deploy?.database?.port || 3306
  const typeLabel = hub?.type === 'shared' ? 'Shared' : hub?.type === 'central' ? 'Central' : 'White-labelled'

  return {
    ...(hub?.deploy || {}),
    frontend_url: frontend || null,
    api_url: api || null,
    deploy_notes: notes || null,
    database: {
      driver,
      host: dbHost || null,
      port: port ? Number(port) : null,
      database: dbDatabase || null,
      username: dbUsername || null,
      password_set: passwordSet,
      ssl_mode: meta?.db_ssl_mode || hub?.deploy?.database?.ssl_mode || 'disabled',
      ssl_ca_set: Boolean(hub?.deploy?.database?.ssl_ca_set) || Boolean((meta?.db_ssl_ca || '').trim()),
    },
    hub_slug_env: slug,
    ready,
    status: ready ? 'ready' : 'needs_wiring',
    status_label: ready ? 'Deploy wiring ready' : 'Needs deploy wiring',
    checklist: [
      {
        key: 'active',
        label: 'Hub is active in the registry',
        done: isActive,
        required: true,
      },
      {
        key: 'frontend_url',
        label: 'Frontend URL recorded',
        done: Boolean(frontend),
        required: true,
      },
      {
        key: 'remote_db',
        label: needsRemoteDb
          ? 'Content hub database credentials recorded (own DB for remote control)'
          : 'Central Hub Controller uses its own .env database (not stored here)',
        done: needsRemoteDb ? hasDb : true,
        required: needsRemoteDb,
      },
      {
        key: 'api_url',
        label: 'API URL recorded (optional — needed for version checks)',
        done: Boolean(api),
        required: false,
      },
      {
        key: 'hub_slug',
        label: `${typeLabel} backend uses HUB_SLUG=${slug}`,
        done: true,
        required: true,
      },
      {
        key: 'own_db_env',
        label: 'Content hub .env points at its OWN database (not Central)',
        done: true,
        required: needsRemoteDb,
      },
      {
        key: 'app_version',
        label: 'After each code update set APP_VERSION / FRONTEND_VERSION (or bump VERSION file)',
        done: Boolean(hub?.code_update?.reported_version),
        required: false,
      },
      {
        key: 'deploy_notes',
        label: 'Deploy notes added (optional)',
        done: Boolean(notes),
        required: false,
      },
    ],
    env_snippet: [
      `# ${typeLabel} deploy — same codebase, OWN database`,
      `HUB_SLUG=${slug}`,
      hub?.type === 'shared' ? 'HUB_IS_CONTROL_PLANE=false' : null,
      frontend ? `FRONTEND_URL=${frontend.replace(/\/$/, '')}` : 'FRONTEND_URL=https://example.com',
      api ? `APP_URL=${api.replace(/\/$/, '')}` : 'APP_URL=https://api.example.com',
      'APP_VERSION=1.0.0',
      'FRONTEND_VERSION=1.0.0',
      `DB_CONNECTION=${driver}`,
      `DB_HOST=${dbHost || '127.0.0.1'}`,
      `DB_PORT=${port || 3306}`,
      `DB_DATABASE=${dbDatabase || 'hub_content'}`,
      `DB_USERNAME=${dbUsername || 'hub_user'}`,
      'DB_PASSWORD=********',
    ]
      .filter(Boolean)
      .join('\n'),
  }
}
