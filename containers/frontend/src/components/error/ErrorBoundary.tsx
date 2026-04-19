import { Component, ErrorInfo, ReactNode } from "react"
import { ErrorState } from "@/components/ui/error-state"
import { captureException } from "@/lib/sentry"

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: (error: Error, reset: () => void) => ReactNode
  onError?: (error: Error, info: ErrorInfo) => void
}

interface ErrorBoundaryState {
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    captureException(error, { componentStack: info.componentStack })
    if (this.props.onError) {
      this.props.onError(error, info)
    } else if (import.meta.env.DEV) {
      console.error("ErrorBoundary caught:", error, info)
    }
  }

  reset = () => this.setState({ error: null })

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    if (this.props.fallback) return this.props.fallback(error, this.reset)

    return (
      <ErrorState
        title="Error en esta sección"
        message={error.message || "Ha ocurrido un error inesperado."}
        onRetry={this.reset}
      />
    )
  }
}
