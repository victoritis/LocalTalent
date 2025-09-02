import React from 'react'
import { createLazyFileRoute } from '@tanstack/react-router'
import { getArtistsByCity, getEventsByCity } from '@/lib/music/mock'
import { ArtistCard } from '@/components/music/ArtistCard'
import { EventCard } from '@/components/music/EventCard'
import { Badge } from '@/components/ui/badge'
import { Music2, Calendar, MapPin } from 'lucide-react'
import type { City } from '@/lib/music/mock'

export const Route = createLazyFileRoute('/auth/home')({
  component: HomePage,
})

function HomePage() {
  // Vista neutra sin ciudad
  const city: string | null = null

  const cityTyped = city as City | null // city proviene de auth como string | null
  const artists = React.useMemo(() => getArtistsByCity(cityTyped), [cityTyped])
  const events = React.useMemo(() => getEventsByCity(cityTyped), [cityTyped])

  return (
    <div className="space-y-10 pb-8">
      <section className="rounded-3xl border bg-gradient-to-br from-primary/5 via-background to-background p-6 md:p-10 flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div className="space-y-4 max-w-2xl">
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight leading-tight">Bienvenido</h1>
            <p className="text-muted-foreground text-sm md:text-base">
              Inicio del dashboard. Personaliza este módulo según tu dominio.
            </p>
            {/* Badge de ciudad eliminado en base reusable */}
          </div>
          <div className="flex gap-4 text-xs md:text-sm">
            <div className="flex flex-col items-center">
              <span className="text-lg md:text-2xl font-semibold">
                {artists.length}
              </span>
              <span className="text-muted-foreground">Artistas</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-lg md:text-2xl font-semibold">
                {events.length}
              </span>
              <span className="text-muted-foreground">Eventos</span>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <header className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-semibold text-xl">
            <Music2 className="h-5 w-5 text-primary" /> Contenido de ejemplo
          </h2>
        </header>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {artists.map((a) => (
            <ArtistCard key={a.id} artist={a} />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <header className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-semibold text-xl">
            <Calendar className="h-5 w-5 text-primary" /> Eventos{' '}
            {city && `en ${city}`}
          </h2>
        </header>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((e) => (
            <EventCard key={e.id} event={e} />
          ))}
          {events.length === 0 && (
            <p className="text-sm text-muted-foreground col-span-full">
              Sin eventos para esta ciudad.
            </p>
          )}
        </div>
      </section>

      {/* Sección de favoritos eliminada temporalmente */}
    </div>
  )
}

export default HomePage
