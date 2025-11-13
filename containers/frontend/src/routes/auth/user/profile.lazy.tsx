import { createLazyFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Camera, MapPin, Plus, X } from 'lucide-react'
import { LocationSelector } from '@/components/profile/LocationSelector'

export const Route = createLazyFileRoute('/auth/user/profile')({
  component: MyProfile
})

interface UserProfile {
  id: number
  email: string
  username: string
  first_name: string
  last_name: string
  profile_image: string
  bio: string | null
  skills: string[]
  address: string | null
  city: string | null
  country: string | null
  latitude: number | null
  longitude: number | null
  roles: string[]
  created_at: string
}

function MyProfile() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [editMode, setEditMode] = useState(false)

  // Form state
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [bio, setBio] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('')
  const [latitude, setLatitude] = useState<number | null>(null)
  const [longitude, setLongitude] = useState<number | null>(null)
  const [newSkill, setNewSkill] = useState('')
  const [skills, setSkills] = useState<string[]>([])

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/v1/profile/me', {
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Error al cargar el perfil')
      }

      const data = await response.json()
      setProfile(data)

      // Inicializar form
      setFirstName(data.first_name || '')
      setLastName(data.last_name || '')
      setBio(data.bio || '')
      setAddress(data.address || '')
      setCity(data.city || '')
      setCountry(data.country || '')
      setLatitude(data.latitude || null)
      setLongitude(data.longitude || null)
      setSkills(data.skills || [])
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo cargar el perfil',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/v1/profile/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          bio,
          address,
          city,
          country,
          latitude,
          longitude,
          skills
        })
      })

      if (!response.ok) {
        throw new Error('Error al guardar')
      }

      const data = await response.json()
      setProfile(prev => prev ? { ...prev, ...data.profile } : null)
      setEditMode(false)

      toast({
        title: 'Éxito',
        description: 'Perfil actualizado correctamente'
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el perfil',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    if (profile) {
      setFirstName(profile.first_name || '')
      setLastName(profile.last_name || '')
      setBio(profile.bio || '')
      setAddress(profile.address || '')
      setCity(profile.city || '')
      setCountry(profile.country || '')
      setLatitude(profile.latitude || null)
      setLongitude(profile.longitude || null)
      setSkills(profile.skills || [])
    }
    setEditMode(false)
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append('image', file)

    try {
      const response = await fetch('/api/v1/profile/upload-image', {
        method: 'POST',
        credentials: 'include',
        body: formData
      })

      if (!response.ok) {
        throw new Error('Error al subir imagen')
      }

      const data = await response.json()
      setProfile(prev => prev ? { ...prev, profile_image: data.profile_image } : null)

      toast({
        title: 'Éxito',
        description: 'Imagen de perfil actualizada'
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo subir la imagen',
        variant: 'destructive'
      })
    }
  }

  const addSkill = () => {
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      setSkills([...skills, newSkill.trim()])
      setNewSkill('')
    }
  }

  const removeSkill = (skillToRemove: string) => {
    setSkills(skills.filter(s => s !== skillToRemove))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>No se pudo cargar el perfil</p>
      </div>
    )
  }

  const initials = `${profile.first_name?.[0] || ''}${profile.last_name?.[0] || ''}`.toUpperCase()

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Mi Perfil</CardTitle>
          <CardDescription>Administra tu información personal y preferencias</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Foto de perfil */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="w-24 h-24">
                <AvatarImage src={profile.profile_image} alt={profile.username} />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <label
                htmlFor="profile-image"
                className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-2 cursor-pointer hover:bg-primary/90"
              >
                <Camera className="w-4 h-4" />
                <input
                  id="profile-image"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </label>
            </div>
            <div>
              <h3 className="text-lg font-semibold">{profile.first_name} {profile.last_name}</h3>
              <p className="text-sm text-muted-foreground">@{profile.username}</p>
              <p className="text-sm text-muted-foreground">{profile.email}</p>
            </div>
          </div>

          {/* Información básica */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="first_name">Nombre</Label>
                <Input
                  id="first_name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  disabled={!editMode}
                />
              </div>
              <div>
                <Label htmlFor="last_name">Apellido</Label>
                <Input
                  id="last_name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  disabled={!editMode}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="bio">Biografía</Label>
              <Textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                disabled={!editMode}
                placeholder="Cuéntanos sobre ti..."
                rows={4}
              />
            </div>
          </div>

          {/* Habilidades */}
          <div className="space-y-2">
            <Label>Habilidades</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {skills.map((skill, index) => (
                <Badge key={index} variant="secondary" className="gap-1">
                  {skill}
                  {editMode && (
                    <button
                      onClick={() => removeSkill(skill)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </Badge>
              ))}
            </div>
            {editMode && (
              <div className="flex gap-2">
                <Input
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  placeholder="Agregar habilidad..."
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addSkill()
                    }
                  }}
                />
                <Button onClick={addSkill} size="icon" variant="outline">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Ubicación */}
          <div className="space-y-4">
            <Label className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Ubicación
            </Label>
            {editMode ? (
              <LocationSelector
                address={address}
                city={city}
                country={country}
                latitude={latitude}
                longitude={longitude}
                onLocationChange={(location) => {
                  setAddress(location.address)
                  setCity(location.city)
                  setCountry(location.country)
                  setLatitude(location.latitude)
                  setLongitude(location.longitude)
                }}
                disabled={false}
              />
            ) : (
              <div className="p-3 bg-muted rounded-md">
                {address || city || country ? (
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground" />
                    <div className="flex-1 text-sm">
                      {address && <div className="font-medium">{address}</div>}
                      <div className="text-muted-foreground">
                        {city && country
                          ? `${city}, ${country}`
                          : city || country || 'No especificada'}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No has agregado tu ubicación</p>
                )}
              </div>
            )}
          </div>

          {/* Botones de acción */}
          <div className="flex gap-2 pt-4">
            {!editMode ? (
              <Button onClick={() => setEditMode(true)}>
                Editar Perfil
              </Button>
            ) : (
              <>
                <Button onClick={handleSave} disabled={saving}>
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Guardar Cambios
                </Button>
                <Button onClick={handleCancel} variant="outline" disabled={saving}>
                  Cancelar
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
