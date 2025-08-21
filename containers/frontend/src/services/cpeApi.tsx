const apiUrl = import.meta.env.VITE_REACT_APP_API_URL;

export interface CpeApiData {
  deprecated?: boolean;
  cpeName: string;
  cpeNameId: string;
  lastModified: string;
  created: string;
  titles?: Array<{ title: string; lang: string }>;
  refs?: Array<{ ref: string; type: string }>;
  deprecatedBy?: Array<{ cpeName: string; cpeNameId: string }>;
  vulnerabilities?: string[];
  [key: string]: unknown; 
}

export interface CpeDetail {
  id: string;
  data: CpeApiData;
}

interface ApiError {
  error: string;
  details?: string;
  code?: string;
}

export async function fetchCpeDetails(cpeId: string): Promise<CpeDetail> {
  try {
    const response = await fetch(
      `${apiUrl}/api/v1/cpe-explorer/detail/${encodeURIComponent(cpeId)}`,
      {
        credentials: "include",
      }
    );

    if (!response.ok) {
      const errorData = (await response.json()) as ApiError;
      throw new Error(
        errorData.error || `Error ${response.status}: ${response.statusText}`
      );
    }

    return (await response.json()) as CpeDetail;
  } catch (error) {
    console.error(`Error fetching CPE details for ${cpeId}:`, error);
    throw error;
  }
}
