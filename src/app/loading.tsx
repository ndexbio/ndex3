/**
 * Global Loading UI
 *
 * Minimal fallback loading component for the entire app.
 * Uses a plain white background to avoid showing a misleading silhouette
 * of the landing page while route-specific content is loading.
 */
export default function GlobalLoading() {
  return <div className="min-h-screen bg-background" />
}
