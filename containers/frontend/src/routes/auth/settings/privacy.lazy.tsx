import { createLazyFileRoute } from '@tanstack/react-router'
import { PrivacySettings } from '@/components/security/PrivacySettings'
import { BlockedUsers } from '@/components/security/BlockedUsers'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

function PrivacyPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Privacidad y Seguridad</CardTitle>
          <CardDescription>Gestiona tu privacidad y usuarios bloqueados</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="privacy" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="privacy">Configuración de Privacidad</TabsTrigger>
              <TabsTrigger value="blocked">Usuarios Bloqueados</TabsTrigger>
            </TabsList>
            <TabsContent value="privacy" className="mt-6">
              <PrivacySettings />
            </TabsContent>
            <TabsContent value="blocked" className="mt-6">
              <BlockedUsers />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

export const Route = createLazyFileRoute('/auth/settings/privacy')({
  component: PrivacyPage
})
