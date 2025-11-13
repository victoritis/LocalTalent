import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MapPin, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

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
}

interface GeocodingResult {
  lat: string
  lon: string
  display_name: string
  address: {
    city?: string
    town?: string
    village?: string
    country?: string
    state?: string
    road?: string
    house_number?: string
  }
}

export function LocationSelector({
  address = '',
  city = '',
  country = '',
  latitude,
  longitude,
  onLocationChange,
  disabled = false
}: LocationSelectorProps) {
  const { toast } = useToast()
  const [searching, setSearching] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [localAddress, setLocalAddress] = useState(address)
  const [localCity, setLocalCity] = useState(city)
  const [localCountry, setLocalCountry] = useState(country)

  useEffect(() => {
    setLocalAddress(address)
    setLocalCity(city)
    setLocalCountry(country)
  }, [address, city, country])

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
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&addressdetails=1&limit=1`,
        {
          headers: {
            'User-Agent': 'LocalTalent/1.0'
          }
        }
      )

      if (!response.ok) {
        throw new Error('Error en la búsqueda')
      }

      const data: GeocodingResult[] = await response.json()

      if (data.length === 0) {
        toast({
          title: 'No encontrado',
          description: 'No se encontró la ubicación. Intenta con una dirección más específica.',
          variant: 'destructive'
        })
        return
      }

      const result = data[0]
      const cityName = result.address.city || result.address.town || result.address.village || ''
      const countryName = result.address.country || ''
      const streetAddress = result.address.road
        ? `${result.address.house_number || ''} ${result.address.road}`.trim()
        : result.display_name.split(',')[0]

      setLocalAddress(streetAddress)
      setLocalCity(cityName)
      setLocalCountry(countryName)

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
        title: 'Ubicación encontrada',
        description: `${cityName}, ${countryName}`
      })
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

  return (
    <div className="space-y-4">
      {/* Búsqueda de ubicación */}
      <div className="flex gap-2">
        <div className="flex-1">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar dirección (ej: Calle Mayor 1, Madrid, España)"
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

      {/* Vista previa de la ubicación */}
      {(localCity || localCountry) && (
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
              {latitude && longitude && (
                <div className="text-xs text-muted-foreground mt-1">
                  Coordenadas: {latitude.toFixed(6)}, {longitude.toFixed(6)}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
