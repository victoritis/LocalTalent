import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export interface BlockedUser {
  block_id: number
  user: {
    id: number
    name: string
    username: string
    image: string
  }
  reason?: string
  blocked_at: string
}

export interface Report {
  id: number
  reported_user?: {
    id: number
    name: string
    username: string
  }
  reporter?: {
    id: number
    name: string
    username: string
  }
  reported?: {
    id: number
    name: string
    username: string
  }
  reason: string
  description?: string
  status: string
  moderator_notes?: string
  created_at: string
  reviewed_at?: string
}

export interface VerificationRequest {
  id: number
  user?: {
    id: number
    name: string
    username: string
    email: string
    category?: string
  }
  status: string
  document_url?: string
  document_type?: string
  additional_info?: string
  admin_notes?: string
  created_at: string
  reviewed_at?: string
}

export interface PrivacySettings {
  is_profile_public: boolean
  show_exact_location: boolean
  is_verified: boolean
}

export interface BlockUserData {
  blocked_id: number
  reason?: string
}

export interface ReportUserData {
  reported_id: number
  reason: 'harassment' | 'spam' | 'inappropriate' | 'fake' | 'scam' | 'other'
  description?: string
}

export interface VerificationRequestData {
  document_url?: string
  document_type?: string
  additional_info?: string
}

export interface UpdatePrivacyData {
  is_profile_public?: boolean
  show_exact_location?: boolean
}

// ==================== Bloqueo de Usuarios ====================

// Bloquear usuario
export const blockUser = async (data: BlockUserData): Promise<{ message: string; block: any }> => {
  const response = await axios.post(`${API_URL}/api/v1/security/block`, data, {
    withCredentials: true,
  })
  return response.data
}

// Desbloquear usuario
export const unblockUser = async (userId: number): Promise<{ message: string }> => {
  const response = await axios.delete(`${API_URL}/api/v1/security/unblock/${userId}`, {
    withCredentials: true,
  })
  return response.data
}

// Obtener lista de usuarios bloqueados
export const getBlockedUsers = async (): Promise<{ blocked_users: BlockedUser[]; total: number }> => {
  const response = await axios.get(`${API_URL}/api/v1/security/blocked-users`, {
    withCredentials: true,
  })
  return response.data
}

// Verificar si un usuario está bloqueado
export const checkIfBlocked = async (
  userId: number
): Promise<{ is_blocked_by_me: boolean; blocked_me: boolean; can_interact: boolean }> => {
  const response = await axios.get(`${API_URL}/api/v1/security/is-blocked/${userId}`, {
    withCredentials: true,
  })
  return response.data
}

// ==================== Reportes ====================

// Reportar usuario
export const reportUser = async (data: ReportUserData): Promise<{ message: string; report: any }> => {
  const response = await axios.post(`${API_URL}/api/v1/security/report`, data, {
    withCredentials: true,
  })
  return response.data
}

// Obtener mis reportes
export const getMyReports = async (): Promise<{ reports: Report[]; total: number }> => {
  const response = await axios.get(`${API_URL}/api/v1/security/reports/my-reports`, {
    withCredentials: true,
  })
  return response.data
}

// Admin: Obtener todos los reportes
export const getAllReports = async (params?: {
  status?: string
  page?: number
  per_page?: number
}): Promise<{ reports: Report[]; total: number; pages: number; current_page: number }> => {
  const response = await axios.get(`${API_URL}/api/v1/security/admin/reports`, {
    params,
    withCredentials: true,
  })
  return response.data
}

// Admin: Revisar reporte
export const reviewReport = async (
  reportId: number,
  data: { status?: string; moderator_notes?: string }
): Promise<{ message: string; report: any }> => {
  const response = await axios.put(`${API_URL}/api/v1/security/admin/reports/${reportId}`, data, {
    withCredentials: true,
  })
  return response.data
}

// ==================== Verificación de Cuentas ====================

// Solicitar verificación
export const requestVerification = async (
  data: VerificationRequestData
): Promise<{ message: string; verification_request: any }> => {
  const response = await axios.post(`${API_URL}/api/v1/security/verification/request`, data, {
    withCredentials: true,
  })
  return response.data
}

// Obtener mi solicitud de verificación
export const getMyVerificationRequest = async (): Promise<{
  has_request: boolean
  is_verified: boolean
  request?: VerificationRequest
}> => {
  const response = await axios.get(`${API_URL}/api/v1/security/verification/my-request`, {
    withCredentials: true,
  })
  return response.data
}

// Admin: Obtener todas las solicitudes de verificación
export const getAllVerifications = async (params?: {
  status?: string
  page?: number
  per_page?: number
}): Promise<{ verifications: VerificationRequest[]; total: number; pages: number; current_page: number }> => {
  const response = await axios.get(`${API_URL}/api/v1/security/admin/verifications`, {
    params,
    withCredentials: true,
  })
  return response.data
}

// Admin: Revisar solicitud de verificación
export const reviewVerification = async (
  verificationId: number,
  data: { status: 'approved' | 'rejected'; admin_notes?: string }
): Promise<{ message: string; verification: any }> => {
  const response = await axios.put(`${API_URL}/api/v1/security/admin/verifications/${verificationId}`, data, {
    withCredentials: true,
  })
  return response.data
}

// ==================== Configuración de Privacidad ====================

// Obtener configuración de privacidad
export const getPrivacySettings = async (): Promise<PrivacySettings> => {
  const response = await axios.get(`${API_URL}/api/v1/security/privacy-settings`, {
    withCredentials: true,
  })
  return response.data
}

// Actualizar configuración de privacidad
export const updatePrivacySettings = async (
  data: UpdatePrivacyData
): Promise<{ message: string; settings: PrivacySettings }> => {
  const response = await axios.put(`${API_URL}/api/v1/security/privacy-settings`, data, {
    withCredentials: true,
  })
  return response.data
}
