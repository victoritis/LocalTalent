import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { StarRating } from './StarRating'
import { Star, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface CreateReviewProps {
  username: string
  revieweeId: number
  onReviewCreated?: () => void
  trigger?: React.ReactNode
}

export function CreateReview({
  username,
  revieweeId,
  onReviewCreated,
  trigger,
}: CreateReviewProps) {
  const [open, setOpen] = useState(false)
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [canReview, setCanReview] = useState(false)
  const [canReviewReason, setCanReviewReason] = useState('')
  const [checkingPermission, setCheckingPermission] = useState(true)

  useEffect(() => {
    if (open) {
      checkCanReview()
    }
  }, [open, username])

  const checkCanReview = async () => {
    try {
      setCheckingPermission(true)
      const response = await fetch(`/api/v1/reviews/can-review/${username}`, {
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Error al verificar permisos')
      }

      const data = await response.json()
      setCanReview(data.can_review)
      setCanReviewReason(data.reason || '')
    } catch (err) {
      toast.error('Error al verificar si puedes valorar a este usuario')
      setOpen(false)
    } finally {
      setCheckingPermission(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (rating === 0) {
      toast.error('Por favor selecciona una valoración')
      return
    }

    try {
      setLoading(true)
      const response = await fetch('/api/v1/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          reviewee_id: revieweeId,
          rating,
          comment,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Error al crear la valoración')
      }

      toast.success('Valoración creada correctamente')
      setOpen(false)
      setRating(0)
      setComment('')
      onReviewCreated?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  const defaultTrigger = (
    <Button variant="outline" size="sm">
      <Star className="w-4 h-4 mr-2" />
      Valorar
    </Button>
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger || defaultTrigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Valorar a @{username}</DialogTitle>
          <DialogDescription>
            Comparte tu experiencia trabajando con este talento
          </DialogDescription>
        </DialogHeader>

        {checkingPermission ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : !canReview ? (
          <div className="py-8 text-center">
            <p className="text-sm text-muted-foreground">{canReviewReason}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              {/* Rating */}
              <div className="space-y-2">
                <Label>Valoración</Label>
                <div className="flex items-center gap-2">
                  <StarRating
                    rating={rating}
                    interactive
                    onRatingChange={setRating}
                    size="lg"
                  />
                  {rating > 0 && (
                    <span className="text-sm font-medium">
                      {rating} {rating === 1 ? 'estrella' : 'estrellas'}
                    </span>
                  )}
                </div>
              </div>

              {/* Comment */}
              <div className="space-y-2">
                <Label htmlFor="comment">Comentario (opcional)</Label>
                <Textarea
                  id="comment"
                  placeholder="Cuéntanos tu experiencia..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={4}
                  maxLength={500}
                />
                <div className="text-xs text-muted-foreground text-right">
                  {comment.length}/500 caracteres
                </div>
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading || rating === 0}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Publicar valoración
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
