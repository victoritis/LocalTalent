import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import { Link } from '@tanstack/react-router'
import L from 'leaflet'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { MapPin, Navigation, Search } from 'lucide-react'
import { ErrorBoundary } from '@/components/error/ErrorBoundary'
import { ErrorState } from '@/components/ui/error-state'

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

interface MapView {
  center: [number, number]
  zoom: number
}

interface MapAreaSearchInfo extends MapView {
  bounds: {
    north: number
    south: number
    east: number
    west: number
  }
}

interface InteractiveMapProps {
  users: UserLocation[]
  /** Called when the user presses "search in this area" after moving the map. */
  onSearchArea?: (info: MapAreaSearchInfo) => void
  /** Optional key to scope the persisted view per user. */
  viewStorageKey?: string
}

// Función para obtener el color por categoría
function getCategoryColor(category?: string): string {
  const colors: Record<string, string> = {
    musician: '#9333ea',
    artist: '#ec4899',
    developer: '#3b82f6',
    designer: '#06b6d4',
    photographer: '#14b8a6',
    writer: '#8b5cf6',
    chef: '#f59e0b',
    athlete: '#ef4444',
    teacher: '#10b981',
    other: '#6b7280',
  }
  return colors[category || 'other'] || colors.other
}

function getCategoryIcon(category?: string): L.DivIcon {
  const color = getCategoryColor(category)
  const iconSvg = `
    <svg width="32" height="42" viewBox="0 0 32 42" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Marcador de talento">
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
    popupAnchor: [0, -42],
  })
}

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

// Fix Leaflet default icon paths
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

const DEFAULT_VIEW_KEY = 'localtalent.map.view'

function loadPersistedView(storageKey: string): MapView | null {
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    const center = parsed?.center
    const zoom = parsed?.zoom
    if (
      Array.isArray(center) &&
      typeof center[0] === 'number' &&
      typeof center[1] === 'number' &&
      typeof zoom === 'number'
    ) {
      return { center: [center[0], center[1]], zoom }
    }
  } catch {
    /* ignore */
  }
  return null
}

function persistView(storageKey: string, view: MapView) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(view))
  } catch {
    /* ignore quota/serialization errors */
  }
}

interface MapStateSyncProps {
  storageKey: string
  onChange: (view: MapView) => void
}

function MapStateSync({ storageKey, onChange }: MapStateSyncProps) {
  const map = useMapEvents({
    moveend: () => {
      const center = map.getCenter()
      const view: MapView = { center: [center.lat, center.lng], zoom: map.getZoom() }
      persistView(storageKey, view)
      onChange(view)
    },
    zoomend: () => {
      const center = map.getCenter()
      const view: MapView = { center: [center.lat, center.lng], zoom: map.getZoom() }
      persistView(storageKey, view)
      onChange(view)
    },
  })
  return null
}

/**
 * Fit the map to the users, but only the first time (or when changing filters with no view persisted).
 * Avoids fighting the user's manual pans.
 */
function AutoFitBounds({ users, enabled }: { users: UserLocation[]; enabled: boolean }) {
  const map = useMap()
  const didFitRef = useRef(false)

  useEffect(() => {
    if (!enabled || didFitRef.current) return
    if (users.length === 0) return
    const bounds = L.latLngBounds(users.map((u) => [u.latitude, u.longitude]))
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 })
      didFitRef.current = true
    }
  }, [users, map, enabled])

  return null
}

function FallbackList({ users }: { users: UserLocation[] }) {
  return (
    <div className="space-y-2" role="region" aria-label="Lista de talentos (vista de respaldo del mapa)">
      <p className="text-sm text-muted-foreground">
        No se pudo cargar el mapa. Mostrando la lista como alternativa.
      </p>
      <ul className="divide-y rounded-lg border bg-card">
        {users.slice(0, 100).map((user) => (
          <li key={user.id} className="p-3 flex items-center gap-3">
            <Avatar className="w-10 h-10">
              <AvatarImage src={user.profile_image} alt={user.username} />
              <AvatarFallback>
                {`${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <Link
                to="/auth/user/$username"
                params={{ username: user.username }}
                className="font-medium truncate hover:underline"
              >
                {user.first_name} {user.last_name}
              </Link>
              <p className="text-xs text-muted-foreground truncate">
                {user.city}, {user.country}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function buildDirectionsHref(lat: number, lng: number) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
}

function InteractiveMapInner({
  users,
  onSearchArea,
  viewStorageKey = DEFAULT_VIEW_KEY,
}: InteractiveMapProps) {
  const mapRef = useRef<L.Map | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [viewDirty, setViewDirty] = useState(false)
  const [currentView, setCurrentView] = useState<MapView | null>(null)

  const persistedView = useMemo(() => loadPersistedView(viewStorageKey), [viewStorageKey])
  const defaultCenter: [number, number] = persistedView?.center ?? [20, 0]
  const defaultZoom = persistedView?.zoom ?? 2

  const filteredUsers = useMemo(
    () =>
      selectedCategory === 'all' ? users : users.filter((u) => u.category === selectedCategory),
    [users, selectedCategory],
  )

  const handleViewChange = useCallback((view: MapView) => {
    setCurrentView(view)
    setViewDirty(true)
  }, [])

  const handleSearchArea = useCallback(() => {
    if (!onSearchArea) return
    const map = mapRef.current
    if (!map) return
    const bounds = map.getBounds()
    const center = map.getCenter()
    onSearchArea({
      center: [center.lat, center.lng],
      zoom: map.getZoom(),
      bounds: {
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest(),
      },
    })
    setViewDirty(false)
  }, [onSearchArea])

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-wrap items-center gap-3 p-4 bg-card rounded-lg border shadow-sm">
        <label htmlFor="map-category-filter" className="text-sm font-medium">
          Filtrar por categoría:
        </label>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger id="map-category-filter" className="w-[250px]">
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
          {filteredUsers.length}{' '}
          {filteredUsers.length === 1 ? 'usuario encontrado' : 'usuarios encontrados'}
        </span>

        {onSearchArea && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleSearchArea}
            disabled={!viewDirty}
            className="ml-auto gap-2"
            aria-label="Buscar talentos en el área visible del mapa"
          >
            <Search aria-hidden="true" className="h-4 w-4" />
            Buscar en esta área
          </Button>
        )}
      </div>

      <div
        className="w-full rounded-lg overflow-hidden border shadow-sm aspect-[16/10] md:aspect-[16/8]"
        role="application"
        aria-label="Mapa interactivo de talentos"
      >
        <MapContainer
          center={defaultCenter}
          zoom={defaultZoom}
          style={{ height: '100%', width: '100%' }}
          ref={(instance) => {
            mapRef.current = instance ?? null
          }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapStateSync storageKey={viewStorageKey} onChange={handleViewChange} />
          <AutoFitBounds users={filteredUsers} enabled={!persistedView && !currentView} />

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

                      <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                        <MapPin aria-hidden="true" className="w-3 h-3" />
                        <span>
                          {user.city}, {user.country}
                        </span>
                      </div>

                      {user.category && (
                        <div className="mb-3">
                          <Badge
                            className="text-xs"
                            style={{
                              backgroundColor: getCategoryColor(user.category),
                              color: 'white',
                            }}
                          >
                            {getCategoryLabel(user.category)}
                          </Badge>
                        </div>
                      )}

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

                      <div className="flex flex-col gap-1">
                        <Link
                          to="/auth/user/$username"
                          params={{ username: user.username }}
                          className="text-sm text-primary hover:underline font-medium inline-block"
                        >
                          Ver perfil completo →
                        </Link>
                        <a
                          href={buildDirectionsHref(user.latitude, user.longitude)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm inline-flex items-center gap-1 hover:underline"
                          aria-label={`Cómo llegar a ${user.first_name} ${user.last_name} en ${user.city}`}
                        >
                          <Navigation aria-hidden="true" className="w-3 h-3" />
                          Cómo llegar
                        </a>
                      </div>
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

export function InteractiveMap(props: InteractiveMapProps) {
  return (
    <ErrorBoundary
      fallback={(error, reset) => (
        <div className="space-y-4">
          <ErrorState
            title="No se pudo cargar el mapa"
            message={error.message || 'Ha ocurrido un error inesperado al renderizar el mapa.'}
            onRetry={reset}
          />
          <FallbackList users={props.users} />
        </div>
      )}
    >
      <InteractiveMapInner {...props} />
    </ErrorBoundary>
  )
}
