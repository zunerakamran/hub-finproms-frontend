/** Max screen recording length for support tickets (seconds). */
export const ST_MAX_RECORD_SECONDS = 45

function waitForVideoFrame(video) {
  return new Promise((resolve, reject) => {
    const fail = setTimeout(() => reject(new Error('Could not capture a video frame.')), 8000)
    const tryFrame = () => {
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        clearTimeout(fail)
        resolve()
        return
      }
      requestAnimationFrame(tryFrame)
    }
    video.addEventListener('loadedmetadata', tryFrame, { once: true })
    tryFrame()
  })
}

/**
 * Ask the user to share a screen/window/tab, capture one still as a PNG File.
 * Requires a secure context (HTTPS or localhost) and browser permission.
 */
export async function captureScreenScreenshot() {
  if (!navigator.mediaDevices?.getDisplayMedia) {
    throw new Error('Screen capture is not supported in this browser.')
  }

  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: { displaySurface: 'browser' },
    audio: false,
    preferCurrentTab: true,
  })

  try {
    const video = document.createElement('video')
    video.playsInline = true
    video.muted = true
    video.srcObject = stream
    await video.play()
    await waitForVideoFrame(video)

    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Could not create screenshot canvas.')
    ctx.drawImage(video, 0, 0)

    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (result) => (result ? resolve(result) : reject(new Error('Screenshot failed.'))),
        'image/png'
      )
    })

    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    return new File([blob], `screenshot-${stamp}.png`, { type: 'image/png' })
  } finally {
    stream.getTracks().forEach((track) => track.stop())
  }
}

/**
 * Start a short screen recording. Returns a controller with stop().
 *
 * @returns {Promise<{
 *   stop: () => Promise<File>,
 *   cancel: () => void,
 *   stream: MediaStream,
 *   maxSeconds: number
 * }>}
 */
export async function startScreenRecording({ maxSeconds = ST_MAX_RECORD_SECONDS } = {}) {
  if (!navigator.mediaDevices?.getDisplayMedia) {
    throw new Error('Screen recording is not supported in this browser.')
  }
  if (typeof MediaRecorder === 'undefined') {
    throw new Error('MediaRecorder is not available in this browser.')
  }

  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: true,
    audio: true,
    preferCurrentTab: true,
  })

  const mimeCandidates = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ]
  const mimeType = mimeCandidates.find((type) => MediaRecorder.isTypeSupported(type)) || ''
  const recorder = mimeType
    ? new MediaRecorder(stream, { mimeType })
    : new MediaRecorder(stream)
  const chunks = []
  let settleStop = null
  let timedOut = false

  recorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) chunks.push(event.data)
  }

  const stopTracks = () => {
    stream.getTracks().forEach((track) => track.stop())
  }

  const timer = setTimeout(() => {
    timedOut = true
    if (recorder.state === 'recording') recorder.stop()
  }, Math.max(5, maxSeconds) * 1000)

  stream.getVideoTracks().forEach((track) => {
    track.addEventListener('ended', () => {
      if (recorder.state === 'recording') recorder.stop()
    })
  })

  recorder.onstop = () => {
    clearTimeout(timer)
    stopTracks()
    if (!settleStop) return
    const type = recorder.mimeType || 'video/webm'
    const blob = new Blob(chunks, { type })
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const file = new File([blob], `screen-recording-${stamp}.webm`, { type: 'video/webm' })
    settleStop({ file, timedOut })
    settleStop = null
  }

  recorder.start(1000)

  return {
    stream,
    maxSeconds,
    cancel() {
      clearTimeout(timer)
      try {
        if (recorder.state === 'recording') recorder.stop()
      } catch {
        //
      }
      stopTracks()
      settleStop = null
    },
    stop() {
      return new Promise((resolve, reject) => {
        settleStop = ({ file }) => resolve(file)
        try {
          if (recorder.state === 'recording') {
            recorder.stop()
          } else if (chunks.length) {
            clearTimeout(timer)
            stopTracks()
            const blob = new Blob(chunks, { type: recorder.mimeType || 'video/webm' })
            const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
            resolve(new File([blob], `screen-recording-${stamp}.webm`, { type: 'video/webm' }))
          } else {
            clearTimeout(timer)
            stopTracks()
            reject(new Error('Nothing was recorded.'))
          }
        } catch (err) {
          clearTimeout(timer)
          stopTracks()
          reject(err)
        }
      })
    },
  }
}
