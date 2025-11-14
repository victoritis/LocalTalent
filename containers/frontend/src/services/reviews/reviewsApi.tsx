import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export interface Review {
  id: number
  reviewer: {
    id: number
    name: string
    username: string
    image: string
  }
  reviewee: {
    id: number
    name: string
    username: string
    image: string
  }
  rating: number
  comment?: string
  created_at: string
  updated_at?: string
}

export interface CreateReviewData {
  reviewee_username: string
  rating: number
  comment?: string
}

export interface UpdateReviewData {
  rating: number
  comment?: string
}

export interface ReviewStats {
  average_rating: number
  total_reviews: number
  rating_distribution: {
    1: number
    2: number
    3: number
    4: number
    5: number
  }
}

// Crear una review
export const createReview = async (data: CreateReviewData): Promise<{ message: string; review: Review }> => {
  const response = await axios.post(`${API_URL}/api/v1/reviews`, data, {
    withCredentials: true,
  })
  return response.data
}

// Obtener reviews de un usuario
export const getUserReviews = async (username: string): Promise<{ reviews: Review[]; total: number }> => {
  const response = await axios.get(`${API_URL}/api/v1/reviews/${username}`, {
    withCredentials: true,
  })
  return response.data
}

// Obtener promedio de valoraciones de un usuario
export const getUserAverageRating = async (username: string): Promise<ReviewStats> => {
  const response = await axios.get(`${API_URL}/api/v1/reviews/user/${username}/average`, {
    withCredentials: true,
  })
  return response.data
}

// Actualizar una review
export const updateReview = async (reviewId: number, data: UpdateReviewData): Promise<{ message: string; review: Review }> => {
  const response = await axios.put(`${API_URL}/api/v1/reviews/${reviewId}`, data, {
    withCredentials: true,
  })
  return response.data
}

// Eliminar una review
export const deleteReview = async (reviewId: number): Promise<{ message: string }> => {
  const response = await axios.delete(`${API_URL}/api/v1/reviews/${reviewId}`, {
    withCredentials: true,
  })
  return response.data
}

// Verificar si puedo hacer una review a un usuario
export const canReviewUser = async (username: string): Promise<{ can_review: boolean; reason?: string }> => {
  const response = await axios.get(`${API_URL}/api/v1/reviews/can-review/${username}`, {
    withCredentials: true,
  })
  return response.data
}

// Obtener mis reviews creadas
export const getMyReviews = async (): Promise<{ reviews: Review[]; total: number }> => {
  const response = await axios.get(`${API_URL}/api/v1/reviews/my-reviews`, {
    withCredentials: true,
  })
  return response.data
}
