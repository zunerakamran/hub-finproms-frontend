/**
 * Poll a background job status endpoint until completed/failed.
 */
export async function pollJobStatus(
  fetchStatus,
  { intervalMs = 800, maxMs = 5 * 60 * 1000, immediate = true } = {}
) {
  const started = Date.now()
  let waitFirst = !immediate

  while (Date.now() - started < maxMs) {
    if (waitFirst) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs))
    } else {
      waitFirst = true
    }

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
