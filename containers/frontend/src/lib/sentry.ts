import * as Sentry from "@sentry/react"

let initialized = false

export function initSentry() {
  if (initialized) return
  const dsn = import.meta.env.VITE_SENTRY_DSN
  if (!dsn) return

  Sentry.init({
    dsn,
    environment: import.meta.env.VITE_SENTRY_ENVIRONMENT ?? import.meta.env.MODE,
    release: import.meta.env.VITE_SENTRY_RELEASE,
    tracesSampleRate: Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE ?? 0),
    replaysSessionSampleRate: Number(
      import.meta.env.VITE_SENTRY_REPLAYS_SESSION_SAMPLE_RATE ?? 0,
    ),
    replaysOnErrorSampleRate: Number(
      import.meta.env.VITE_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE ?? 0,
    ),
  })

  initialized = true
}

export function isSentryEnabled() {
  return initialized
}

export function captureException(error: unknown, context?: Record<string, unknown>) {
  if (!initialized) {
    if (import.meta.env.DEV) {
      console.error("[sentry disabled]", error, context)
    }
    return
  }
  Sentry.captureException(error, context ? { extra: context } : undefined)
}
