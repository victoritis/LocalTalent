import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin } from 'lucide-react';
import { Event } from '@/lib/music/mock';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export const EventCard: React.FC<{ event: Event }> = ({ event }) => {
  const dateLabel = format(new Date(event.date), 'PP', { locale: es });
  return (
    <Card className="group overflow-hidden hover:shadow-md transition">
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-semibold leading-tight text-sm md:text-base">{event.title}</h3>
            <div className="flex flex-wrap gap-2 mt-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {dateLabel}</span>
              <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {event.city}</span>
              <Badge variant="outline" className="text-[10px]">{event.genre}</Badge>
            </div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2">{event.venue}</p>
      </CardContent>
    </Card>
  );
};
