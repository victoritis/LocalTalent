import { fetchWithCredentials } from "@/lib/utils";

const apiUrl = import.meta.env.VITE_REACT_APP_API_URL;

export interface SuperAdminSummaryData { 
  cve_count: number;
  cpe_count: number;
  match_count: number;
  user_count: number;
  organization_count: number;
  product_count: number;
  alert_count: number;
  initial_load_completed: boolean;
  last_cve_update: string | null; 
  last_cpe_update: string | null;
  last_match_update: string | null;
  new_cves_last_30_days: number;
}

interface ApiError {
  error: string;
  details?: string;
  code?: string;
}

export async function fetchSuperAdminSummary(): Promise<SuperAdminSummaryData> {
  try {
    const response = await fetchWithCredentials(
      `${apiUrl}/api/v1/superadmin/summary` 
    );

    if (!response.ok) {
      const errorData = (await response.json()) as ApiError;
      throw new Error(
        errorData.error || `Error ${response.status}: ${response.statusText}`
      );
    }
    return (await response.json()) as SuperAdminSummaryData;
  } catch (error) {
    console.error("Error fetching super admin summary:", error); 
    throw error; 
  }
}

export interface LoadProgressData {
  cve_load_progress: number;
  cpe_load_progress: number;
  match_load_progress: number;
}

export async function fetchLoadProgress(): Promise<LoadProgressData> {
  try {
    const response = await fetchWithCredentials(
      `${apiUrl}/api/v1/superadmin/load-progress`
    );

    if (!response.ok) {
      const errorData = (await response.json()) as ApiError;
      throw new Error(
        errorData.error || `Error ${response.status}: ${response.statusText}`
      );
    }
    return (await response.json()) as LoadProgressData;
  } catch (error) {
    console.error("Error fetching load progress:", error);
    throw error;
  }
}

export interface SynchronizationResponse {
  status: string;
  task_chain_id: string;
}

export interface SynchronizationStatusResponse {
  is_synchronizing: boolean;
}

export async function fetchSynchronizationStatus(): Promise<SynchronizationStatusResponse> {
  try {
    const response = await fetchWithCredentials(
      `${apiUrl}/api/v1/superadmin/synchronization-status`
    );

    if (!response.ok) {
      const errorData = (await response.json()) as ApiError;
      throw new Error(
        errorData.error || `Error ${response.status}: ${response.statusText}`
      );
    }
    return (await response.json()) as SynchronizationStatusResponse;
  } catch (error) {
    console.error("Error fetching synchronization status:", error);
    throw error;
  }
}

export async function executeFullSynchronization(): Promise<SynchronizationResponse> {
  try {
    const response = await fetchWithCredentials(
      `${apiUrl}/ejecutar-sincronizacion` 
    );

    if (!response.ok) {
      const errorData = (await response.json()) as ApiError;
      throw new Error(
        errorData.error || `Error ${response.status}: ${response.statusText}`
      );
    }
    return (await response.json()) as SynchronizationResponse;
  } catch (error) {
    console.error("Error executing full synchronization:", error);
    throw error; 
  }
}

export interface FeedbackItem {
  id: number;
  message: string;
  is_archived: boolean;
  createdAt: string | null;
}

export interface PaginatedFeedbacksResponse {
  feedbacks: FeedbackItem[];
  page: number;
  total_pages: number;
  total_items: number;
  per_page: number;
}

export async function fetchAllFeedbacks(page: number = 1, perPage: number = 10): Promise<PaginatedFeedbacksResponse> {
  try {
    const response = await fetchWithCredentials(
      `${apiUrl}/api/v1/superadmin/feedbacks?page=${page}&per_page=${perPage}`
    );

    if (!response.ok) {
      const errorData = (await response.json()) as ApiError;
      throw new Error(
        errorData.error || `Error ${response.status}: ${response.statusText}`
      );
    }
    return (await response.json()) as PaginatedFeedbacksResponse;
  } catch (error) {
    console.error("Error fetching all feedbacks:", error);
    throw error;
  }
}

export async function toggleFeedbackArchiveStatus(feedbackId: number): Promise<{ message: string; feedback: FeedbackItem }> {
  try {
    const response = await fetchWithCredentials(
      `${apiUrl}/api/v1/superadmin/feedbacks/${feedbackId}/toggle-archive`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorData = (await response.json()) as ApiError;
      throw new Error(
        errorData.error || `Error ${response.status}: ${response.statusText}`
      );
    }
    return (await response.json()) as { message: string; feedback: FeedbackItem };
  } catch (error) {
    console.error(`Error toggling archive status for feedback ${feedbackId}:`, error);
    throw error;
  }
}
