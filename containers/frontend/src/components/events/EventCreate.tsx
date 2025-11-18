import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { createEvent, CreateEventData } from '@/services/events/eventsApi'
import { Calendar, MapPin, Video, Users, Image as ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'

const EVENT_TYPES = [
  { value: 'networking', label: 'Networking' },
  { value: 'workshop', label: 'Taller' },
  { value: 'meetup', label: 'Meetup' },
  { value: 'conference', label: 'Conferencia' },
  { value: 'social', label: 'Social' },
  { value: 'collaboration', label: 'Colaboración' },
  { value: 'other', label: 'Otro' },
]

const CATEGORIES = [
  { value: 'musician', label: 'Música' },
  { value: 'artist', label: 'Arte' },
  { value: 'developer', label: 'Desarrollo' },
  { value: 'designer', label: 'Diseño' },
  { value: 'photographer', label: 'Fotografía' },
  { value: 'writer', label: 'Escritura' },
  { value: 'chef', label: 'Gastronomía' },
  { value: 'athlete', label: 'Deporte' },
  { value: 'teacher', label: 'Educación' },
  { value: 'other', label: 'Otro' },
]

export function EventCreate() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<CreateEventData>({
    title: '',
    description: '',
    event_type: 'networking',
    start_date: '',
    end_date: '',
    is_online: false,
    meeting_url: '',
    address: '',
    city: '',
    country: '',
    latitude: undefined,
    longitude: undefined,
    max_attendees: undefined,
    is_public: true,
    category: '',
    image_url: '',
  })

  const handleInputChange = (field: keyof CreateEventData, value: any) => {
    setFormData({ ...formData, [field]: value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validaciones
    if (!formData.title.trim()) {
      toast.error('El título es obligatorio')
      return
    }

    if (!formData.start_date) {
      toast.error('La fecha de inicio es obligatoria')
      return
    }

    if (!formData.is_online && !formData.city) {
      toast.error('Para eventos presenciales, la ciudad es obligatoria')
      return
    }

    if (formData.is_online && !formData.meeting_url) {
      toast.error('Para eventos online, el enlace de reunión es obligatorio')
      return
    }

    try {
      setLoading(true)

      // Limpiar campos no necesarios según el tipo
      const dataToSend = { ...formData }
      if (formData.is_online) {
        dataToSend.address = undefined
        dataToSend.city = undefined
        dataToSend.country = undefined
        dataToSend.latitude = undefined
        dataToSend.longitude = undefined
      } else {
        dataToSend.meeting_url = undefined
      }

      const response = await createEvent(dataToSend)
      toast.success('Evento creado correctamente')
  navigate({ to: '/auth/events/$id', params: { id: response.event.id.toString() } })
    } catch (error: any) {
      console.error('Error creating event:', error)
      toast.error(error.response?.data?.error || 'Error al crear el evento')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">Crear Nuevo Evento</CardTitle>
          <CardDescription>Organiza un evento de networking y colaboración</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Información básica */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Información Básica</h3>

              <div className="space-y-2">
                <Label htmlFor="title">
                  Título del Evento <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="title"
                  placeholder="Ej: Meetup de Desarrolladores Web"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  placeholder="Describe tu evento..."
                  rows={4}
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="event_type">Tipo de Evento</Label>
                  <Select value={formData.event_type} onValueChange={(value) => handleInputChange('event_type', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EVENT_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Categoría</Label>
                  <Select value={formData.category || ''} onValueChange={(value) => handleInputChange('category', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Fecha y hora */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Fecha y Hora
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date">
                    Fecha de inicio <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="start_date"
                    type="datetime-local"
                    value={formData.start_date}
                    onChange={(e) => handleInputChange('start_date', e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="end_date">Fecha de fin (opcional)</Label>
                  <Input
                    id="end_date"
                    type="datetime-local"
                    value={formData.end_date}
                    onChange={(e) => handleInputChange('end_date', e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Tipo de evento (Online/Presencial) */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Modalidad</h3>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  {formData.is_online ? <Video className="h-5 w-5" /> : <MapPin className="h-5 w-5" />}
                  <div>
                    <Label htmlFor="is_online" className="font-medium">
                      {formData.is_online ? 'Evento Online' : 'Evento Presencial'}
                    </Label>
                    <p className="text-sm text-gray-600">
                      {formData.is_online ? 'Se realizará por videollamada' : 'Se realizará en un lugar físico'}
                    </p>
                  </div>
                </div>
                <Switch
                  id="is_online"
                  checked={formData.is_online}
                  onCheckedChange={(checked) => handleInputChange('is_online', checked)}
                />
              </div>

              {formData.is_online ? (
                <div className="space-y-2">
                  <Label htmlFor="meeting_url">
                    Enlace de reunión <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="meeting_url"
                    type="url"
                    placeholder="https://meet.google.com/xxx-yyyy-zzz"
                    value={formData.meeting_url}
                    onChange={(e) => handleInputChange('meeting_url', e.target.value)}
                  />
                  <p className="text-xs text-gray-600">Google Meet, Zoom, Microsoft Teams, etc.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="address">Dirección</Label>
                    <Input
                      id="address"
                      placeholder="Calle, número, etc."
                      value={formData.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city">
                        Ciudad <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="city"
                        placeholder="Madrid"
                        value={formData.city}
                        onChange={(e) => handleInputChange('city', e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="country">País</Label>
                      <Input
                        id="country"
                        placeholder="España"
                        value={formData.country}
                        onChange={(e) => handleInputChange('country', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="latitude">Latitud (opcional)</Label>
                      <Input
                        id="latitude"
                        type="number"
                        step="any"
                        placeholder="40.4168"
                        value={formData.latitude || ''}
                        onChange={(e) => handleInputChange('latitude', e.target.value ? parseFloat(e.target.value) : undefined)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="longitude">Longitud (opcional)</Label>
                      <Input
                        id="longitude"
                        type="number"
                        step="any"
                        placeholder="-3.7038"
                        value={formData.longitude || ''}
                        onChange={(e) => handleInputChange('longitude', e.target.value ? parseFloat(e.target.value) : undefined)}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Configuración adicional */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Configuración Adicional</h3>

              <div className="space-y-2">
                <Label htmlFor="max_attendees">Número máximo de asistentes</Label>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-gray-500" />
                  <Input
                    id="max_attendees"
                    type="number"
                    min="1"
                    placeholder="Sin límite"
                    value={formData.max_attendees || ''}
                    onChange={(e) =>
                      handleInputChange('max_attendees', e.target.value ? parseInt(e.target.value) : undefined)
                    }
                  />
                </div>
                <p className="text-xs text-gray-600">Deja vacío para eventos sin límite de asistentes</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="image_url">URL de imagen (opcional)</Label>
                <div className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-gray-500" />
                  <Input
                    id="image_url"
                    type="url"
                    placeholder="https://ejemplo.com/imagen.jpg"
                    value={formData.image_url}
                    onChange={(e) => handleInputChange('image_url', e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <Label htmlFor="is_public" className="font-medium">
                    Evento Público
                  </Label>
                  <p className="text-sm text-gray-600">
                    {formData.is_public
                      ? 'Cualquiera puede ver y unirse al evento'
                      : 'Solo usuarios invitados pueden ver el evento'}
                  </p>
                </div>
                <Switch
                  id="is_public"
                  checked={formData.is_public}
                  onCheckedChange={(checked) => handleInputChange('is_public', checked)}
                />
              </div>
            </div>

            {/* Botones */}
            <div className="flex gap-3 pt-6">
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? 'Creando...' : 'Crear Evento'}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate({ to: '/events' })} disabled={loading}>
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
