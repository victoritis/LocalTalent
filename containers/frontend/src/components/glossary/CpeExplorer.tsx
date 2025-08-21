import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Search, AlertTriangle, Info,  ChevronRight } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import { searchCpes } from "@/services/organizations/organizationApi";
import { fetchCpeDetails, CpeDetail as CpeDetailType } from "@/services/cpeApi";
import { CpeDetailView } from "@/components/cpe/CpeDetailView";
import { toast } from "sonner";

interface CpeSearchResult {
  id: string;
  title?: string; 
}

const RESULTS_LIMIT = 15;

export function CpeExplorer() {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<CpeSearchResult[]>([]);
  const [selectedCpe, setSelectedCpe] = useState<CpeDetailType | null>(null);
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
      const response = await searchCpes(term, RESULTS_LIMIT, currentOffset);
      if (response.error) {
        throw new Error(response.error);
      }

      const newResults = response.results?.map(id => ({ id })) || [];

      setSearchResults(prevResults => loadMore ? [...prevResults, ...newResults] : newResults);
      setHasMoreResults(response.has_more || false);
      if (response.has_more) {
        setOffset(currentOffset + newResults.length); 
      } else {
        // No hay más resultados, el offset podría no necesitar cambio
      }

    } catch (err) {
      const message = err instanceof Error ? err.message : "Error desconocido al buscar CPEs.";
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
    setSelectedCpe(null);
    setDetailError(null);
  }, [debouncedSearchTerm]);

  const handleSelectCpe = async (cpeId: string) => {
    setIsLoadingDetails(true);
    setDetailError(null);
    setSelectedCpe(null);
    try {
      const details = await fetchCpeDetails(cpeId);
      setSelectedCpe(details);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error desconocido al cargar detalles del CPE.";
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
              <CardTitle className="text-lg">Resultados de Búsqueda</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col overflow-hidden">
              <div className="flex gap-2 mb-4 mt-1">
                <div className="relative flex-grow">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Ej: cpe:2.3:a:apache:http_server:2.4.53"
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
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{searchError}</AlertDescription>
                  </Alert>
                )}
                {!isLoadingSearch && !searchError && searchResults.length === 0 && debouncedSearchTerm.length >=3 && (
                  <div className="text-center py-10 text-muted-foreground h-full flex flex-col justify-center"> {/* h-full para centrar */}
                    <Info size={32} className="mx-auto mb-2" />
                    <p>No se encontraron resultados para "{debouncedSearchTerm}".</p>
                    <p className="text-xs">Intenta con un término de búsqueda diferente.</p>
                  </div>
                )}
                {!isLoadingSearch && !searchError && searchResults.length === 0 && debouncedSearchTerm.length < 3 && (
                   <div className="text-center py-10 text-muted-foreground h-full flex flex-col justify-center"> {/* h-full para centrar */}
                    <Search size={32} className="mx-auto mb-2" />
                    <p>Introduce un término para buscar CPEs.</p>
                  </div>
                )}

                {searchResults.length > 0 && (
                  <ScrollArea className="h-full pr-3">
                    <ul className="space-y-2">
                      {searchResults.map((cpe) => (
                        <li key={cpe.id}>
                          <Button
                            variant="ghost"
                            className="w-full justify-start text-left h-auto py-2 px-3 hover:bg-muted"
                            onClick={() => handleSelectCpe(cpe.id)}
                            disabled={isLoadingDetails}
                          >
                            <div className="flex-1 overflow-hidden">
                              <p className="text-sm font-medium truncate" title={cpe.id}>{cpe.id}</p>
                            </div>
                            <ChevronRight size={16} className="ml-2 text-muted-foreground" />
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
            <div className="flex items-center justify-center h-full rounded-lg border border-dashed">
              <Loader2 className="mr-2 h-8 w-8 animate-spin text-primary" /> <span className="text-lg">Cargando detalles...</span>
            </div>
          )}
          {!isLoadingDetails && detailError && (
            <Alert variant="destructive" className="h-full">
              <AlertTriangle className="h-5 w-5" />
              <AlertTitle>Error al cargar detalles</AlertTitle>
              <AlertDescription>{detailError}</AlertDescription>
            </Alert>
          )}
          {!isLoadingDetails && !detailError && selectedCpe && (
            <CpeDetailView cpeData={selectedCpe.data} cpeId={selectedCpe.id} />
          )}
          {!isLoadingDetails && !detailError && !selectedCpe && (
            <div className="flex flex-col items-center justify-center h-full rounded-lg border border-dashed text-muted-foreground p-8 text-center">
              <Info size={40} className="mb-4 opacity-50" />
              <h3 className="text-lg font-semibold">Selecciona un CPE</h3>
              <p className="text-sm">
                Busca un CPE en el panel de la izquierda y selecciónalo para ver sus detalles aquí.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
