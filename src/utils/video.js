/**
 * Generate a resized thumbnail from an image file.
 * Keeps the original image format when possible so existing mime handling stays valid.
 */
export const generateImageThumbnail = (imageFile, maxSize = 480) => {
  return new Promise((resolve, reject) => {
    const image = new Image()
    const objectUrl = URL.createObjectURL(imageFile)

    image.addEventListener('error', () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Image load error'))
    })

    image.addEventListener('load', () => {
      const width = image.naturalWidth || image.width
      const height = image.naturalHeight || image.height
      if (!width || !height) {
        URL.revokeObjectURL(objectUrl)
        reject(new Error('Image dimensions unavailable'))
        return
      }

      const scale = Math.min(maxSize / width, maxSize / height, 1)
      const outputWidth = Math.max(1, Math.round(width * scale))
      const outputHeight = Math.max(1, Math.round(height * scale))
      const canvas = document.createElement('canvas')
      canvas.width = outputWidth
      canvas.height = outputHeight
      const ctx = canvas.getContext('2d')

      const mimeType =
        imageFile.type === 'image/png' || imageFile.type === 'image/webp'
          ? imageFile.type
          : 'image/jpeg'

      if (mimeType === 'image/jpeg') {
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, outputWidth, outputHeight)
      }

      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(image, 0, 0, outputWidth, outputHeight)

      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(objectUrl)
          if (blob) {
            resolve(blob)
            return
          }
          reject(new Error('Canvas toBlob failed'))
        },
        mimeType,
        mimeType === 'image/jpeg' ? 0.85 : undefined,
      )
    })

    image.src = objectUrl
  })
}

/**
 * Generate a 4-frame collage thumbnail from a video file.
 * Returns a JPEG Blob.
 */
const VIDEO_THUMBNAIL_TIMEOUT_MS = 8000

export const generateVideoThumbnail = (videoFile, timeoutMs = VIDEO_THUMBNAIL_TIMEOUT_MS) => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.muted = true
    video.playsInline = true

    const objectUrl = URL.createObjectURL(videoFile)
    let settled = false
    let timeoutId = null
    let captureFrame = null

    const cleanup = () => {
      if (timeoutId !== null) {
        clearTimeout(timeoutId)
        timeoutId = null
      }
      video.removeEventListener('error', onError)
      video.removeEventListener('loadedmetadata', onLoadedMetadata)
      if (captureFrame) {
        video.removeEventListener('seeked', captureFrame)
      }
      video.removeAttribute('src')
      video.load()
      URL.revokeObjectURL(objectUrl)
    }

    const settle = (error, blob = null) => {
      if (settled) return
      settled = true
      cleanup()
      if (error) {
        reject(error)
        return
      }
      resolve(blob)
    }

    function onError() {
      settle(new Error('Video load error'))
    }

    function onLoadedMetadata() {
      const duration = video.duration
      if (!duration || duration < 1) {
        settle(new Error('Video too short'))
        return
      }

      const frameW = 320
      const frameH = 180
      const canvas = document.createElement('canvas')
      canvas.width = frameW * 2
      canvas.height = frameH * 2
      const ctx = canvas.getContext('2d')

      if (!ctx) {
        settle(new Error('Canvas context unavailable'))
        return
      }

      // Seek to 4 distinct timestamps: 10%, 35%, 60%, 85%
      const times = [0.1, 0.35, 0.6, 0.85].map((p) => p * duration)
      const positions = [
        [0, 0],
        [frameW, 0],
        [0, frameH],
        [frameW, frameH],
      ]
      let captured = 0

      captureFrame = () => {
        if (settled) return

        const [x, y] = positions[captured]
        ctx.drawImage(video, x, y, frameW, frameH)
        captured++
        if (captured < 4) {
          video.currentTime = times[captured]
          return
        }

        canvas.toBlob(
          (blob) => {
            if (blob) {
              settle(null, blob)
              return
            }
            settle(new Error('Canvas toBlob failed'))
          },
          'image/jpeg',
          0.85,
        )
      }

      video.addEventListener('seeked', captureFrame)
      video.currentTime = times[0]
    }

    timeoutId = window.setTimeout(() => {
      settle(new Error('Video thumbnail timeout'))
    }, timeoutMs)

    video.addEventListener('error', onError)
    video.addEventListener('loadedmetadata', onLoadedMetadata)
    video.src = objectUrl
    video.load()
  })
}
