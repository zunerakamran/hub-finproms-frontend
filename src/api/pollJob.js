/**
 * Poll a background job status endpoint until completed/failed.
 */
export async function pollJobStatus(fetchStatus, { intervalMs = 1000, maxMs = 5 * 60 * 1000 } = {}) {
  const started = Date.now()

  while (Date.now() - started < maxMs) {
    await new Promise((resolve) => setTimeout(resolve, intervalMs))
    const status = await fetchStatus()
    if (status?.status === 'completed') {
      return status
    }
    if (status?.status === 'failed') {
      const err = new Error(status.message || 'Background job failed.')
      err.status = 422
      err.data = status
      throw err
    }
  }

  const timeout = new Error('Job is still processing. Refresh shortly to see results.')
  timeout.status = 408
  throw timeout
}
