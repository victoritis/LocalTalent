import { createFileRoute, redirect } from '@tanstack/react-router'
import { useAuth } from '@/auth'

// @ts-ignore provisional hasta regenerar routeTree
export const Route = createFileRoute('/auth/superadmin/dashboard' as any)({
  component: SuperAdminDashboard
})

function SuperAdminDashboard() {
  const { roles } = useAuth()

  if (!roles?.ROLE_SUPERADMIN) {
    throw redirect({ to: '/auth/user/profile' })
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Panel SuperAdmin (LocalTalent)</h1>
      <p className="text-muted-foreground text-sm">Cascarón inicial. Aquí añadiremos métricas y herramientas de administración global.</p>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded border p-4 bg-background/40">
          <h2 className="font-semibold mb-2 text-sm tracking-wide">Métricas</h2>
          <p className="text-xs text-muted-foreground">(Próximamente)</p>
        </div>
        <div className="rounded border p-4 bg-background/40">
          <h2 className="font-semibold mb-2 text-sm tracking-wide">Usuarios</h2>
          <p className="text-xs text-muted-foreground">Gestión global (Próximamente)</p>
        </div>
        <div className="rounded border p-4 bg-background/40">
          <h2 className="font-semibold mb-2 text-sm tracking-wide">Organizaciones</h2>
          <p className="text-xs text-muted-foreground">Listado y alta (Próximamente)</p>
        </div>
      </div>
      <div className="rounded border p-4 bg-background/40">
        <h2 className="font-semibold mb-2 text-sm tracking-wide">Feedback</h2>
        <p className="text-xs text-muted-foreground">Se mostrará bandeja de feedback global.</p>
      </div>
    </div>
  )
}

export default SuperAdminDashboard
