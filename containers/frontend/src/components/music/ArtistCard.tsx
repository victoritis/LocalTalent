import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Music2 } from 'lucide-react';
import { Artist } from '@/lib/music/mock';

export const ArtistCard: React.FC<{ artist: Artist }> = ({ artist }) => {
  return (
    <Card className="group overflow-hidden transition hover:shadow-md">
      <CardContent className="p-4 flex items-center gap-4">
        <Avatar className="h-16 w-16 border">
          <AvatarImage src={artist.avatar} alt={artist.name} />
          <AvatarFallback>{artist.name.slice(0,2)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-medium truncate">{artist.name}</p>
            <Badge variant="outline" className="text-[10px] gap-1"><Music2 className="h-3 w-3" /> {artist.genre}</Badge>
          </div>
          <p className="text-xs text-muted-foreground">{(artist.followers/1000).toFixed(1)}k seguidores · {artist.city}</p>
        </div>
      </CardContent>
    </Card>
  );
};
