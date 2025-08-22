import * as React from 'react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { MapPin, Loader2, Crosshair, ChevronsUpDown } from 'lucide-react';
import { useAuth } from '@/auth';
import { cn } from '@/lib/utils';

export const LocationSelector: React.FC = () => {
  const { city, setCity, detectCity } = useAuth();
  const [loadingGeo, setLoadingGeo] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');

  const AVAILABLE_CITIES = ['Madrid','Barcelona','Valencia','Sevilla','Bilbao','Granada','Zaragoza','Córdoba'];
  const filtered = AVAILABLE_CITIES.filter(c => c.toLowerCase().includes(search.toLowerCase()));

  const handleSelect = (value: string) => {
    if (value === '__geo__') {
      setLoadingGeo(true);
      setError(null);
      try {
        detectCity();
      } catch (e) {
        setError('No se pudo detectar la ubicación');
      } finally {
        setTimeout(()=>setLoadingGeo(false), 800);
      }
      return;
    }
    setCity(value);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
            size="sm"
            className="w-full justify-start h-8 px-2 gap-2 font-normal hover:bg-accent/50"
            aria-label="Seleccionar ciudad"
        >
          <MapPin className="h-4 w-4" />
          <span className="truncate text-sm">{city || 'Selecciona ciudad'}</span>
          <ChevronsUpDown className="ml-auto h-3.5 w-3.5 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-60 p-0" align="start" sideOffset={6}>
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Buscar ciudad..."
            value={search}
            onValueChange={setSearch}
            className="text-sm"
          />
          <CommandList className="max-h-56">
            <CommandEmpty className="py-4 text-xs text-muted-foreground">Sin resultados</CommandEmpty>
            <CommandGroup heading="Acciones" className="text-[10px] uppercase tracking-wide">
              <CommandItem
                value="__geo__"
                onSelect={handleSelect}
                disabled={loadingGeo}
                className="gap-2 text-xs"
              >
                {loadingGeo ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Crosshair className="h-4 w-4" />
                )}
                <span>{loadingGeo ? 'Detectando...' : 'Usar mi ubicación'}</span>
              </CommandItem>
            </CommandGroup>
            <CommandGroup heading="Ciudades" className="text-[10px] uppercase tracking-wide">
              {filtered.map((c) => (
                <CommandItem
                  key={c}
                  value={c}
                  onSelect={handleSelect}
                  className={cn(
                    'gap-2 text-xs',
                    city === c && 'bg-accent/70 text-accent-foreground'
                  )}
                >
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{c}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
          {error && (
            <div className="px-3 py-2 text-[11px] text-destructive border-t bg-destructive/5">
              {error}
            </div>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
};
