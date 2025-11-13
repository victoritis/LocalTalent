import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import { Link } from '@tanstack/react-router'
import L from 'leaflet'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MapPin, Music, Palette, Code, Pencil, Camera, FileText, ChefHat, Trophy, GraduationCap, User } from 'lucide-react'

interface UserLocation {
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
  category?: string
}

interface InteractiveMapProps {
  users: UserLocation[]
}

// Función para obtener el color por categoría
function getCategoryColor(category?: string): string {
  const colors: Record<string, string> = {
    musician: '#9333ea', // purple
    artist: '#ec4899', // pink
    developer: '#3b82f6', // blue
    designer: '#06b6d4', // cyan
    photographer: '#14b8a6', // teal
    writer: '#8b5cf6', // violet
    chef: '#f59e0b', // amber
    athlete: '#ef4444', // red
    teacher: '#10b981', // green
    other: '#6b7280', // gray
  }
  return colors[category || 'other'] || colors.other
}

// Función para obtener el icono SVG por categoría
function getCategoryIcon(category?: string): L.DivIcon {
  const color = getCategoryColor(category)

  const iconSvg = `
    <svg width="32" height="42" viewBox="0 0 32 42" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 0C7.163 0 0 7.163 0 16c0 12 16 26 16 26s16-14 16-26C32 7.163 24.837 0 16 0z"
            fill="${color}" stroke="#fff" stroke-width="2"/>
      <circle cx="16" cy="16" r="8" fill="#fff"/>
    </svg>
  `

  return L.divIcon({
    html: iconSvg,
    className: 'custom-marker-icon',
    iconSize: [32, 42],
    iconAnchor: [16, 42],
    popupAnchor: [0, -42]
  })
}

// Función para obtener el label de categoría
function getCategoryLabel(category?: string): string {
  const labels: Record<string, string> = {
    musician: 'Músico',
    artist: 'Artista',
    developer: 'Desarrollador',
    designer: 'Diseñador',
    photographer: 'Fotógrafo',
    writer: 'Escritor',
    chef: 'Chef',
    athlete: 'Atleta',
    teacher: 'Profesor',
    other: 'Otro',
  }
  return labels[category || 'other'] || labels.other
}

// Categorías disponibles para el filtro
const categories = [
  { value: 'all', label: 'Todas las categorías' },
  { value: 'musician', label: 'Músicos' },
  { value: 'artist', label: 'Artistas' },
  { value: 'developer', label: 'Desarrolladores' },
  { value: 'designer', label: 'Diseñadores' },
  { value: 'photographer', label: 'Fotógrafos' },
  { value: 'writer', label: 'Escritores' },
  { value: 'chef', label: 'Chefs' },
  { value: 'athlete', label: 'Atletas' },
  { value: 'teacher', label: 'Profesores' },
  { value: 'other', label: 'Otros' },
]

// Fix para los iconos de Leaflet en producción
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

// Componente para ajustar los límites del mapa cuando cambian los usuarios
function MapBounds({ users }: { users: UserLocation[] }) {
  const map = useMap()

  useEffect(() => {
    if (users.length > 0) {
      const bounds = L.latLngBounds(
        users.map(user => [user.latitude, user.longitude])
      )
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 })
    }
  }, [users, map])

  return null
}

export function InteractiveMap({ users }: InteractiveMapProps) {
  const mapRef = useRef(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  // Centro por defecto (mundo)
  const defaultCenter: [number, number] = [20, 0]
  const defaultZoom = 2

  // Filtrar usuarios por categoría
  const filteredUsers = selectedCategory === 'all'
    ? users
    : users.filter(user => user.category === selectedCategory)

  return (
    <div className="w-full space-y-4">
      {/* Filtro de categoría */}
      <div className="flex items-center gap-4 p-4 bg-card rounded-lg border shadow-sm">
        <label className="text-sm font-medium">Filtrar por categoría:</label>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder="Seleccionar categoría" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">
          {filteredUsers.length} {filteredUsers.length === 1 ? 'usuario encontrado' : 'usuarios encontrados'}
        </span>
      </div>

      {/* Mapa */}
      <div className="w-full h-[600px] rounded-lg overflow-hidden border shadow-sm">
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        style={{ height: '100%', width: '100%' }}
        ref={mapRef}
        scrollWheelZoom={true}
      >
        {/* Capa de azulejos de OpenStreetMap */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Ajustar límites cuando cambian los usuarios */}
        <MapBounds users={filteredUsers} />

        {/* Grupo de clusters para marcadores */}
        <MarkerClusterGroup
          chunkedLoading
          maxClusterRadius={50}
          spiderfyOnMaxZoom={true}
          showCoverageOnHover={false}
          zoomToBoundsOnClick={true}
        >
          {filteredUsers.map((user) => {
            const initials = `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase()

            return (
              <Marker
                key={user.id}
                position={[user.latitude, user.longitude]}
                icon={getCategoryIcon(user.category)}
              >
                <Popup>
                  <div className="min-w-[250px] p-2">
                    {/* Header con avatar y nombre */}
                    <div className="flex items-start gap-3 mb-3">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={user.profile_image} alt={user.username} />
                        <AvatarFallback>{initials}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-base truncate">
                          {user.first_name} {user.last_name}
                        </h3>
                        <p className="text-sm text-muted-foreground truncate">
                          @{user.username}
                        </p>
                      </div>
                    </div>

                    {/* Ubicación */}
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                      <MapPin className="w-3 h-3" />
                      <span>{user.city}, {user.country}</span>
                    </div>

                    {/* Categoría */}
                    {user.category && (
                      <div className="mb-3">
                        <Badge
                          className="text-xs"
                          style={{
                            backgroundColor: getCategoryColor(user.category),
                            color: 'white'
                          }}
                        >
                          {getCategoryLabel(user.category)}
                        </Badge>
                      </div>
                    )}

                    {/* Habilidades */}
                    {user.skills && user.skills.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs font-medium text-muted-foreground mb-1">
                          Habilidades:
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {user.skills.slice(0, 4).map((skill, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                          {user.skills.length > 4 && (
                            <Badge variant="outline" className="text-xs">
                              +{user.skills.length - 4}
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Link al perfil */}
                    <Link
                      to="/auth/user/$username"
                      params={{ username: user.username }}
                      className="text-sm text-primary hover:underline font-medium inline-block"
                    >
                      Ver perfil completo →
                    </Link>
                  </div>
                </Popup>
              </Marker>
            )
          })}
        </MarkerClusterGroup>
      </MapContainer>
      </div>
    </div>
  )
}
