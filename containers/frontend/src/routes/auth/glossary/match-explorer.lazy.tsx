import { useState, useEffect, useCallback } from "react";
import { createLazyFileRoute } from "@tanstack/react-router";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Search, AlertTriangle, Info, ListFilter, ChevronRight } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import { searchMatches, fetchMatchDetails, MatchDetail as MatchDetailType } from "@/services/matchApi";
import { MatchDetailView } from "@/components/match/MatchDetailView";
import { toast } from "sonner";

export const Route = createLazyFileRoute("/auth/glossary/match-explorer")({
  component: MatchExplorerPage,
});

interface MatchSearchResult {
  id: string;
}

const RESULTS_LIMIT = 15;

function MatchExplorerPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<MatchSearchResult[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<MatchDetailType | null>(null);
  const [isLoadingSearch, setIsLoadingSearch] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [hasMoreResults, setHasMoreResults] = useState(false);
  const [offset, setOffset] = useState(0);

  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const handleSearch = useCallback(async (term: string, loadMore = false) => {
    if (term.length < 3) {
      setSearchResults([]);
      setSearchError(null);
      setHasMoreResults(false);
      setOffset(0);
      return;
    }

    setIsLoadingSearch(true);
    setSearchError(null);
    if (!loadMore) {
      setOffset(0);
      setSearchResults([]);
    }

    try {
      const currentOffset = loadMore ? offset : 0;
      const response = await searchMatches(term, RESULTS_LIMIT, currentOffset);

      if (response.error) {
        throw new Error(response.error);
      }

      const newResults = response.results?.map(id => ({ id })) || [];

      setSearchResults(prevResults => loadMore ? [...prevResults, ...newResults] : newResults);
      setHasMoreResults(response.has_more || false);

      if (response.has_more) {
        setOffset(currentOffset + newResults.length);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error desconocido al buscar Criterios de Coincidencia.";
      setSearchError(message);
      toast.error("Error en la búsqueda", { description: message });
      if (!loadMore) setSearchResults([]);
    } finally {
      setIsLoadingSearch(false);
    }
  }, [offset]);

  useEffect(() => {
    if (debouncedSearchTerm.length >= 3) {
      handleSearch(debouncedSearchTerm, false);
    } else {
      setSearchResults([]);
      setSearchError(null);
      setHasMoreResults(false);
      setOffset(0);
    }
    setSelectedMatch(null); 
    setDetailError(null);
  }, [debouncedSearchTerm]); 

  const handleSelectMatch = async (matchCriteriaId: string) => {
    if (selectedMatch?.id === matchCriteriaId && !detailError) return;

    setIsLoadingDetails(true);
    setDetailError(null);
    setSelectedMatch(null);
    try {
      const details = await fetchMatchDetails(matchCriteriaId);
      setSelectedMatch(details);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error desconocido al cargar detalles del Criterio.";
      setDetailError(message);
      toast.error("Error al cargar detalles", { description: message });
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleLoadMore = () => {
    if (debouncedSearchTerm && hasMoreResults && !isLoadingSearch) {
      handleSearch(debouncedSearchTerm, true);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 h-[calc(100vh-160px)]">
          <Card className="shadow-md flex flex-col h-full">
            <CardHeader>
              <CardTitle className="text-lg">Resultados de Búsqueda de Criterios</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col overflow-hidden">
              <div className="flex gap-2 mb-4 mt-1">
                <div className="relative flex-grow">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="ID (ej: 000C8C98-6852-4A40-AC7A-28E234A1445F)"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              {searchTerm.length > 0 && searchTerm.length < 3 && (
                <Alert variant="default" className="mt-4 mb-4 bg-blue-50 border-blue-200 text-blue-700">
                  <Info className="h-4 w-4 !text-blue-700" />
                  <AlertDescription>
                    Introduce al menos 3 caracteres para iniciar la búsqueda.
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="flex-grow overflow-hidden">
                {isLoadingSearch && searchResults.length === 0 && (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Cargando...
                  </div>
                )}
                {!isLoadingSearch && searchError && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Error de Búsqueda</AlertTitle>
                    <AlertDescription>{searchError}</AlertDescription>
                  </Alert>
                )}
                {!isLoadingSearch && !searchError && searchResults.length === 0 && debouncedSearchTerm.length >=3 && (
                  <div className="text-center py-10 text-muted-foreground h-full flex flex-col justify-center">
                    <Info size={32} className="mx-auto mb-2" />
                    <p>No se encontraron Criterios para "{debouncedSearchTerm}".</p>
                    <p className="text-xs">Intenta con un término de búsqueda diferente.</p>
                  </div>
                )}
                {!isLoadingSearch && !searchError && searchResults.length === 0 && debouncedSearchTerm.length < 3 && !searchTerm && (
                   <div className="text-center py-10 text-muted-foreground h-full flex flex-col justify-center">
                    <Search size={32} className="mx-auto mb-2" />
                    <p>Introduce un término para buscar Criterios de Coincidencia.</p>
                  </div>
                )}

                {searchResults.length > 0 && (
                  <ScrollArea className="h-full pr-3">
                    <ul className="space-y-2">
                      {searchResults.map((match) => (
                        <li key={match.id}>
                          <Button
                            variant={selectedMatch?.id === match.id ? "secondary" : "ghost"}
                            className="w-full justify-start text-left h-auto py-2 px-3 hover:bg-muted"
                            onClick={() => handleSelectMatch(match.id)}
                            disabled={isLoadingDetails && selectedMatch?.id === match.id}
                          >
                            <div className="flex-1 overflow-hidden">
                              <p className="text-sm font-medium truncate" title={match.id}>{match.id}</p>
                            </div>
                             {isLoadingDetails && selectedMatch?.id === match.id ? (
                               <Loader2 size={16} className="ml-2 animate-spin text-muted-foreground" />
                            ) : (
                               <ChevronRight size={16} className="ml-2 text-muted-foreground" />
                            )}
                          </Button>
                        </li>
                      ))}
                    </ul>
                    {hasMoreResults && (
                      <Button 
                        variant="outline" 
                        className="w-full mt-4" 
                        onClick={handleLoadMore} 
                        disabled={isLoadingSearch}
                      >
                        {isLoadingSearch && offset > 0 ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Cargar más resultados
                      </Button>
                    )}
                  </ScrollArea>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2 h-[calc(100vh-160px)]">
          {isLoadingDetails && (
            <div className="flex items-center justify-center h-full rounded-lg border border-dashed shadow-sm">
              <Loader2 className="mr-2 h-8 w-8 animate-spin text-primary" /> <span className="text-lg text-muted-foreground">Cargando detalles...</span>
            </div>
          )}
          {!isLoadingDetails && detailError && (
            <Card className="h-full shadow-md">
              <CardHeader>
                <CardTitle className="text-destructive">Error</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center h-full">
                <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
                <p className="text-lg font-semibold">Error al cargar detalles</p>
                <p className="text-sm text-muted-foreground">{detailError}</p>
              </CardContent>
            </Card>
          )}
          {!isLoadingDetails && !detailError && selectedMatch && selectedMatch.data && (
            <MatchDetailView matchDetail={selectedMatch.data} matchCriteriaId={selectedMatch.id} />
          )}
          {!isLoadingDetails && !detailError && !selectedMatch && (
            <div className="flex flex-col items-center justify-center h-full rounded-lg border border-dashed text-muted-foreground p-8 text-center shadow-sm bg-card">
              <ListFilter size={40} className="mb-4 opacity-50" />
              <h3 className="text-lg font-semibold">Selecciona un Criterio de Coincidencia</h3>
              <p className="text-sm">
                Busca un criterio en el panel de la izquierda y selecciónalo para ver sus detalles aquí.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
