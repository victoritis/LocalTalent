import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { StarRating, StarRatingDisplay } from './StarRating'
import { MessageSquare } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface Review {
  id: number
  reviewer_id: number
  reviewer_username: string
  reviewer_name: string
  reviewer_image?: string
  rating: number
  comment?: string
  created_at: string
}

interface ReviewListProps {
  username: string
  showAverage?: boolean
}

export function ReviewList({ username, showAverage = true }: ReviewListProps) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [averageRating, setAverageRating] = useState<number>(0)
  const [reviewCount, setReviewCount] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchReviews()
  }, [username])

  const fetchReviews = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/v1/reviews/${username}`, {
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Error al cargar las valoraciones')
      }

      const data = await response.json()
      setReviews(data.reviews || [])
      setAverageRating(data.average_rating || 0)
      setReviewCount(data.total || 0)
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
            Cargando valoraciones...
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

  return (
    <div className="space-y-4">
      {/* Promedio de valoraciones */}
      {showAverage && reviewCount > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-2">
              <div className="text-4xl font-bold">{averageRating.toFixed(1)}</div>
              <StarRating rating={averageRating} size="lg" />
              <div className="text-sm text-muted-foreground">
                Basado en {reviewCount} {reviewCount === 1 ? 'valoración' : 'valoraciones'}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de reviews */}
      {reviews.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Aún no hay valoraciones</p>
              <p className="text-sm mt-2">Sé el primero en valorar a este talento</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <Card key={review.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={review.reviewer_image} alt={review.reviewer_name} />
                      <AvatarFallback>
                        {review.reviewer_name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-semibold">{review.reviewer_name}</div>
                      <div className="text-sm text-muted-foreground">
                        @{review.reviewer_username}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <StarRating rating={review.rating} size="sm" />
                    <div className="text-xs text-muted-foreground mt-1">
                      {format(new Date(review.created_at), "d 'de' MMMM, yyyy", {
                        locale: es,
                      })}
                    </div>
                  </div>
                </div>
              </CardHeader>
              {review.comment && (
                <CardContent>
                  <p className="text-sm">{review.comment}</p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
