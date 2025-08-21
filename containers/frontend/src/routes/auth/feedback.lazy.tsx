import { useState } from "react";
import { createLazyFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send, MessageSquareText, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { fetchWithCredentials } from "@/lib/utils"; 

export const Route = createLazyFileRoute("/auth/feedback")({
  component: RouteComponent,
});


export function RouteComponent() {
  const [feedbackText, setFeedbackText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const apiUrl = import.meta.env.VITE_REACT_APP_API_URL;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!feedbackText.trim()) {
      toast.warning("Por favor, escribe tu comentario antes de enviarlo.");
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading("Enviando feedback...");

    try {
      const response = await fetchWithCredentials(`${apiUrl}/api/v1/submit-feedback`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ feedback_text: feedbackText }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Error al procesar la respuesta del servidor." }));
        throw new Error(errorData.error || `Error ${response.status} al enviar el feedback.`);
      }
      setIsSent(true);
      setFeedbackText(""); 
      toast.success("¡Feedback enviado!", {
        id: toastId,
        description: "Gracias por tus comentarios.",
      });

    } catch (error) {
      const message = error instanceof Error ? error.message : "Ocurrió un error desconocido.";
      toast.error("Error al enviar feedback", {
        id: toastId,
        description: message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendAnother = () => {
    setIsSent(false);
    setFeedbackText("");
  };

  if (isSent) {
    return (
      <div className="container mx-auto py-12 px-4 flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <Card className="w-full max-w-lg text-center shadow-xl">
          <CardHeader>
            <div className="mx-auto bg-green-100 p-3 rounded-full w-fit">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <CardTitle className="text-2xl mt-4">¡Gracias por tus comentarios!</CardTitle>
            <CardDescription className="text-md">
              Hemos "recibido" tu mensaje y lo tendremos en cuenta.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center space-y-4">
              <Send className="h-16 w-16 text-primary animate-pulse" />
              <p className="text-sm text-muted-foreground">
                Valoramos tu opinión para mejorar nuestros servicios.
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button onClick={handleSendAnother} variant="outline">
              Enviar otro comentario
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-12 px-4 flex items-center justify-center min-h-[calc(100vh-200px)]">
      <Card className="w-full max-w-lg shadow-xl">
        <CardHeader>
          <div className="flex items-center space-x-3 mb-2">
            <MessageSquareText className="h-8 w-8 text-primary" />
            <div>
              <CardTitle className="text-2xl">Enviar Comentarios</CardTitle>
              <CardDescription>
                Nos encantaría escuchar tus ideas, sugerencias o problemas que hayas encontrado.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div>
              <Textarea
                id="feedback"
                placeholder="Escribe tu mensaje aquí..."
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                rows={6}
                className="resize-none"
                disabled={isSubmitting}
              />
              <p className="text-xs text-muted-foreground mt-2">
                Tu feedback es anónimo y se utilizará para mejorar la plataforma.
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button type="submit" disabled={isSubmitting || !feedbackText.trim()}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Enviar Feedback
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
