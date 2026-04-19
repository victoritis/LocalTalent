import { AlertTriangle, RotateCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface ErrorStateProps {
  title?: string
  message?: string
  onRetry?: () => void
  retryLabel?: string
  className?: string
}

export function ErrorState({
  title = "Algo salió mal",
  message = "No se pudo completar la operación. Inténtalo de nuevo.",
  onRetry,
  retryLabel = "Reintentar",
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center gap-3 py-10 px-4 text-center",
        className,
      )}
    >
      <AlertTriangle
        aria-hidden="true"
        className="w-10 h-10 text-destructive"
      />
      <div className="space-y-1">
        <h3 className="font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          {message}
        </p>
      </div>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="mt-1"
        >
          <RotateCw aria-hidden="true" className="w-4 h-4 mr-2" />
          {retryLabel}
        </Button>
      )}
    </div>
  )
}
