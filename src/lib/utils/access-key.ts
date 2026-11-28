/**
 * Adds an NDEx access key to a downstream URL.
 *
 * The helper works with both absolute and application-relative URLs and keeps
 * any fragment at the end of the URL. Empty keys are intentionally ignored.
 */
export const withAccessKey = (url: string, accessKey?: string): string => {
  if (!accessKey) return url

  const hashIndex = url.indexOf('#')
  const base = hashIndex === -1 ? url : url.slice(0, hashIndex)
  const hash = hashIndex === -1 ? '' : url.slice(hashIndex)
  const separator = base.includes('?')
    ? base.endsWith('?') || base.endsWith('&')
      ? ''
      : '&'
    : '?'

  return `${base}${separator}accesskey=${encodeURIComponent(accessKey)}${hash}`
}
