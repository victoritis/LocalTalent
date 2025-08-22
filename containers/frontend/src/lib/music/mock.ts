export type City = 'Madrid' | 'Barcelona' | 'Valencia' | 'Sevilla' | 'Bilbao' | 'Granada' | 'Zaragoza' | 'Córdoba';

export interface Artist {
  id: string;
  name: string;
  avatar: string;
  genre: string;
  city: City;
  followers: number;
}

export interface Event {
  id: string;
  title: string;
  date: string; // ISO
  city: City;
  venue: string;
  genre: string;
}

const artists: Artist[] = [
  { id: 'a-mad-1', name: 'Ritmo Centro', avatar: 'https://via.placeholder.com/96?text=RC', genre: 'Indie', city: 'Madrid', followers: 3200 },
  { id: 'a-mad-2', name: 'La Alinea', avatar: 'https://via.placeholder.com/96?text=AL', genre: 'Rock', city: 'Madrid', followers: 2100 },
  { id: 'a-bar-1', name: 'Costa Brava', avatar: 'https://via.placeholder.com/96?text=CB', genre: 'Pop', city: 'Barcelona', followers: 4100 },
  { id: 'a-val-1', name: 'Turia Beats', avatar: 'https://via.placeholder.com/96?text=TB', genre: 'Electrónica', city: 'Valencia', followers: 1800 },
  { id: 'a-sev-1', name: 'Triana Soul', avatar: 'https://via.placeholder.com/96?text=TS', genre: 'Fusión', city: 'Sevilla', followers: 2650 },
  { id: 'a-bil-1', name: 'Bilbo Wave', avatar: 'https://via.placeholder.com/96?text=BW', genre: 'Indie', city: 'Bilbao', followers: 1950 },
];

const events: Event[] = [
  { id: 'e-mad-1', title: 'Noche Indie Central', date: new Date(Date.now() + 86400000 * 1).toISOString(), city: 'Madrid', venue: 'Sala Centro', genre: 'Indie' },
  { id: 'e-mad-2', title: 'Rock & Tapas', date: new Date(Date.now() + 86400000 * 3).toISOString(), city: 'Madrid', venue: 'La Bodega', genre: 'Rock' },
  { id: 'e-bar-1', title: 'Electro Mediterráneo', date: new Date(Date.now() + 86400000 * 2).toISOString(), city: 'Barcelona', venue: 'Puerto Stage', genre: 'Electrónica' },
  { id: 'e-val-1', title: 'Festival Turia Live', date: new Date(Date.now() + 86400000 * 4).toISOString(), city: 'Valencia', venue: 'Parque Río', genre: 'Pop' },
  { id: 'e-sev-1', title: 'Noches de Triana', date: new Date(Date.now() + 86400000 * 5).toISOString(), city: 'Sevilla', venue: 'Ribera Venue', genre: 'Fusión' },
  { id: 'e-bil-1', title: 'Indie Norte', date: new Date(Date.now() + 86400000 * 6).toISOString(), city: 'Bilbao', venue: 'Sala Norte', genre: 'Indie' },
];

export function getArtistsByCity(city: City | null, limit=6) {
  if (!city) return artists.slice(0, limit);
  return artists.filter(a => a.city === city).slice(0, limit);
}

export function getEventsByCity(city: City | null, limit=6) {
  if (!city) return events.slice(0, limit);
  return events.filter(e => e.city === city).slice(0, limit);
}

export const mockData = { artists, events };
