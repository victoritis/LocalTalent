import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MapPin, Loader2, Check, AlertCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Fix for default marker icon in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

interface LocationSelectorProps {
  address?: string
  city?: string
  country?: string
  latitude?: number | null
  longitude?: number | null
  onLocationChange?: (location: {
    address: string
    city: string
    country: string
    latitude: number
    longitude: number
  }) => void
  disabled?: boolean
  defaultCountryCode?: string // Código de país para filtrar (ej: 'es' para España)
}

interface GeocodingResult {
  lat: string
  lon: string
  display_name: string
  importance: number // Indica la importancia/precisión del resultado
  type: string // Tipo de lugar (road, house, city, etc.)
  address: {
    city?: string
    town?: string
    village?: string
    country?: string
    state?: string
    road?: string
    house_number?: string
    postcode?: string
  }
}

export function LocationSelector({
  address = '',
  city = '',
  country = '',
  latitude,
  longitude,
  onLocationChange,
  disabled = false,
  defaultCountryCode = 'es' // Por defecto España
}: LocationSelectorProps) {
  const { toast } = useToast()
  const [searching, setSearching] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [localAddress, setLocalAddress] = useState(address)
  const [localCity, setLocalCity] = useState(city)
  const [localCountry, setLocalCountry] = useState(country)
  const [localLatitude, setLocalLatitude] = useState<number | null>(latitude ?? null)
  const [localLongitude, setLocalLongitude] = useState<number | null>(longitude ?? null)
  const [searchResults, setSearchResults] = useState<GeocodingResult[]>([])
  const [showResults, setShowResults] = useState(false)

  useEffect(() => {
    setLocalAddress(address)
    setLocalCity(city)
    setLocalCountry(country)
    setLocalLatitude(latitude ?? null)
    setLocalLongitude(longitude ?? null)
  }, [address, city, country, latitude, longitude])

  const selectResult = (result: GeocodingResult) => {
    const cityName = result.address.city || result.address.town || result.address.village || ''
    const countryName = result.address.country || ''
    const streetAddress = result.address.road
      ? `${result.address.house_number || ''} ${result.address.road}`.trim()
      : result.display_name.split(',')[0]

    setLocalAddress(streetAddress)
    setLocalCity(cityName)
    setLocalCountry(countryName)
    setLocalLatitude(parseFloat(result.lat))
    setLocalLongitude(parseFloat(result.lon))
    setShowResults(false)
    setSearchResults([])

    if (onLocationChange) {
      onLocationChange({
        address: streetAddress,
        city: cityName,
        country: countryName,
        latitude: parseFloat(result.lat),
        longitude: parseFloat(result.lon)
      })
    }

    toast({
      title: 'Ubicación seleccionada',
      description: `${cityName}, ${countryName}`
    })
  }

  const searchLocation = async () => {
    if (!searchQuery.trim()) {
      toast({
        title: 'Error',
        description: 'Por favor ingresa una dirección',
        variant: 'destructive'
      })
      return
    }

    setSearching(true)
    setSearchResults([])
    setShowResults(false)

    try {
      // Construir URL con filtrado por país si está configurado
      let searchUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&addressdetails=1&limit=5`

      if (defaultCountryCode) {
        searchUrl += `&countrycodes=${defaultCountryCode}`
      }

      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'LocalTalent/1.0'
        }
      })

      if (!response.ok) {
        throw new Error('Error en la búsqueda')
      }

      const data: GeocodingResult[] = await response.json()

      if (data.length === 0) {
        toast({
          title: 'No encontrado',
          description: 'No se encontró la ubicación. Intenta con una dirección más específica como "Calle Mayor 1, Burgos, España".',
          variant: 'destructive'
        })
        return
      }

      // Si solo hay un resultado con alta precisión, seleccionarlo automáticamente
      if (data.length === 1 || (data[0].importance > 0.6 && data[0].type === 'house')) {
        selectResult(data[0])
      } else {
        // Mostrar múltiples resultados para que el usuario elija
        setSearchResults(data)
        setShowResults(true)
        toast({
          title: `${data.length} ubicaciones encontradas`,
          description: 'Selecciona la correcta de la lista'
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo buscar la ubicación',
        variant: 'destructive'
      })
    } finally {
      setSearching(false)
    }
  }

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: 'Error',
        description: 'Tu navegador no soporta geolocalización',
        variant: 'destructive'
      })
      return
    }

    setSearching(true)
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords

          // Reverse geocoding
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`,
            {
              headers: {
                'User-Agent': 'LocalTalent/1.0'
              }
            }
          )

          if (!response.ok) {
            throw new Error('Error en la búsqueda')
          }

          const data: GeocodingResult = await response.json()
          const cityName = data.address.city || data.address.town || data.address.village || ''
          const countryName = data.address.country || ''
          const streetAddress = data.address.road
            ? `${data.address.house_number || ''} ${data.address.road}`.trim()
            : data.display_name.split(',')[0]

          setLocalAddress(streetAddress)
          setLocalCity(cityName)
          setLocalCountry(countryName)
          setLocalLatitude(latitude)
          setLocalLongitude(longitude)

          if (onLocationChange) {
            onLocationChange({
              address: streetAddress,
              city: cityName,
              country: countryName,
              latitude,
              longitude
            })
          }

          toast({
            title: 'Ubicación detectada',
            description: `${cityName}, ${countryName}`
          })
        } catch (error) {
          toast({
            title: 'Error',
            description: 'No se pudo obtener la ubicación',
            variant: 'destructive'
          })
        } finally {
          setSearching(false)
        }
      },
      (error) => {
        setSearching(false)
        toast({
          title: 'Error',
          description: 'No se pudo acceder a tu ubicación',
          variant: 'destructive'
        })
      }
    )
  }

  // Función auxiliar para obtener un ícono de calidad basado en la importancia
  const getQualityIcon = (importance: number) => {
    if (importance > 0.6) {
      return <Check className="w-4 h-4 text-green-600" />
    } else if (importance > 0.4) {
      return <AlertCircle className="w-4 h-4 text-yellow-600" />
    }
    return <AlertCircle className="w-4 h-4 text-orange-600" />
  }

  // Función auxiliar para obtener descripción de precisión
  const getPrecisionLabel = (result: GeocodingResult) => {
    if (result.type === 'house' || result.type === 'building') {
      return 'Dirección exacta'
    } else if (result.type === 'road' || result.type === 'street') {
      return 'Calle'
    } else if (result.type === 'city' || result.type === 'town' || result.type === 'village') {
      return 'Ciudad/Población'
    }
    return 'Aproximado'
  }

  return (
    <div className="space-y-4">
      {/* Búsqueda de ubicación */}
      <div className="flex gap-2">
        <div className="flex-1">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar dirección (ej: Calle Mayor 1, Burgos)"
            disabled={disabled || searching}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                searchLocation()
              }
            }}
          />
        </div>
        <Button
          onClick={searchLocation}
          disabled={disabled || searching}
          variant="outline"
        >
          {searching ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <MapPin className="w-4 h-4 mr-2" />
              Buscar
            </>
          )}
        </Button>
        <Button
          onClick={getCurrentLocation}
          disabled={disabled || searching}
          variant="outline"
          title="Usar mi ubicación actual"
        >
          <MapPin className="w-4 h-4" />
        </Button>
      </div>

      {/* Lista de resultados múltiples */}
      {showResults && searchResults.length > 0 && (
        <div className="border rounded-md divide-y max-h-60 overflow-y-auto">
          {searchResults.map((result, index) => (
            <button
              key={index}
              onClick={() => selectResult(result)}
              className="w-full p-3 hover:bg-muted transition-colors text-left flex items-start gap-3"
            >
              <div className="mt-1">
                {getQualityIcon(result.importance)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">
                  {result.display_name}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground">
                    {getPrecisionLabel(result)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    • Precisión: {(result.importance * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Vista previa de la ubicación seleccionada */}
      {(localCity || localCountry) && (
        <div className="space-y-3">
          <div className="p-3 bg-muted rounded-md">
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground" />
              <div className="flex-1 text-sm">
                {localAddress && <div className="font-medium">{localAddress}</div>}
                <div className="text-muted-foreground">
                  {localCity && localCountry
                    ? `${localCity}, ${localCountry}`
                    : localCity || localCountry}
                </div>
                {localLatitude && localLongitude && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Coordenadas: {localLatitude.toFixed(6)}, {localLongitude.toFixed(6)}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Mini mapa de vista previa */}
          {localLatitude && localLongitude && (
            <div className="border rounded-md overflow-hidden h-48">
              <MapContainer
                center={[localLatitude, localLongitude]}
                zoom={15}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={false}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={[localLatitude, localLongitude]}>
                  <Popup>
                    {localAddress && <div className="font-medium">{localAddress}</div>}
                    <div>{localCity}, {localCountry}</div>
                  </Popup>
                </Marker>
              </MapContainer>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
