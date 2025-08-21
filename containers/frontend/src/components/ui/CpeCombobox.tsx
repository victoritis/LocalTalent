import * as React from "react";
import { Check, ChevronsUpDown, Loader2, PlusCircle, TextCursorInput } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useDebounce } from "@/hooks/useDebounce";
import { searchCpes } from "@/services/organizations/organizationApi";

interface CpeComboboxProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  className?: string;
}

const SEARCH_LIMIT = 10;

export function CpeCombobox({
  value,
  onValueChange,
  placeholder = "Selecciona un CPE...",
  searchPlaceholder = "Buscar CPE...",
  emptyMessage = "No se encontraron CPEs.",
  disabled = false,
  className,
}: CpeComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");
  const debouncedSearchTerm = useDebounce(inputValue, 300);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSearching, setIsSearching] = React.useState(false);
  const [results, setResults] = React.useState<string[]>([]);
  const [offset, setOffset] = React.useState(0);
  const [hasMore, setHasMore] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const performSearch = async () => {
      if (debouncedSearchTerm.length < 3) {
        setResults([]);
        setHasMore(false);
        setOffset(0);
        setError(null);
        setIsSearching(false);
        return;
      }

      setIsLoading(true);
      setIsSearching(true);
      setError(null);
      setOffset(0);

      try {
        const response = await searchCpes(debouncedSearchTerm, SEARCH_LIMIT, 0);
        if (response.error) {
          throw new Error(response.error);
        }
        setResults(response.results ?? []);
        setHasMore(response.has_more ?? false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al buscar CPEs");
        setResults([]);
        setHasMore(false);
      } finally {
        setIsLoading(false);
        setIsSearching(false);
      }
    };

    performSearch();
  }, [debouncedSearchTerm]);

  const handleLoadMore = async () => {
    if (isLoading || !hasMore || debouncedSearchTerm.length < 3) return;

    setIsLoading(true);
    setError(null);
    const nextOffset = offset + SEARCH_LIMIT;

    try {
      const response = await searchCpes(debouncedSearchTerm, SEARCH_LIMIT, nextOffset);
      if (response.error) {
        throw new Error(response.error);
      }
      setResults((prevResults) => [...prevResults, ...(response.results ?? [])]);
      setHasMore(response.has_more ?? false);
      setOffset(nextOffset);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar más CPEs");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = (currentValue: string) => {
    const finalValue = currentValue.trim();
    onValueChange(finalValue === value ? "" : finalValue);
    setInputValue("");
    setOpen(false);
    setResults([]);
    setHasMore(false);
    setOffset(0);
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setInputValue("");
      setResults([]);
      setHasMore(false);
      setOffset(0);
      setError(null);
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
          disabled={disabled}
        >
          <span className="truncate">
            {value ? value : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] max-h-[--radix-popover-content-available-height] p-0">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={searchPlaceholder}
            value={inputValue}
            onValueChange={setInputValue}
            disabled={disabled}
          />
          <CommandList>
            {isSearching && (
              <CommandItem disabled className="flex items-center justify-center text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Buscando...
              </CommandItem>
            )}
            {!isSearching && inputValue.trim().length > 0 && (
              <CommandItem
                key="use-input"
                value={inputValue.trim()}
                onSelect={() => handleSelect(inputValue.trim())}
                className="text-blue-600 dark:text-blue-400 cursor-pointer"
              >
                <TextCursorInput className="mr-2 h-4 w-4" />
                Usar texto: "{inputValue.trim()}"
              </CommandItem>
            )}
            {!isSearching && results.length === 0 && debouncedSearchTerm.length >= 3 && !error && inputValue.trim().length === 0 && (
              <CommandEmpty>{emptyMessage}</CommandEmpty>
            )}
            {error && (
              <CommandEmpty className="text-destructive">Error: {error}</CommandEmpty>
            )}
            {results.length > 0 && (
              <CommandGroup>
                {results.map((cpe) => (
                  <CommandItem
                    key={cpe}
                    value={cpe}
                    onSelect={handleSelect}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === cpe ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {cpe}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {hasMore && (
              <CommandItem
                key="load-more"
                value="load-more"
                onSelect={() => {
                  handleLoadMore();
                }}
                className="text-primary cursor-pointer flex items-center justify-center gap-2"
                disabled={isLoading}
              >
                {isLoading && !isSearching ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Cargando...
                  </>
                ) : (
                  <>
                    <PlusCircle className="h-4 w-4" />
                    Cargar más...
                  </>
                )}
              </CommandItem>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
