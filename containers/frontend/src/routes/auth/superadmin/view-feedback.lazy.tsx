import { createLazyFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import {
  fetchAllFeedbacks,
  toggleFeedbackArchiveStatus,
  PaginatedFeedbacksResponse,
} from "@/services/admin/superadminApi";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Loader2,
  AlertTriangle,
  MessageSquareText,
  Archive,
  ArchiveRestore,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

export const Route = createLazyFileRoute("/auth/superadmin/view-feedback")({
  component: ViewFeedbackPage,
});

function ViewFeedbackPage() {
  const [feedbacksResponse, setFeedbacksResponse] =
    useState<PaginatedFeedbacksResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const loadFeedbacks = useCallback(async (page: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchAllFeedbacks(page, itemsPerPage);
      setFeedbacksResponse(data);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Error desconocido al cargar feedbacks.";
      setError(message);
      toast.error("Error al cargar feedbacks", { description: message });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFeedbacks(currentPage);
  }, [currentPage, loadFeedbacks]);

  const handleToggleArchive = async (feedbackId: number) => {
    const originalFeedbacks = feedbacksResponse
      ? [...feedbacksResponse.feedbacks]
      : [];

    // Optimistic update
    if (feedbacksResponse) {
      const updatedFeedbacks = feedbacksResponse.feedbacks.map((fb) =>
        fb.id === feedbackId ? { ...fb, is_archived: !fb.is_archived } : fb,
      );
      setFeedbacksResponse((prev) =>
        prev ? { ...prev, feedbacks: updatedFeedbacks } : null,
      );
    }

    try {
      await toggleFeedbackArchiveStatus(feedbackId);
      toast.success("Estado del feedback actualizado.");
     } catch (err) {
      setFeedbacksResponse((prev) =>
        prev ? { ...prev, feedbacks: originalFeedbacks } : null,
      );
      const message =
        err instanceof Error ? err.message : "Error al actualizar feedback.";
      toast.error("Error al actualizar feedback", { description: message });
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    try {
      return format(parseISO(dateString), "PPPp", { locale: es });
    } catch {
      return "Fecha inválida";
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= (feedbacksResponse?.total_pages || 1)) {
      setCurrentPage(newPage);
    }
  };

  if (isLoading && !feedbacksResponse) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Alert variant="destructive" className="max-w-2xl mx-auto">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error al Cargar Feedbacks</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center space-x-3">
            <MessageSquareText className="h-7 w-7 text-primary" />
            <div>
              <CardTitle className="text-2xl">
                Consulta de Feedback de Usuarios
              </CardTitle>
              <CardDescription>
                Visualiza y gestiona los comentarios enviados por los usuarios.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {feedbacksResponse && feedbacksResponse.feedbacks.length > 0 ? (
            <ScrollArea className="w-full whitespace-nowrap rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">ID</TableHead>
                    <TableHead>Mensaje</TableHead>
                    <TableHead className="w-[180px]">Fecha de Envío</TableHead>
                    <TableHead className="w-[150px] text-center">
                      Archivado
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {feedbacksResponse.feedbacks.map((fb) => (
                    <TableRow
                      key={fb.id}
                      className={fb.is_archived ? "bg-muted/30" : ""}
                    >
                      <TableCell className="font-medium">{fb.id}</TableCell>
                      <TableCell className="whitespace-pre-wrap max-w-xl break-words">
                        {fb.message}
                      </TableCell>
                      <TableCell>{formatDate(fb.createdAt)}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center space-x-2">
                          {fb.is_archived ? (
                            <Archive size={18} className="text-gray-500" />
                          ) : (
                            <ArchiveRestore
                              size={18}
                              className="text-green-600"
                            />
                          )}
                          <Switch
                            checked={fb.is_archived}
                            onCheckedChange={() => handleToggleArchive(fb.id)}
                            aria-label={
                              fb.is_archived
                                ? "Desarchivar feedback"
                                : "Archivar feedback"
                            }
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          ) : (
            <div className="text-center py-10 text-muted-foreground">
              <MessageSquareText
                size={40}
                className="mx-auto mb-4 opacity-50"
              />
              <p>No hay feedbacks para mostrar.</p>
            </div>
          )}
        </CardContent>
        {feedbacksResponse && feedbacksResponse.total_pages > 1 && (
          <CardFooter className="flex items-center justify-between pt-4 border-t">
            <span className="text-sm text-muted-foreground">
              Página {feedbacksResponse.page} de {feedbacksResponse.total_pages}{" "}
              (Total: {feedbacksResponse.total_items} feedbacks)
            </span>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === feedbacksResponse.total_pages}
              >
                Siguiente <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
