/**
 * Generate a 4-frame collage thumbnail from a video file.
 * Returns a JPEG Blob.
 */
export const generateVideoThumbnail = (videoFile) => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.preload = 'auto'
    video.muted = true
    const objectUrl = URL.createObjectURL(videoFile)
    video.src = objectUrl

    video.addEventListener('error', () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Video load error'))
    })

    video.addEventListener('loadedmetadata', () => {
      const duration = video.duration
      if (!duration || duration < 1) {
        URL.revokeObjectURL(objectUrl)
        reject(new Error('Video too short'))
        return
      }

      const frameW = 320
      const frameH = 180
      const canvas = document.createElement('canvas')
      canvas.width = frameW * 2
      canvas.height = frameH * 2
      const ctx = canvas.getContext('2d')

      // Seek to 4 distinct timestamps: 10%, 35%, 60%, 85%
      const times = [0.1, 0.35, 0.6, 0.85].map((p) => p * duration)
      const positions = [
        [0, 0],
        [frameW, 0],
        [0, frameH],
        [frameW, frameH],
      ]
      let captured = 0

      const captureFrame = () => {
        const [x, y] = positions[captured]
        ctx.drawImage(video, x, y, frameW, frameH)
        captured++
        if (captured < 4) {
          video.currentTime = times[captured]
        } else {
          URL.revokeObjectURL(objectUrl)
          canvas.toBlob(
            (blob) => (blob ? resolve(blob) : reject(new Error('Canvas toBlob failed'))),
            'image/jpeg',
            0.85,
          )
        }
      }

      video.addEventListener('seeked', captureFrame)
      video.currentTime = times[0]
    })
  })
}
