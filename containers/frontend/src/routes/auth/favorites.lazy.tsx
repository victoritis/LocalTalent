import { createLazyFileRoute } from '@tanstack/react-router';
import { Heart } from 'lucide-react';
import { useAuth } from '@/auth';

export const Route = createLazyFileRoute('/auth/favorites')({
  component: FavoritesPage,
});

function FavoritesPage() {
  const { city } = useAuth();
  return (
    <div className="space-y-6">
      <header className="flex items-center gap-2">
        <Heart className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold tracking-tight">Favoritos</h1>
      </header>
      <div className="rounded-xl border p-6 bg-muted/30 text-sm text-muted-foreground">
        La funcionalidad de favoritos se re-implementará más adelante{city ? ` para ${city}` : ''}. Por ahora esta vista es un placeholder.
      </div>
    </div>
  );
}

export default FavoritesPage;
