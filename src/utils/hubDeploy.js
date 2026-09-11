/**
 * Build a live deploy-wiring preview from saved hub + in-progress form meta.
 */
export function buildDeployPreview(hub, meta) {
  const slug = hub?.deploy?.hub_slug_env || hub?.slug || ''
  const frontend = (meta?.frontend_url || '').trim()
  const api = (meta?.api_url || '').trim()
  const notes = (meta?.deploy_notes || '').trim()
  const isActive = Boolean(meta?.is_active)
  const isShared = hub?.type === 'shared'
  const dbHost = (meta?.db_host || '').trim()
  const dbDatabase = (meta?.db_database || '').trim()
  const dbUsername = (meta?.db_username || '').trim()
  const dbPassword = (meta?.db_password || '').trim()
  const passwordSet = Boolean(hub?.deploy?.database?.password_set) || Boolean(dbPassword)
  const hasDb = Boolean(dbHost && dbDatabase && dbUsername && passwordSet)
  const ready = isActive && Boolean(frontend) && (isShared || hasDb)
  const driver = (meta?.db_driver || hub?.deploy?.database?.driver || 'mysql').trim() || 'mysql'
  const port = meta?.db_port ? String(meta.db_port).trim() : hub?.deploy?.database?.port || 3306

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
        label: isShared
          ? 'Shared hub uses its own .env database (not stored here)'
          : 'White-label database credentials recorded (own DB)',
        done: isShared || hasDb,
        required: !isShared,
      },
      {
        key: 'api_url',
        label: 'API URL recorded (optional)',
        done: Boolean(api),
        required: false,
      },
      {
        key: 'hub_slug',
        label: `White-label backend uses HUB_SLUG=${slug}`,
        done: true,
        required: true,
      },
      {
        key: 'own_db_env',
        label: 'White-label .env points at its OWN database (not shared)',
        done: true,
        required: !isShared,
      },
      {
        key: 'deploy_notes',
        label: 'Deploy notes added (optional)',
        done: Boolean(notes),
        required: false,
      },
    ],
    env_snippet: [
      '# White-label deploy — same codebase, OWN database (not the shared hub DB)',
      `HUB_SLUG=${slug}`,
      frontend ? `FRONTEND_URL=${frontend.replace(/\/$/, '')}` : 'FRONTEND_URL=https://example.com',
      api ? `APP_URL=${api.replace(/\/$/, '')}` : 'APP_URL=https://api.example.com',
      `DB_CONNECTION=${driver}`,
      `DB_HOST=${dbHost || '127.0.0.1'}`,
      `DB_PORT=${port || 3306}`,
      `DB_DATABASE=${dbDatabase || 'hub_white_label'}`,
      `DB_USERNAME=${dbUsername || 'hub_user'}`,
      'DB_PASSWORD=********',
    ].join('\n'),
  }
}
