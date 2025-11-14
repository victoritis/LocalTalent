import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export interface Project {
  id: number
  title: string
  description?: string
  creator: {
    id: number
    name: string
    username: string
    image: string
  }
  status: 'draft' | 'active' | 'completed' | 'cancelled'
  start_date?: string
  end_date?: string
  required_skills: string[]
  max_members?: number
  active_members: number
  is_full: boolean
  is_public: boolean
  category?: string
  image_url?: string
  members?: Array<{
    id: number
    name: string
    username: string
    image: string
    role: string
    joined_at: string
  }>
  stats?: {
    active_members: number
    is_full: boolean
  }
  user_membership?: {
    id: number
    role: string
    status: string
    joined_at: string
  }
  created_at: string
  updated_at?: string
}

export interface ProjectMembership {
  membership_id: number
  role: string
  joined_at: string
  project: {
    id: number
    title: string
    description?: string
    status: string
    creator: {
      id: number
      name: string
      username: string
    }
    start_date?: string
    end_date?: string
    category?: string
    image_url?: string
  }
}

export interface ProjectInvitation {
  id: number
  role: string
  project: {
    id: number
    title: string
    description?: string
    status: string
    creator: {
      id: number
      name: string
      username: string
      image: string
    }
    required_skills: string[]
    category?: string
    image_url?: string
  }
  created_at: string
}

export interface CreateProjectData {
  title: string
  description?: string
  status?: 'draft' | 'active' | 'completed' | 'cancelled'
  start_date?: string
  end_date?: string
  required_skills?: string[]
  max_members?: number
  is_public?: boolean
  category?: string
  image_url?: string
}

export interface UpdateProjectData extends Partial<CreateProjectData> {}

export interface AddMemberData {
  user_id?: number
  role?: string
}

// Obtener lista de proyectos públicos
export const getProjects = async (params?: {
  category?: string
  status?: string
  required_skill?: string
  page?: number
  per_page?: number
}): Promise<{ projects: Project[]; total: number; pages: number; current_page: number }> => {
  const response = await axios.get(`${API_URL}/api/v1/projects`, {
    params,
    withCredentials: true,
  })
  return response.data
}

// Obtener detalles de un proyecto
export const getProject = async (projectId: number): Promise<Project> => {
  const response = await axios.get(`${API_URL}/api/v1/projects/${projectId}`, {
    withCredentials: true,
  })
  return response.data
}

// Crear proyecto
export const createProject = async (data: CreateProjectData): Promise<{ message: string; project: Project }> => {
  const response = await axios.post(`${API_URL}/api/v1/projects`, data, {
    withCredentials: true,
  })
  return response.data
}

// Actualizar proyecto
export const updateProject = async (
  projectId: number,
  data: UpdateProjectData
): Promise<{ message: string; project: Project }> => {
  const response = await axios.put(`${API_URL}/api/v1/projects/${projectId}`, data, {
    withCredentials: true,
  })
  return response.data
}

// Eliminar proyecto
export const deleteProject = async (projectId: number): Promise<{ message: string }> => {
  const response = await axios.delete(`${API_URL}/api/v1/projects/${projectId}`, {
    withCredentials: true,
  })
  return response.data
}

// Agregar miembro o unirse a proyecto
export const addMember = async (
  projectId: number,
  data?: AddMemberData
): Promise<{ message: string; member: any }> => {
  const response = await axios.post(`${API_URL}/api/v1/projects/${projectId}/members`, data || {}, {
    withCredentials: true,
  })
  return response.data
}

// Responder invitación a proyecto
export const respondMembership = async (
  memberId: number,
  action: 'accept' | 'decline'
): Promise<{ message: string }> => {
  const response = await axios.put(
    `${API_URL}/api/v1/projects/members/${memberId}/respond`,
    { action },
    {
      withCredentials: true,
    }
  )
  return response.data
}

// Actualizar rol de miembro
export const updateMemberRole = async (
  projectId: number,
  userId: number,
  role: string
): Promise<{ message: string; member: any }> => {
  const response = await axios.put(
    `${API_URL}/api/v1/projects/${projectId}/members/${userId}`,
    { role },
    {
      withCredentials: true,
    }
  )
  return response.data
}

// Remover miembro o salirse
export const removeMember = async (projectId: number, userId: number): Promise<{ message: string }> => {
  const response = await axios.delete(`${API_URL}/api/v1/projects/${projectId}/members/${userId}`, {
    withCredentials: true,
  })
  return response.data
}

// Obtener mis proyectos creados
export const getMyProjects = async (): Promise<{ projects: Project[]; total: number }> => {
  const response = await axios.get(`${API_URL}/api/v1/projects/my-projects`, {
    withCredentials: true,
  })
  return response.data
}

// Obtener proyectos en los que participo
export const getMyMemberships = async (): Promise<{ memberships: ProjectMembership[]; total: number }> => {
  const response = await axios.get(`${API_URL}/api/v1/projects/my-memberships`, {
    withCredentials: true,
  })
  return response.data
}

// Obtener invitaciones pendientes a proyectos
export const getMyProjectInvitations = async (): Promise<{ invitations: ProjectInvitation[]; total: number }> => {
  const response = await axios.get(`${API_URL}/api/v1/projects/invitations/my-invitations`, {
    withCredentials: true,
  })
  return response.data
}
