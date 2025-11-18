import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ChevronLeft, ChevronRight, Image, Video, X } from 'lucide-react'

interface PortfolioItem {
  id: number
  title: string
  description?: string
  media_type: 'image' | 'video'
  media_url: string
  thumbnail_url?: string
  order: number
  created_at?: string
}

interface PortfolioGalleryProps {
  username: string
  isOwner?: boolean
  onDelete?: (id: number) => void
}

export function PortfolioGallery({ username, isOwner = false, onDelete }: PortfolioGalleryProps) {
  const [selectedItem, setSelectedItem] = useState<PortfolioItem | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [items, setItems] = useState<PortfolioItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const apiUrl = import.meta.env.VITE_REACT_APP_API_URL

  useEffect(() => {
    fetchPortfolio()
  }, [username])

  const fetchPortfolio = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${apiUrl}/api/v1/portfolio/${username}`, {
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Error al cargar el portfolio')
      }

      const data = await response.json()
      setItems(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            Cargando portfolio...
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-destructive">{error}</div>
        </CardContent>
      </Card>
    )
  }

  if (!items || items.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">
            <Image className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No hay elementos en el portfolio</p>
            {isOwner && (
              <p className="text-sm mt-2">Agrega tu primer trabajo para empezar</p>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  const openModal = (item: PortfolioItem, index: number) => {
    setSelectedItem(item)
    setCurrentIndex(index)
  }

  const closeModal = () => {
    setSelectedItem(null)
  }

  const goToNext = () => {
    if (currentIndex < items.length - 1) {
      setCurrentIndex(currentIndex + 1)
      setSelectedItem(items[currentIndex + 1])
    }
  }

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
      setSelectedItem(items[currentIndex - 1])
    }
  }

  return (
    <>
      {/* Grid de Portfolio */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item, index) => (
          <Card
            key={item.id}
            className="group cursor-pointer hover:shadow-lg transition-shadow overflow-hidden"
            onClick={() => openModal(item, index)}
          >
            <div className="relative aspect-square overflow-hidden bg-muted">
              {item.media_type === 'image' ? (
                <img
                  src={item.media_url}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="relative w-full h-full">
                  <video
                    src={item.media_url}
                    className="w-full h-full object-cover"
                    muted
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <Video className="w-12 h-12 text-white" />
                  </div>
                </div>
              )}
              <div className="absolute top-2 right-2">
                <Badge variant="secondary" className="text-xs">
                  {item.media_type === 'image' ? 'Imagen' : 'Video'}
                </Badge>
              </div>
            </div>
            <CardContent className="p-4">
              <h3 className="font-semibold truncate">{item.title}</h3>
              {item.description && (
                <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                  {item.description}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Modal de Visualización con Carrusel */}
      <Dialog open={selectedItem !== null} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{selectedItem?.title}</DialogTitle>
          </DialogHeader>

          {selectedItem && (
            <div className="space-y-4">
              {/* Contenedor del medio con navegación */}
              <div className="relative">
                {/* Medio (Imagen o Video) */}
                <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                  {selectedItem.media_type === 'image' ? (
                    <img
                      src={selectedItem.media_url}
                      alt={selectedItem.title}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <video
                      src={selectedItem.media_url}
                      controls
                      className="w-full h-full"
                    />
                  )}
                </div>

                {/* Botones de navegación */}
                {items.length > 1 && (
                  <>
                    <Button
                      variant="outline"
                      size="icon"
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        goToPrevious()
                      }}
                      disabled={currentIndex === 0}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        goToNext()
                      }}
                      disabled={currentIndex === items.length - 1}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </>
                )}
              </div>

              {/* Descripción */}
              {selectedItem.description && (
                <div>
                  <h4 className="font-medium mb-2">Descripción</h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedItem.description}
                  </p>
                </div>
              )}

              {/* Contador e información adicional */}
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  {currentIndex + 1} de {items.length}
                </span>
                {isOwner && onDelete && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      onDelete(selectedItem.id)
                      closeModal()
                    }}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Eliminar
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
