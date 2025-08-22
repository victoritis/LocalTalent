import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { EditProfileDialog } from "@/components/user/EditProfileDialog";
import { EditPasswordDialog } from "@/components/user/EditPasswordDialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Music, Heart, Play, Pause, Calendar, MapPin, Star, Mic2, MoreHorizontal } from "lucide-react";
import * as React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";

interface UserData {
  firstName: string;
  lastName: string;
  profileImage: string;
  email: string;
  role: string;
}

interface Organization {
  id: number;
  name: string;
  description: string;
  image: string;
  role: string;
}

// Actualización de tipos para las alertas
interface LocalAlert {
  cve: string;
  cpe: string;
  is_active: boolean;
  created_at: string | null;
  org_name: string;
  cvss_score?: number;
  cvss_version?: string;
}

interface UserProfileProps {
  user: UserData;
  organizations: Organization[]; // mantenido para compatibilidad (ya no se muestra)
  alerts: LocalAlert[]; // mantenido para compatibilidad (ya no se muestra)
  onUpdateUser: (updatedUser: Partial<UserData>) => void;
  onUpdatePassword: (newPassword: string) => void;
}

const formatDateSafe = (dateString: string | null): string => {
  if (!dateString) return "Fecha no disponible";
  try {
    // new Date() interpreta correctamente la cadena ISO 8601 UTC
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Fecha inválida";
    // Formatear usando la zona horaria local del navegador
    // 'Pp' es un formato conveniente para fecha y hora corta (ej: 16 abr 2025, 10:44)
    return format(date, "Pp", { locale: es });
  } catch (e) {
    console.error("Error formateando fecha:", e);
    return "Fecha inválida";
  }
};

// Nuevos tipos locales para sección musical
type Track = {
  id: string;
  title: string;
  artist: string;
  cover: string;
  duration: string;
  likes: number;
  isFavorite: boolean;
  audioUrl?: string;
};

type ArtistLike = {
  id: string;
  name: string;
  avatar: string;
  followers: number;
  verified?: boolean;
};

type GenreStat = {
  name: string;
  percent: number;
};

type LocalEvent = {
  id: string;
  title: string;
  date: string; // ISO
  city: string;
  venue: string;
};

