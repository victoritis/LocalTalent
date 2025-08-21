import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getInitials(name: string): string {
  if (!name) return "";
  const parts = name.split(" ");
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Nueva función añadida
export async function fetchWithCredentials(
  url: string,
  options?: RequestInit
): Promise<Response> {
  const defaultOptions: RequestInit = {
    credentials: "include", // Incluye cookies en las solicitudes
  };

  const mergedOptions = { ...defaultOptions, ...options };

  return fetch(url, mergedOptions);
}
