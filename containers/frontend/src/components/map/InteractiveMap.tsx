import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import { Link } from '@tanstack/react-router'
import L from 'leaflet'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { MapPin } from 'lucide-react'

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
}

interface InteractiveMapProps {
  users: UserLocation[]
}

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

  // Centro por defecto (mundo)
  const defaultCenter: [number, number] = [20, 0]
  const defaultZoom = 2

  return (
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
        <MapBounds users={users} />

        {/* Grupo de clusters para marcadores */}
        <MarkerClusterGroup
          chunkedLoading
          maxClusterRadius={50}
          spiderfyOnMaxZoom={true}
          showCoverageOnHover={false}
          zoomToBoundsOnClick={true}
        >
          {users.map((user) => {
            const initials = `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase()

            return (
              <Marker
                key={user.id}
                position={[user.latitude, user.longitude]}
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
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
                      <MapPin className="w-3 h-3" />
                      <span>{user.city}, {user.country}</span>
                    </div>

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
  )
}
