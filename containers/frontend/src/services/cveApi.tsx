const apiUrl = import.meta.env.VITE_REACT_APP_API_URL;


interface CveDescription {
  lang: string;
  value: string;
}

interface CvssData {
  version: string;
  vectorString: string;
  attackVector?: string;
  attackComplexity?: string;
  privilegesRequired?: string;
  userInteraction?: string;
  scope?: string;
  confidentialityImpact?: string;
  integrityImpact?: string;
  availabilityImpact?: string;
  baseScore: number;
  baseSeverity: string;
}

export interface CvssMetric {
  source: string;
  type: string;
  cvssData: CvssData;
  exploitabilityScore?: number;
  impactScore?: number;
}

export interface WeaknessDescription {
  lang: string;
  value: string;
}

interface Weakness {
  source: string;
  type: string;
  description: WeaknessDescription[];
}

export interface CpeMatch {
  vulnerable: boolean;
  criteria: string;
  matchCriteriaId: string;
  versionStartExcluding?: string;
  versionStartIncluding?: string;
  versionEndExcluding?: string;
  versionEndIncluding?: string;
}

interface Node {
  operator: "OR" | "AND";
  negate: boolean;
  cpeMatch: CpeMatch[];
}

interface Configuration {
  nodes: Node[];
}

interface Reference {
  url: string;
  source: string;
  tags?: string[];
}

export interface CveItem {
  id: string;
  sourceIdentifier: string;
  published: string;
  lastModified: string;
  vulnStatus: string;
  cveTags?: unknown[];
  descriptions: CveDescription[];
  metrics: {
    cvssMetricV31?: CvssMetric[];
    cvssMetricV30?: CvssMetric[];
    cvssMetricV2?: CvssMetric[];
  };
  weaknesses?: Weakness[];
  configurations?: Configuration[];
  references?: Reference[];
}

export interface CveApiData {
  cve: CveItem;
}

export interface CveDetail {
  id: string; 
  data: CveApiData; 
}

interface ApiError {
  error: string;
  details?: string;
  code?: string;
}

export async function searchCves(
  searchTerm: string,
  limit: number = 15,
  offset: number = 0
): Promise<{ results?: string[]; has_more?: boolean; error?: string }> {
  if (searchTerm.length < 3) { 
    return { results: [], has_more: false };
  }
  try {
    const response = await fetch(
      `${apiUrl}/api/v1/cve-explorer/search?q=${encodeURIComponent(searchTerm)}&limit=${limit}&offset=${offset}`,
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
    return { error: error instanceof Error ? error.message : "Unknown error searching CVEs" };
  }
}

export async function fetchCveDetails(cveId: string): Promise<CveDetail> {
  try {
    const response = await fetch(
      `${apiUrl}/api/v1/cve-explorer/detail/${encodeURIComponent(cveId)}`,
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
    return (await response.json()) as CveDetail;
  } catch (error) {
    console.error("Error fetching CVE details:", error);
    throw error;
  }
}
