import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export interface UserSearchResult {
  id: number
  name: string
  username: string
  bio?: string
  image: string
  location?: {
    city?: string
    country?: string
    latitude?: number
    longitude?: number
  }
  skills: string[]
  category?: string
  average_rating?: number
  distance_km?: number
  created_at: string
}

export interface SearchParams {
  query?: string
  radius?: number
  latitude?: number
  longitude?: number
  skills?: string[]
  category?: string
  sort_by?: 'distance' | 'rating' | 'created_at'
  page?: number
  per_page?: number
}

export interface SavedSearch {
  id: number
  name: string
  search_params: SearchParams
  created_at: string
  updated_at?: string
}

export interface CreateSavedSearchData {
  name: string
  search_params: SearchParams
}

export interface UpdateSavedSearchData {
  name?: string
  search_params?: SearchParams
}

// Búsqueda avanzada de usuarios
export const searchUsers = async (
  params: SearchParams
): Promise<{ users: UserSearchResult[]; total: number; pages: number; current_page: number }> => {
  const response = await axios.get(`${API_URL}/api/v1/users/search`, {
    params: {
      ...params,
      skills: params.skills?.join(','), // Convertir array a string separado por comas
    },
    withCredentials: true,
  })
  return response.data
}

// Obtener búsquedas guardadas
export const getSavedSearches = async (): Promise<{ searches: SavedSearch[]; total: number }> => {
  const response = await axios.get(`${API_URL}/api/v1/saved-searches`, {
    withCredentials: true,
  })
  return response.data
}

// Crear búsqueda guardada
export const createSavedSearch = async (data: CreateSavedSearchData): Promise<{ message: string; search: SavedSearch }> => {
  const response = await axios.post(`${API_URL}/api/v1/saved-searches`, data, {
    withCredentials: true,
  })
  return response.data
}

// Actualizar búsqueda guardada
export const updateSavedSearch = async (
  searchId: number,
  data: UpdateSavedSearchData
): Promise<{ message: string; search: SavedSearch }> => {
  const response = await axios.put(`${API_URL}/api/v1/saved-searches/${searchId}`, data, {
    withCredentials: true,
  })
  return response.data
}

// Eliminar búsqueda guardada
export const deleteSavedSearch = async (searchId: number): Promise<{ message: string }> => {
  const response = await axios.delete(`${API_URL}/api/v1/saved-searches/${searchId}`, {
    withCredentials: true,
  })
  return response.data
}

// Ejecutar una búsqueda guardada
export const executeSavedSearch = async (
  searchId: number
): Promise<{ users: UserSearchResult[]; total: number; pages: number; current_page: number }> => {
  const { searches } = await getSavedSearches()
  const savedSearch = searches.find((s) => s.id === searchId)

  if (!savedSearch) {
    throw new Error('Búsqueda guardada no encontrada')
  }

  return searchUsers(savedSearch.search_params)
}
