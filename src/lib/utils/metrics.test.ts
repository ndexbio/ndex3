import {
  DEFAULT_METRICS_URL,
  buildMetricsEventUrl,
  sendMetricsEvent,
} from './metrics'

describe('buildMetricsEventUrl', () => {
  // "Absent" and "blank" mean different things: the key being missing is not a
  // decision, so it takes the default; an empty string is a decision to opt out.
  it('falls back to the default endpoint when metricsUrl is absent', () => {
    expect(buildMetricsEventUrl(undefined, 'not-found')).toBe(
      `${DEFAULT_METRICS_URL}/not-found`,
    )
  })

  it('the default endpoint is /metrics', () => {
    expect(DEFAULT_METRICS_URL).toBe('/metrics')
  })

  it('falls back to the default when config.json carries an explicit null', () => {
    // config.json is parsed, not type-checked, so null can reach here.
    expect(
      buildMetricsEventUrl(null as unknown as undefined, 'not-found'),
    ).toBe(`${DEFAULT_METRICS_URL}/not-found`)
  })

  it('the default still gets the deployment base path', () => {
    expect(buildMetricsEventUrl(undefined, 'not-found', {}, '/ndex3')).toBe(
      '/ndex3/metrics/not-found',
    )
  })

  it('returns null when metricsUrl is explicitly blank, which turns tracking off', () => {
    expect(buildMetricsEventUrl('', 'not-found')).toBeNull()
    expect(buildMetricsEventUrl('   ', 'not-found')).toBeNull()
  })

  it('appends the event as a path segment', () => {
    expect(buildMetricsEventUrl('/metrics', 'not-found')).toBe('/metrics/not-found')
  })

  it('tolerates a trailing slash on the configured base', () => {
    expect(buildMetricsEventUrl('/metrics/', 'not-found')).toBe('/metrics/not-found')
  })

  it('prefixes an app-relative base with the deployment base path', () => {
    expect(buildMetricsEventUrl('/metrics', 'not-found', {}, '/ndex3')).toBe(
      '/ndex3/metrics/not-found',
    )
  })

  it('uses a fully qualified base verbatim, ignoring the base path', () => {
    expect(
      buildMetricsEventUrl('https://metrics.example.org/e', 'not-found', {}, '/ndex3'),
    ).toBe('https://metrics.example.org/e/not-found')
  })

  it('encodes query parameters', () => {
    expect(buildMetricsEventUrl('/metrics', 'not-found', { url: '/a b/c?d' })).toBe(
      '/metrics/not-found?url=%2Fa+b%2Fc%3Fd',
    )
  })

  // Security: withAccessKey() puts a live access key in the query string of
  // shared links. A malformed shared link classifies as unknown, so if the
  // caller ever passed location.search through, the key would be written into
  // the server's access log. Only what the caller passes is ever sent.
  it('sends only the parameters it is given — a caller-supplied path with a query string is encoded, not merged', () => {
    const url = buildMetricsEventUrl('/metrics', 'not-found', {
      url: '/networkset/?accesskey=SECRET',
    })
    expect(url).not.toContain('accesskey=SECRET')
    expect(url).toContain('accesskey%3DSECRET')
  })
})

describe('sendMetricsEvent', () => {
  let fetchMock: jest.Mock
  let warnSpy: jest.SpyInstance
  let errorSpy: jest.SpyInstance

  beforeEach(() => {
    // Default to a healthy response; tests that exercise failure override it.
    fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 204 })
    global.fetch = fetchMock as unknown as typeof fetch
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('sends to the default endpoint when metricsUrl is not configured', () => {
    sendMetricsEvent(undefined, 'not-found', { url: '/nope' })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toBe('/metrics/not-found?url=%2Fnope')
  })

  it('sends nothing when metricsUrl is explicitly blank', () => {
    sendMetricsEvent('', 'not-found', { url: '/nope' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('issues one keepalive GET to the event URL', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 204 })
    sendMetricsEvent('/metrics', 'not-found', { url: '/nope' })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/metrics/not-found?url=%2Fnope')
    expect(init).toMatchObject({ method: 'GET', keepalive: true, cache: 'no-store' })
  })

  it('warns nothing on success', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 204 })
    sendMetricsEvent('/metrics', 'not-found')
    await Promise.resolve()
    await Promise.resolve()

    expect(warnSpy).not.toHaveBeenCalled()
  })

  // A rejected fetch and a non-ok response are different failure shapes, and
  // handling only the first would miss the likelier server misconfiguration.
  it('warns once when the request rejects, and never throws', async () => {
    fetchMock.mockRejectedValue(new Error('blocked'))
    expect(() => sendMetricsEvent('/metrics', 'not-found')).not.toThrow()
    await Promise.resolve()
    await Promise.resolve()

    expect(warnSpy).toHaveBeenCalledTimes(1)
    expect(warnSpy.mock.calls[0][0]).toContain('[ndex3:metrics]')
  })

  it('warns once when the server answers with a non-ok status', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 404 })
    sendMetricsEvent('/metrics', 'not-found')
    await Promise.resolve()
    await Promise.resolve()

    expect(warnSpy).toHaveBeenCalledTimes(1)
    expect(warnSpy.mock.calls[0][0]).toContain('404')
  })

  // A dropped tracking request is not an application error and must not reach error
  // reporting or triage tooling.
  it('never uses console.error for a delivery failure', async () => {
    fetchMock.mockRejectedValue(new Error('blocked'))
    sendMetricsEvent('/metrics', 'not-found')
    await Promise.resolve()
    await Promise.resolve()

    expect(errorSpy).not.toHaveBeenCalled()
  })
})
