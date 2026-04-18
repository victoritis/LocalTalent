import { useEffect, useMemo, useRef, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Check, Loader2, X } from 'lucide-react'

interface UsernameSettingsProps {
  currentUsername: string
  onChanged?: (newUsername: string) => void
}

const USERNAME_REGEX = /^[a-z0-9_-]{3,30}$/

type Availability =
  | { state: 'idle' }
  | { state: 'checking' }
  | { state: 'invalid'; reason: string }
  | { state: 'taken' }
  | { state: 'available' }
  | { state: 'current' }

export function UsernameSettings({ currentUsername, onChanged }: UsernameSettingsProps) {
  const { toast } = useToast()
  const apiUrl = import.meta.env.VITE_REACT_APP_API_URL
  const [value, setValue] = useState(currentUsername || '')
  const [saving, setSaving] = useState(false)
  const [availability, setAvailability] = useState<Availability>({ state: 'idle' })
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setValue(currentUsername || '')
  }, [currentUsername])

  const normalized = useMemo(() => value.trim().toLowerCase(), [value])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!normalized) {
      setAvailability({ state: 'idle' })
      return
    }
    if (normalized === currentUsername) {
      setAvailability({ state: 'current' })
      return
    }
    if (!USERNAME_REGEX.test(normalized)) {
      setAvailability({
        state: 'invalid',
        reason: '3-30 caracteres con minúsculas, dígitos, _ o -',
      })
      return
    }

    setAvailability({ state: 'checking' })
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `${apiUrl}/api/v1/users/me/username/availability?username=${encodeURIComponent(normalized)}`,
          { credentials: 'include' },
        )
        if (!res.ok) throw new Error('check_failed')
        const data = await res.json()
        if (!data.valid_format) {
          setAvailability({ state: 'invalid', reason: 'Formato inválido' })
        } else if (data.is_current) {
          setAvailability({ state: 'current' })
        } else if (data.available) {
          setAvailability({ state: 'available' })
        } else {
          setAvailability({ state: 'taken' })
        }
      } catch {
        setAvailability({ state: 'idle' })
      }
    }, 400)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [normalized, currentUsername, apiUrl])

  const canSave =
    !saving && availability.state === 'available' && normalized !== currentUsername

  const handleSave = async () => {
    if (!canSave) return
    setSaving(true)
    try {
      const res = await fetch(`${apiUrl}/api/v1/users/me/username`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username: normalized }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        let description = data?.error || 'No se pudo actualizar el username'
        if (res.status === 429 && data?.next_change_at) {
          const when = new Date(data.next_change_at).toLocaleDateString()
          description = `Sólo puedes cambiar el username una vez cada 30 días. Próximo cambio disponible: ${when}`
        }
        toast({ title: 'No se pudo guardar', description, variant: 'destructive' })
        return
      }
      toast({ title: 'Username actualizado', description: `Ahora eres @${data.username}` })
      onChanged?.(data.username)
    } catch {
      toast({ title: 'Error', description: 'Fallo de red', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const renderStatus = () => {
    switch (availability.state) {
      case 'checking':
        return (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
            Comprobando disponibilidad…
          </span>
        )
      case 'available':
        return (
          <span className="inline-flex items-center gap-1 text-xs text-green-600">
            <Check className="w-3 h-3" aria-hidden="true" />
            Disponible
          </span>
        )
      case 'taken':
        return (
          <span className="inline-flex items-center gap-1 text-xs text-destructive">
            <X className="w-3 h-3" aria-hidden="true" />
            Ya está en uso
          </span>
        )
      case 'invalid':
        return (
          <span className="inline-flex items-center gap-1 text-xs text-destructive">
            <X className="w-3 h-3" aria-hidden="true" />
            {availability.reason}
          </span>
        )
      case 'current':
        return (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            Es tu username actual
          </span>
        )
      default:
        return null
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nombre de usuario</CardTitle>
        <CardDescription>
          Es tu identificador público (@{currentUsername}). Sólo puedes cambiarlo una vez cada 30 días.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="username-input">Nuevo username</Label>
          <div className="flex items-center gap-2">
            <Input
              id="username-input"
              value={value}
              onChange={(e) => setValue(e.target.value.toLowerCase())}
              placeholder="ej: ana-perez"
              aria-describedby="username-status"
              maxLength={30}
              autoComplete="off"
              spellCheck={false}
            />
            <Button onClick={handleSave} disabled={!canSave}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />}
              Guardar
            </Button>
          </div>
          <div id="username-status" aria-live="polite" className="min-h-[1.25rem]">
            {renderStatus()}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
