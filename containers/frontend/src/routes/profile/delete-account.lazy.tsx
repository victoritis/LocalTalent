import { createLazyFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'

export const Route = createLazyFileRoute('/profile/delete-account')({
    component: DeleteAccountConfirmation
})

function DeleteAccountConfirmation() {
    // Obtener token de la URL
    const search = Route.useSearch() as { token: string }
    const token = search.token

    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
    const [message, setMessage] = useState('')
    const apiUrl = import.meta.env.VITE_REACT_APP_API_URL

    useEffect(() => {
        if (!token) {
            setStatus('error')
            setMessage('Token no proporcionado')
            return
        }

        const confirmDeletion = async () => {
            try {
                const response = await fetch(`${apiUrl}/api/v1/profile/confirm-deletion`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ token })
                })

                const data = await response.json()

                if (response.ok) {
                    setStatus('success')
                    setMessage(data.message || 'Tu cuenta ha sido eliminada correctamente')
                } else {
                    setStatus('error')
                    setMessage(data.error || 'Error al eliminar la cuenta')
                }
            } catch (error) {
                setStatus('error')
                setMessage('Error de conexión al servidor')
            }
        }

        confirmDeletion()
    }, [token, apiUrl])

    return (
        <div className="flex items-center justify-center min-h-screen bg-background p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle className="text-center">Eliminación de Cuenta</CardTitle>
                    <CardDescription className="text-center">
                        Procesando tu solicitud de eliminación
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center gap-6">
                    {status === 'loading' && (
                        <div className="flex flex-col items-center gap-4">
                            <Loader2 className="w-12 h-12 animate-spin text-primary" />
                            <p className="text-muted-foreground">Verificando token...</p>
                        </div>
                    )}

                    {status === 'success' && (
                        <div className="flex flex-col items-center gap-4">
                            <CheckCircle className="w-12 h-12 text-green-500" />
                            <p className="text-center font-medium">{message}</p>
                            <Button asChild className="mt-4">
                                <Link to="/">Volver al Inicio</Link>
                            </Button>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="flex flex-col items-center gap-4">
                            <XCircle className="w-12 h-12 text-destructive" />
                            <p className="text-center font-medium text-destructive">{message}</p>
                            <p className="text-center text-sm text-muted-foreground">
                                El enlace puede haber expirado o ser inválido.
                            </p>
                            <Button asChild variant="outline" className="mt-4">
                                <Link to="/">Volver al Inicio</Link>
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
