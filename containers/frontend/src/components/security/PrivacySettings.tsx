import { useState, useEffect } from 'react'
import { getPrivacySettings, updatePrivacySettings, PrivacySettings as Settings } from '@/services/security/securityApi'
import { Shield, Eye, EyeOff, MapPin, Lock, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

export function PrivacySettings() {
  const [settings, setSettings] = useState<Settings>({
    is_profile_public: true,
    show_exact_location: false,
    is_verified: false,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const data = await getPrivacySettings()
      setSettings(data)
    } catch (error) {
      console.error('Error loading privacy settings:', error)
      toast.error('Error al cargar configuración de privacidad')
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = async (key: keyof Omit<Settings, 'is_verified'>, value: boolean) => {
    try {
      setSaving(true)
      const updatedSettings = { ...settings, [key]: value }
      setSettings(updatedSettings)

      await updatePrivacySettings({ [key]: value })
      toast.success('Configuración actualizada correctamente')
    } catch (error) {
      console.error('Error updating privacy settings:', error)
      toast.error('Error al actualizar configuración')
      // Revertir cambio en caso de error
      setSettings(settings)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Shield className="h-8 w-8" />
          Privacidad y Seguridad
        </h1>
        <p className="text-gray-600">Controla quién puede ver tu información y cómo apareces en la plataforma</p>
      </div>

      <div className="space-y-6">
        {/* Perfil Público/Privado */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {settings.is_profile_public ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
              Visibilidad del Perfil
            </CardTitle>
            <CardDescription>
              Controla si otros usuarios pueden ver tu perfil completo o solo información básica
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="profile-public" className="font-medium">
                  Perfil Público
                </Label>
                <p className="text-sm text-gray-600">
                  {settings.is_profile_public
                    ? 'Tu perfil es visible para todos los usuarios'
                    : 'Solo la información básica es visible (nombre, foto)'}
                </p>
              </div>
              <Switch
                id="profile-public"
                checked={settings.is_profile_public}
                onCheckedChange={(checked) => handleToggle('is_profile_public', checked)}
                disabled={saving}
              />
            </div>

            {!settings.is_profile_public && (
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>Nota:</strong> Con el perfil privado, otros usuarios solo podrán ver tu nombre y foto. No
                  podrán ver tu biografía, habilidades ni tu ubicación completa.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Ubicación Exacta */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Privacidad de Ubicación
            </CardTitle>
            <CardDescription>Controla qué tan precisa es tu ubicación en el mapa</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="exact-location" className="font-medium">
                  Mostrar Ubicación Exacta
                </Label>
                <p className="text-sm text-gray-600">
                  {settings.show_exact_location
                    ? 'Tu ubicación exacta es visible en el mapa'
                    : 'Solo tu ciudad es visible (ubicación aproximada en el mapa)'}
                </p>
              </div>
              <Switch
                id="exact-location"
                checked={settings.show_exact_location}
                onCheckedChange={(checked) => handleToggle('show_exact_location', checked)}
                disabled={saving}
              />
            </div>

            {!settings.show_exact_location && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Recomendado:</strong> Con ubicación aproximada, tu pin en el mapa se mostrará con ~5km de
                  variación aleatoria para proteger tu privacidad.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Estado de Verificación */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {settings.is_verified ? <CheckCircle className="h-5 w-5 text-green-600" /> : <Lock className="h-5 w-5" />}
              Verificación de Cuenta
            </CardTitle>
            <CardDescription>Verifica tu cuenta para obtener un badge de confianza</CardDescription>
          </CardHeader>
          <CardContent>
            {settings.is_verified ? (
              <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
                <div>
                  <p className="font-medium text-green-900">¡Tu cuenta está verificada!</p>
                  <p className="text-sm text-green-700">Otros usuarios verán un badge de verificación en tu perfil</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  La verificación te ayuda a construir confianza en la plataforma. Una cuenta verificada muestra que
                  eres un usuario genuino.
                </p>
                <Button variant="outline" onClick={() => (window.location.href = '/settings/verification')}>
                  Solicitar Verificación
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Información Adicional */}
        <Card>
          <CardHeader>
            <CardTitle>Consejos de Seguridad</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <Shield className="h-4 w-4 mt-0.5 text-blue-600 flex-shrink-0" />
                <span>
                  Mantén tu perfil privado si eres nuevo en la plataforma y no te sientes cómodo compartiendo
                  información personal
                </span>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="h-4 w-4 mt-0.5 text-blue-600 flex-shrink-0" />
                <span>
                  Si no deseas que otros sepan tu dirección exacta, desactiva la ubicación precisa. Aún podrán
                  encontrarte por ciudad
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Lock className="h-4 w-4 mt-0.5 text-blue-600 flex-shrink-0" />
                <span>
                  Puedes bloquear usuarios o reportar comportamientos inapropiados desde la configuración de seguridad
                </span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
