import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { reportUser, ReportUserData } from '@/services/security/securityApi'
import { AlertTriangle, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'

const REPORT_REASONS = [
  { value: 'harassment', label: 'Acoso o Intimidación', description: 'Comportamiento hostil o amenazante' },
  { value: 'spam', label: 'Spam o Contenido No Deseado', description: 'Mensajes repetitivos o no solicitados' },
  {
    value: 'inappropriate',
    label: 'Contenido Inapropiado',
    description: 'Contenido ofensivo, sexual o violento',
  },
  { value: 'fake', label: 'Perfil Falso', description: 'Suplantación de identidad o información falsa' },
  { value: 'scam', label: 'Estafa o Fraude', description: 'Intento de engaño o fraude' },
  { value: 'other', label: 'Otro', description: 'Otra razón no listada' },
]

interface ReportUserProps {
  userId: number
  userName: string
  onSuccess?: () => void
}

export function ReportUser({ userId, userName, onSuccess }: ReportUserProps) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<ReportUserData>({
    reported_id: userId,
    reason: 'harassment',
    description: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.description.trim()) {
      toast.error('Por favor, describe el motivo del reporte')
      return
    }

    try {
      setLoading(true)
      await reportUser(formData)
      toast.success('Reporte enviado correctamente. Nuestro equipo lo revisará pronto.')
      if (onSuccess) {
        onSuccess()
      } else {
        navigate({ to: '/settings/security' })
      }
    } catch (error: any) {
      console.error('Error reporting user:', error)
      toast.error(error.response?.data?.error || 'Error al enviar el reporte')
    } finally {
      setLoading(false)
    }
  }

  const selectedReason = REPORT_REASONS.find((r) => r.value === formData.reason)

  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-6 w-6" />
            Reportar Usuario
          </CardTitle>
          <CardDescription>
            Estás reportando a <strong>{userName}</strong>. Este reporte será revisado por nuestro equipo de
            moderación.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Selección de razón */}
            <div className="space-y-2">
              <Label htmlFor="reason">
                Razón del Reporte <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.reason}
                onValueChange={(value) => setFormData({ ...formData, reason: value as ReportUserData['reason'] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REPORT_REASONS.map((reason) => (
                    <SelectItem key={reason.value} value={reason.value}>
                      <div>
                        <div className="font-medium">{reason.label}</div>
                        <div className="text-xs text-gray-500">{reason.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedReason && (
                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">{selectedReason.description}</p>
              )}
            </div>

            {/* Descripción detallada */}
            <div className="space-y-2">
              <Label htmlFor="description">
                Descripción Detallada <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="description"
                placeholder="Por favor, describe en detalle lo que sucedió. Incluye fechas, contexto y cualquier información relevante..."
                rows={6}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
              />
              <p className="text-xs text-gray-600">
                Cuanto más detallado sea tu reporte, más fácil será para nuestro equipo tomar medidas apropiadas.
              </p>
            </div>

            {/* Advertencia */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-medium text-yellow-900 mb-2">Información Importante:</h4>
              <ul className="text-sm text-yellow-800 space-y-1">
                <li>• Los reportes falsos o malintencionados pueden resultar en la suspensión de tu cuenta</li>
                <li>• Mantén la calma y sé objetivo en tu descripción</li>
                <li>• Nuestro equipo revisará el reporte en las próximas 24-48 horas</li>
                <li>• Recibirás una notificación cuando se haya tomado una decisión</li>
              </ul>
            </div>

            {/* Botones */}
            <div className="flex gap-3 pt-4">
              <Button type="submit" variant="destructive" className="flex-1" disabled={loading}>
                <Send className="h-4 w-4 mr-2" />
                {loading ? 'Enviando Reporte...' : 'Enviar Reporte'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => (onSuccess ? onSuccess() : navigate({ to: -1 }))}
                disabled={loading}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
