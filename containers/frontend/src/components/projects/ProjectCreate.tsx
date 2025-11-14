import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { createProject, CreateProjectData } from '@/services/projects/projectsApi'
import { Briefcase, Users, Calendar, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

const PROJECT_STATUSES = [
  { value: 'draft', label: 'Borrador' },
  { value: 'active', label: 'Activo' },
  { value: 'completed', label: 'Completado' },
  { value: 'cancelled', label: 'Cancelado' },
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

export function ProjectCreate() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [skillInput, setSkillInput] = useState('')
  const [formData, setFormData] = useState<CreateProjectData>({
    title: '',
    description: '',
    status: 'draft',
    start_date: '',
    end_date: '',
    required_skills: [],
    max_members: undefined,
    is_public: true,
    category: '',
    image_url: '',
  })

  const handleInputChange = (field: keyof CreateProjectData, value: any) => {
    setFormData({ ...formData, [field]: value })
  }

  const handleAddSkill = () => {
    if (!skillInput.trim()) return
    if (formData.required_skills?.includes(skillInput.trim())) {
      toast.error('Esta habilidad ya está agregada')
      return
    }

    setFormData({
      ...formData,
      required_skills: [...(formData.required_skills || []), skillInput.trim()],
    })
    setSkillInput('')
  }

  const handleRemoveSkill = (skill: string) => {
    setFormData({
      ...formData,
      required_skills: formData.required_skills?.filter((s) => s !== skill),
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validaciones
    if (!formData.title.trim()) {
      toast.error('El título es obligatorio')
      return
    }

    try {
      setLoading(true)
      const response = await createProject(formData)
      toast.success('Proyecto creado correctamente')
      navigate({ to: '/projects/$projectId', params: { projectId: response.project.id.toString() } })
    } catch (error: any) {
      console.error('Error creating project:', error)
      toast.error(error.response?.data?.error || 'Error al crear el proyecto')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl flex items-center gap-2">
            <Briefcase className="h-8 w-8" />
            Crear Nuevo Proyecto
          </CardTitle>
          <CardDescription>Inicia un proyecto colaborativo y encuentra tu equipo</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Información básica */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Información Básica</h3>

              <div className="space-y-2">
                <Label htmlFor="title">
                  Título del Proyecto <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="title"
                  placeholder="Ej: Aplicación Web para Gestión de Eventos"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descripción del Proyecto</Label>
                <Textarea
                  id="description"
                  placeholder="Describe tu proyecto, objetivos, requisitos..."
                  rows={6}
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                />
                <p className="text-xs text-gray-600">
                  Explica qué es tu proyecto, qué quieres lograr y qué tipo de colaboradores buscas
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="status">Estado del Proyecto</Label>
                  <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROJECT_STATUSES.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
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

            {/* Fechas */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Fechas (Opcional)
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Fecha de inicio</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => handleInputChange('start_date', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="end_date">Fecha de finalización</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => handleInputChange('end_date', e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Habilidades requeridas */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Habilidades Requeridas</h3>

              <div className="space-y-2">
                <Label htmlFor="skill_input">Agregar Habilidad</Label>
                <div className="flex gap-2">
                  <Input
                    id="skill_input"
                    placeholder="Ej: React, Python, Diseño UI/UX..."
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddSkill()
                      }
                    }}
                  />
                  <Button type="button" variant="outline" onClick={handleAddSkill}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-gray-600">Presiona Enter o haz clic en + para agregar</p>
              </div>

              {formData.required_skills && formData.required_skills.length > 0 && (
                <div className="flex flex-wrap gap-2 p-4 bg-gray-50 rounded-lg">
                  {formData.required_skills.map((skill, idx) => (
                    <Badge key={idx} variant="secondary" className="flex items-center gap-1">
                      {skill}
                      <button type="button" onClick={() => handleRemoveSkill(skill)} className="ml-1 hover:text-red-600">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Configuración adicional */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Configuración del Equipo</h3>

              <div className="space-y-2">
                <Label htmlFor="max_members">Número máximo de miembros</Label>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-gray-500" />
                  <Input
                    id="max_members"
                    type="number"
                    min="1"
                    placeholder="Sin límite"
                    value={formData.max_members || ''}
                    onChange={(e) =>
                      handleInputChange('max_members', e.target.value ? parseInt(e.target.value) : undefined)
                    }
                  />
                </div>
                <p className="text-xs text-gray-600">Deja vacío para proyectos sin límite de miembros</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="image_url">URL de imagen (opcional)</Label>
                <Input
                  id="image_url"
                  type="url"
                  placeholder="https://ejemplo.com/imagen.jpg"
                  value={formData.image_url}
                  onChange={(e) => handleInputChange('image_url', e.target.value)}
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <Label htmlFor="is_public" className="font-medium">
                    Proyecto Público
                  </Label>
                  <p className="text-sm text-gray-600">
                    {formData.is_public
                      ? 'Cualquiera puede ver y unirse al proyecto'
                      : 'Solo usuarios invitados pueden ver el proyecto'}
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
                {loading ? 'Creando...' : 'Crear Proyecto'}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate({ to: '/projects' })} disabled={loading}>
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
