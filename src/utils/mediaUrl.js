const DEFAULT_MEDIA_BASE_URL = 'https://fire.rftuning.id'

const encodePathSegment = (segment) => {
  try {
    return encodeURIComponent(decodeURIComponent(segment))
  } catch {
    return encodeURIComponent(segment)
  }
}

export const buildMediaUrl = (mediaPath, baseUrl = DEFAULT_MEDIA_BASE_URL) => {
  if (!mediaPath) return ''
  if (/^https?:\/\//i.test(mediaPath)) return mediaPath

  const normalizedBase = baseUrl.replace(/\/$/, '')
  const normalizedPath = mediaPath.startsWith('/') ? mediaPath : `/${mediaPath}`
  const encodedPath = normalizedPath
    .split('/')
    .map((segment, index) => (index === 0 && segment === '' ? '' : encodePathSegment(segment)))
    .join('/')

  return `${normalizedBase}${encodedPath}`
}