export function UserProfile({
  user,
  organizations: _organizations, // eslint-disable-line @typescript-eslint/no-unused-vars
  alerts: _alerts, // eslint-disable-line @typescript-eslint/no-unused-vars
  onUpdateUser,
  onUpdatePassword,
}: UserProfileProps) {

  // Mocks (TODO: reemplazar mocks con API real cuando esté disponible)
  const [likedTracks, setLikedTracks] = React.useState<Track[]>([
    { id: "t1", title: "Luz de Barrio", artist: "María Vega", cover: "https://via.placeholder.com/64?text=LV", duration: "3:24", likes: 1320, isFavorite: true },
    { id: "t2", title: "Noches en la Plaza", artist: "Los Faroles", cover: "https://via.placeholder.com/64?text=NP", duration: "4:05", likes: 980, isFavorite: false },
    { id: "t3", title: "Eco de las Calles", artist: "DJ Retumba", cover: "https://via.placeholder.com/64?text=EC", duration: "2:58", likes: 1543, isFavorite: true },
    { id: "t4", title: "Río Interior", artist: "Ana del Puerto", cover: "https://via.placeholder.com/64?text=RI", duration: "3:47", likes: 743, isFavorite: false },
    { id: "t5", title: "Pulsos Urbanos", artist: "Colectivo 27", cover: "https://via.placeholder.com/64?text=PU", duration: "3:12", likes: 2104, isFavorite: true },
    { id: "t6", title: "Raíz y Viento", artist: "Trío Sendero", cover: "https://via.placeholder.com/64?text=RV", duration: "4:11", likes: 621, isFavorite: false },
    { id: "t7", title: "Niebla Azul", artist: "Indigo Marta", cover: "https://via.placeholder.com/64?text=NA", duration: "3:33", likes: 432, isFavorite: false },
  ]);
  const [likedArtists] = React.useState<ArtistLike[]>([
    { id: "a1", name: "María Vega", avatar: "https://via.placeholder.com/96?text=MV", followers: 4200, verified: true },
    { id: "a2", name: "Los Faroles", avatar: "https://via.placeholder.com/96?text=LF", followers: 3100 },
    { id: "a3", name: "DJ Retumba", avatar: "https://via.placeholder.com/96?text=DJ", followers: 5150, verified: true },
    { id: "a4", name: "Ana del Puerto", avatar: "https://via.placeholder.com/96?text=AP", followers: 2890 },
    { id: "a5", name: "Colectivo 27", avatar: "https://via.placeholder.com/96?text=C27", followers: 1980 },
    { id: "a6", name: "Indigo Marta", avatar: "https://via.placeholder.com/96?text=IM", followers: 1670 },
  ]);
  const [genreStats] = React.useState<GenreStat[]>([
    { name: "Indie", percent: 62 },
    { name: "Rock", percent: 45 },
    { name: "Folk", percent: 28 },
    { name: "Electrónica", percent: 35 },
    { name: "Fusión", percent: 18 },
  ]);
  const [upcomingEvents] = React.useState<LocalEvent[]>([
    { id: "e1", title: "Festival Plaza Sonora", date: new Date(Date.now() + 86400000 * 7).toISOString(), city: "Sevilla", venue: "Plaza Central" },
    { id: "e2", title: "Noche Acústica", date: new Date(Date.now() + 86400000 * 14).toISOString(), city: "Granada", venue: "Sala Carmesí" },
    { id: "e3", title: "Jam Local Sessions", date: new Date(Date.now() + 86400000 * 21).toISOString(), city: "Córdoba", venue: "Espacio Río" },
  ]);

  // Audio preview simple (un único elemento)
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const [playingTrack, setPlayingTrack] = React.useState<string | null>(null);

  const toggleTrackLike = (id: string) =>
    setLikedTracks((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, isFavorite: !t.isFavorite, likes: t.isFavorite ? t.likes - 1 : t.likes + 1 }
          : t
      )
    );

  const playPreview = (id: string) => {
    if (playingTrack === id) {
      // Pausar
      audioRef.current?.pause();
      setPlayingTrack(null);
      return;
    }
    // Simular audio (no hay audioUrl real)
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }
    audioRef.current.src = ""; // TODO: asignar preview real
    audioRef.current.play().catch(() => {/* silencio si falla */});
    setPlayingTrack(id);
  };

  // Eliminadas secciones de alertas y organizaciones (solo UI) manteniendo props para no romper contratos externos.

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-10">
      {/* Hero Usuario */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="flex items-start md:items-center gap-5">
          <Avatar className="w-24 h-24 md:w-28 md:h-28 rounded-2xl ring-2 ring-primary/20 shadow-md">
            <AvatarImage src={user.profileImage} alt={`${user.firstName} ${user.lastName}`} />
            <AvatarFallback className="text-xl font-semibold">
              {(user.firstName?.[0] ?? "") + (user.lastName?.[0] ?? "")}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-2">
            <div className="flex items-center flex-wrap gap-3">
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
                {user.firstName} {user.lastName}
              </h1>
              <Badge variant="secondary" className="flex items-center gap-1 rounded-full px-3 py-1 text-xs">
                <Mic2 className="h-3 w-3" /> Talento local
              </Badge>
            </div>
            <p className="text-sm md:text-base text-muted-foreground">{user.email}</p>
            <div className="flex flex-wrap items-center gap-3 text-xs md:text-sm text-muted-foreground">
              <span className="font-medium">Rol: <span className="text-foreground">{user.role}</span></span>
              <Separator orientation="vertical" className="h-4" />
              <span>Fans: 1.2k</span>
              <Separator orientation="vertical" className="h-4" />
              <span>Reproducciones: 34.5k</span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <EditProfileDialog user={user} onSave={onUpdateUser} />
            <EditPasswordDialog onChangePassword={onUpdatePassword} />
        </div>
      </div>

  {/* Música que me gusta (ocupa todo el ancho ahora) */}
  <Card className="rounded-2xl shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <Music className="h-5 w-5 text-primary" /> Música que me gusta
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="canciones" className="w-full">
              <TabsList className="mb-4 grid w-full grid-cols-3">
                <TabsTrigger value="canciones">Canciones</TabsTrigger>
                <TabsTrigger value="artistas">Artistas</TabsTrigger>
                <TabsTrigger value="generos">Géneros</TabsTrigger>
              </TabsList>
              {/* Canciones */}
              <TabsContent value="canciones" className="mt-0">
                <ScrollArea className="h-72 pr-4">
                  <ul className="space-y-3">
                    {likedTracks.map((track) => (
                      <li key={track.id} className="flex items-center gap-4 rounded-xl border bg-background/60 p-3 hover:bg-muted/60 transition">
                        <Avatar className="h-14 w-14 rounded-lg">
                          <AvatarImage src={track.cover} alt={`Portada ${track.title}`} />
                          <AvatarFallback>{track.title.slice(0, 2)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="truncate font-medium text-sm md:text-base leading-tight">
                            {track.title}
                          </p>
                          <p className="truncate text-xs md:text-sm text-muted-foreground">{track.artist}</p>
                        </div>
                        <span className="hidden md:inline text-xs text-muted-foreground w-12">{track.duration}</span>
                        <div className="flex items-center gap-2">
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label={`${playingTrack === track.id ? "Pausar" : "Reproducir"} ${track.title}`}
                            onClick={() => playPreview(track.id)}
                          >
                            {playingTrack === track.id ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                          </Button>
                          <Button
                            size="icon"
                            variant={track.isFavorite ? "default" : "ghost"}
                            aria-label={`${track.isFavorite ? "Quitar de favoritas" : "Marcar como favorita"} ${track.title}`}
                            onClick={() => toggleTrackLike(track.id)}
                          >
                            <Heart className={`h-4 w-4 ${track.isFavorite ? "fill-current" : ""}`} />
                          </Button>
                          <div className="text-xs font-medium w-12 text-center">{(track.likes / 1000).toFixed(1)}k</div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="icon" variant="ghost" aria-label="Más acciones">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>Añadir a playlist (próx.)</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              </TabsContent>
              {/* Artistas */}
              <TabsContent value="artistas" className="mt-0">
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3">
                  {likedArtists.map((artist) => (
                    <div key={artist.id} className="group rounded-xl border bg-background/60 p-4 flex flex-col items-center text-center hover:shadow-sm transition">
                      <Avatar className="h-20 w-20 mb-3 ring-2 ring-primary/30 group-hover:ring-primary/50 transition">
                        <AvatarImage src={artist.avatar} alt={artist.name} />
                        <AvatarFallback>{artist.name.slice(0, 2)}</AvatarFallback>
                      </Avatar>
                      <p className="font-medium text-sm md:text-base flex items-center gap-1">
                        {artist.name}
                        {artist.verified && <Star className="h-3.5 w-3.5 text-yellow-500" aria-label="Verificado" />}
                      </p>
                      <p className="text-xs text-muted-foreground">{(artist.followers / 1000).toFixed(1)}k seguidores</p>
                    </div>
                  ))}
                </div>
              </TabsContent>
              {/* Géneros */}
              <TabsContent value="generos" className="mt-0">
                <div className="space-y-4">
                  {genreStats.map((g, idx) => (
                    <div key={g.name} className="space-y-2">
                      <div className="flex items-center justify-between text-xs md:text-sm">
                        <span className="font-medium">{g.name}</span>
                        <span className="text-muted-foreground">{g.percent}%</span>
                      </div>
                      <Progress value={g.percent} className="h-2" />
                      {idx < genreStats.length - 1 && <Separator />}
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
  </Card>

  {/* Eventos locales */}
  <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <Calendar className="h-5 w-5 text-primary" /> Próximos eventos locales
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingEvents.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Evento</TableHead>
                      <TableHead>Ciudad</TableHead>
                      <TableHead>Venue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {upcomingEvents.map(ev => (
                      <TableRow key={ev.id}>
                        <TableCell className="text-xs md:text-sm">{formatDateSafe(ev.date)}</TableCell>
                        <TableCell className="text-xs md:text-sm font-medium">{ev.title}</TableCell>
                        <TableCell className="text-xs md:text-sm flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground" /> {ev.city}
                        </TableCell>
                        <TableCell className="text-xs md:text-sm">{ev.venue}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Sin eventos próximos.</p>
            )}
          </CardContent>
  </Card>
      <audio ref={audioRef} className="hidden" aria-hidden="true" />
    </div>
  );
}
