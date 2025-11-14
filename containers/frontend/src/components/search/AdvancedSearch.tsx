import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { StarRatingDisplay } from '@/components/reviews/StarRating'
import { SlidersHorizontal, Search, MapPin, X, Loader2, Bookmark } from 'lucide-react'
import { toast } from 'sonner'

interface SearchFilters {
  query?: string
  radius?: number
  latitude?: number
  longitude?: number
  skills?: string[]
  category?: string
  sort_by?: 'distance' | 'rating' | 'created_at'
  page?: number
  per_page?: number
}

interface SearchResult {
  id: number
  username: string
  first_name: string
  last_name: string
  profile_image: string
  city: string
  country: string
  latitude: number
  longitude: number
  skills: string[]
  category: string
  bio?: string
  distance?: number
  average_rating: number
  review_count: number
}

interface AdvancedSearchProps {
  onResultsChange?: (results: SearchResult[]) => void
  initialFilters?: SearchFilters
}

export function AdvancedSearch({ onResultsChange, initialFilters }: AdvancedSearchProps) {
  const [open, setOpen] = useState(false)
  const [filters, setFilters] = useState<SearchFilters>(initialFilters || {})
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [totalResults, setTotalResults] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [categories, setCategories] = useState<{ value: string; label: string }[]>([])
  const [skillInput, setSkillInput] = useState('')

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/v1/categories', {
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        setCategories(data.categories || [])
      }
    } catch (err) {
      console.error('Error fetching categories:', err)
    }
  }

  const handleSearch = async () => {
    try {
      setLoading(true)

      // Construir query params
      const params = new URLSearchParams()
      if (filters.query) params.append('query', filters.query)
      if (filters.radius) params.append('radius', filters.radius.toString())
      if (filters.latitude) params.append('latitude', filters.latitude.toString())
      if (filters.longitude) params.append('longitude', filters.longitude.toString())
      if (filters.skills && filters.skills.length > 0) {
        params.append('skills', filters.skills.join(','))
      }
      if (filters.category) params.append('category', filters.category)
      if (filters.sort_by) params.append('sort_by', filters.sort_by)
      if (filters.page) params.append('page', filters.page.toString())
      if (filters.per_page) params.append('per_page', filters.per_page.toString())

      const response = await fetch(`/api/v1/users/search?${params.toString()}`, {
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Error en la búsqueda')
      }

      const data = await response.json()
      setResults(data.users || [])
      setTotalResults(data.pagination?.total || 0)
      setTotalPages(data.pagination?.total_pages || 0)
      onResultsChange?.(data.users || [])
    } catch (err) {
      toast.error('Error al realizar la búsqueda')
    } finally {
      setLoading(false)
    }
  }

  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFilters({
            ...filters,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          })
          toast.success('Ubicación obtenida')
        },
        () => {
          toast.error('No se pudo obtener la ubicación')
        }
      )
    } else {
      toast.error('Geolocalización no disponible')
    }
  }

  const addSkill = () => {
    if (skillInput.trim() && !filters.skills?.includes(skillInput.trim())) {
      setFilters({
        ...filters,
        skills: [...(filters.skills || []), skillInput.trim()],
      })
      setSkillInput('')
    }
  }

  const removeSkill = (skill: string) => {
    setFilters({
      ...filters,
      skills: filters.skills?.filter((s) => s !== skill) || [],
    })
  }

  const clearFilters = () => {
    setFilters({})
    setResults([])
    setTotalResults(0)
  }

  const saveSearch = async () => {
    const name = prompt('Nombre para esta búsqueda:')
    if (!name) return

    try {
      const response = await fetch('/api/v1/saved-searches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          name,
          search_params: filters,
        }),
      })

      if (!response.ok) {
        throw new Error('Error al guardar la búsqueda')
      }

      toast.success('Búsqueda guardada correctamente')
    } catch (err) {
      toast.error('Error al guardar la búsqueda')
    }
  }

  return (
    <div className="space-y-4">
      {/* Trigger y barra de búsqueda rápida */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o username..."
            value={filters.query || ''}
            onChange={(e) => setFilters({ ...filters, query: e.target.value })}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            className="pl-10"
          />
        </div>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon">
              <SlidersHorizontal className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Búsqueda Avanzada</SheetTitle>
              <SheetDescription>
                Encuentra talentos cercanos con filtros personalizados
              </SheetDescription>
            </SheetHeader>

            <div className="mt-6 space-y-6">
              {/* Búsqueda por texto */}
              <div className="space-y-2">
                <Label>Buscar por nombre</Label>
                <Input
                  placeholder="Nombre o username..."
                  value={filters.query || ''}
                  onChange={(e) => setFilters({ ...filters, query: e.target.value })}
                />
              </div>

              {/* Categoría */}
              <div className="space-y-2">
                <Label>Categoría</Label>
                <Select
                  value={filters.category || ''}
                  onValueChange={(value) =>
                    setFilters({ ...filters, category: value || undefined })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todas las categorías" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todas las categorías</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Habilidades */}
              <div className="space-y-2">
                <Label>Habilidades</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Añadir habilidad..."
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addSkill()}
                  />
                  <Button type="button" onClick={addSkill} size="sm">
                    Añadir
                  </Button>
                </div>
                {filters.skills && filters.skills.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {filters.skills.map((skill) => (
                      <Badge key={skill} variant="secondary">
                        {skill}
                        <button
                          onClick={() => removeSkill(skill)}
                          className="ml-2 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Ubicación y radio */}
              <div className="space-y-2">
                <Label>Radio de búsqueda (km)</Label>
                <Input
                  type="number"
                  placeholder="Ej: 50"
                  value={filters.radius || ''}
                  onChange={(e) =>
                    setFilters({ ...filters, radius: parseFloat(e.target.value) || undefined })
                  }
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleUseCurrentLocation}
                  className="w-full mt-2"
                >
                  <MapPin className="h-4 w-4 mr-2" />
                  Usar mi ubicación actual
                </Button>
                {filters.latitude && filters.longitude && (
                  <p className="text-xs text-muted-foreground">
                    Ubicación: {filters.latitude.toFixed(4)}, {filters.longitude.toFixed(4)}
                  </p>
                )}
              </div>

              {/* Ordenar por */}
              <div className="space-y-2">
                <Label>Ordenar por</Label>
                <Select
                  value={filters.sort_by || 'created_at'}
                  onValueChange={(value: any) => setFilters({ ...filters, sort_by: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="created_at">Más recientes</SelectItem>
                    <SelectItem value="distance">Más cercanos</SelectItem>
                    <SelectItem value="rating">Mejor valorados</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Acciones */}
              <div className="flex gap-2">
                <Button onClick={handleSearch} disabled={loading} className="flex-1">
                  {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Buscar
                </Button>
                <Button variant="outline" onClick={clearFilters}>
                  Limpiar
                </Button>
                <Button variant="outline" size="icon" onClick={saveSearch}>
                  <Bookmark className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
        <Button onClick={handleSearch} disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Buscar
        </Button>
      </div>

      {/* Resultados */}
      {totalResults > 0 && (
        <div className="text-sm text-muted-foreground">
          {totalResults} {totalResults === 1 ? 'resultado encontrado' : 'resultados encontrados'}
        </div>
      )}

      <div className="grid gap-4">
        {results.map((user) => (
          <Card key={user.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={user.profile_image} alt={user.first_name} />
                  <AvatarFallback>
                    {user.first_name[0]}
                    {user.last_name[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">
                        {user.first_name} {user.last_name}
                      </h3>
                      <p className="text-sm text-muted-foreground">@{user.username}</p>
                    </div>
                    {user.distance !== undefined && user.distance !== null && (
                      <Badge variant="outline">
                        <MapPin className="h-3 w-3 mr-1" />
                        {user.distance.toFixed(1)} km
                      </Badge>
                    )}
                  </div>

                  <div className="mt-2">
                    <StarRatingDisplay
                      rating={user.average_rating}
                      reviewCount={user.review_count}
                      size="sm"
                    />
                  </div>

                  {user.category && (
                    <Badge variant="secondary" className="mt-2">
                      {user.category}
                    </Badge>
                  )}

                  {user.skills && user.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {user.skills.slice(0, 3).map((skill) => (
                        <Badge key={skill} variant="outline" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                      {user.skills.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{user.skills.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}

                  {user.bio && (
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{user.bio}</p>
                  )}

                  <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    {user.city}, {user.country}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => (window.location.href = `/profile/${user.username}`)}
                  >
                    Ver perfil
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!filters.page || filters.page <= 1}
            onClick={() => {
              setFilters({ ...filters, page: (filters.page || 1) - 1 })
              handleSearch()
            }}
          >
            Anterior
          </Button>
          <div className="flex items-center px-4">
            Página {filters.page || 1} de {totalPages}
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={filters.page === totalPages}
            onClick={() => {
              setFilters({ ...filters, page: (filters.page || 1) + 1 })
              handleSearch()
            }}
          >
            Siguiente
          </Button>
        </div>
      )}
    </div>
  )
}
