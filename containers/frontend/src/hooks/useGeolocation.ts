import { useCallback, useState } from "react"

export type GeolocationStatus =
  | "idle"
  | "requesting"
  | "granted"
  | "denied"
  | "unavailable"
  | "timeout"
  | "error"

export interface GeolocationResult {
  latitude: number
  longitude: number
  accuracy: number
}

export interface UseGeolocationOptions extends PositionOptions {
  onDenied?: () => void
}

export interface UseGeolocationReturn {
  coords: GeolocationResult | null
  status: GeolocationStatus
  error: string | null
  request: (options?: UseGeolocationOptions) => Promise<GeolocationResult | null>
  clear: () => void
}

const DEFAULT_OPTIONS: PositionOptions = {
  enableHighAccuracy: false,
  maximumAge: 60_000,
  timeout: 10_000,
}

export function useGeolocation(): UseGeolocationReturn {
  const [coords, setCoords] = useState<GeolocationResult | null>(null)
  const [status, setStatus] = useState<GeolocationStatus>("idle")
  const [error, setError] = useState<string | null>(null)

  const request = useCallback(
    async (options: UseGeolocationOptions = {}) => {
      if (!("geolocation" in navigator)) {
        setStatus("unavailable")
        setError("Geolocalización no disponible en este navegador.")
        return null
      }
      setStatus("requesting")
      setError(null)
      return new Promise<GeolocationResult | null>((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const next = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
            }
            setCoords(next)
            setStatus("granted")
            resolve(next)
          },
          (err) => {
            let nextStatus: GeolocationStatus = "error"
            let message: string
            switch (err.code) {
              case err.PERMISSION_DENIED:
                nextStatus = "denied"
                message = "Permiso de ubicación denegado."
                options.onDenied?.()
                break
              case err.POSITION_UNAVAILABLE:
                nextStatus = "unavailable"
                message = "Ubicación no disponible."
                break
              case err.TIMEOUT:
                nextStatus = "timeout"
                message = "Se agotó el tiempo para obtener la ubicación."
                break
              default:
                message = err.message || "No se pudo obtener la ubicación."
            }
            setStatus(nextStatus)
            setError(message)
            resolve(null)
          },
          { ...DEFAULT_OPTIONS, ...options },
        )
      })
    },
    [],
  )

  const clear = useCallback(() => {
    setCoords(null)
    setStatus("idle")
    setError(null)
  }, [])

  return { coords, status, error, request, clear }
}
