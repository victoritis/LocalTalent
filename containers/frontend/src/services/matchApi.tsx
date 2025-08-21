const apiUrl = import.meta.env.VITE_REACT_APP_API_URL;

interface MatchCpe {
  cpeName: string;
  cpeNameId: string;
}

export interface MatchItem {
  matchCriteriaId: string;
  criteria: string;
  versionEndIncluding?: string;
  versionEndExcluding?: string;
  versionStartIncluding?: string;
  versionStartExcluding?: string;
  lastModified: string;
  cpeLastModified?: string;
  created: string;
  status: string;
  matches: MatchCpe[];
}

export interface MatchDetail {
  id: string;
  data: MatchItem;
}

interface ApiError {
  error: string;
  details?: string;
  code?: string;
}

export async function searchMatches(
  searchTerm: string,
  limit: number = 15,
  offset: number = 0
): Promise<{ results?: string[]; has_more?: boolean; error?: string }> {
  if (searchTerm.length < 3) { 
    return { results: [], has_more: false };
  }
  try {
    const response = await fetch(
      `${apiUrl}/api/v1/match-explorer/search?q=${encodeURIComponent(searchTerm)}&limit=${limit}&offset=${offset}`,
      {
        credentials: "include",
      }
    );
    const data = await response.json();
    if (!response.ok) {
      return { error: data.error || data.message || `Error ${response.status}` };
    }
    return data;
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unknown error searching Matches" };
  }
}

export async function fetchMatchDetails(matchCriteriaId: string): Promise<MatchDetail> {
  try {
    const response = await fetch(
      `${apiUrl}/api/v1/match-explorer/detail/${encodeURIComponent(matchCriteriaId)}`,
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
    return (await response.json()) as MatchDetail;
  } catch (error) {
    console.error("Error fetching Match details:", error);
    throw error;
  }
}
