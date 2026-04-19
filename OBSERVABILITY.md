# Observabilidad frontend

LocalTalent integra [Sentry](https://sentry.io/) en el frontend a través de
`@sentry/react`. La inicialización está en
`containers/frontend/src/lib/sentry.ts` y se arranca en `main.tsx` antes de
registrar los handlers globales, por lo que los errores capturados por Sentry
llegan siempre antes de cualquier `event.preventDefault()` que tengamos para el
flujo de recarga de módulos dinámicos.

`ErrorBoundary` reenvía cualquier error que captura a `Sentry.captureException`
vía el helper `captureException` del módulo anterior. Los listeners
`window.addEventListener('error' | 'unhandledrejection')` de `main.tsx` siguen
existiendo sólo para la lógica de auto-reload tras un fallo de import dinámico:
no reportan manualmente a Sentry porque la integración `GlobalHandlers` de
`@sentry/react` ya lo hace, evitando duplicados.

## Variables de entorno (Vite)

Todas empiezan por `VITE_` para que queden expuestas al bundle del cliente:

| Variable | Requerida | Descripción |
| --- | --- | --- |
| `VITE_SENTRY_DSN` | sí (para activar) | DSN del proyecto Sentry. Si está vacío, la integración queda deshabilitada y los errores sólo se loguean en consola en desarrollo. |
| `VITE_SENTRY_ENVIRONMENT` | no | Override del entorno reportado. Por defecto usa `import.meta.env.MODE` (`development`, `production`, etc.). |
| `VITE_SENTRY_RELEASE` | no | Identificador de release (ej: el SHA corto). Útil para filtrar issues por despliegue. |
| `VITE_SENTRY_TRACES_SAMPLE_RATE` | no | Ratio (0–1) de traces de performance. Por defecto `0`. |
| `VITE_SENTRY_REPLAYS_SESSION_SAMPLE_RATE` | no | Ratio (0–1) de session replays. Por defecto `0`. |
| `VITE_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE` | no | Ratio (0–1) de replays sólo cuando hay error. Por defecto `0`. |

## Provisionar por entorno

1. **Local (`.env.local`)**: dejar `VITE_SENTRY_DSN` vacío para no mandar nada.
   Cualquier `ErrorBoundary` logueará en consola en dev.
2. **Staging / Production**: inyectar las variables en el build de Vite
   (ej: pipeline CI o `compose.yml`). Ejemplo para Docker Compose:

   ```yaml
   frontend:
     build:
       args:
         VITE_SENTRY_DSN: ${SENTRY_DSN}
         VITE_SENTRY_ENVIRONMENT: production
         VITE_SENTRY_RELEASE: ${GIT_SHA}
         VITE_SENTRY_TRACES_SAMPLE_RATE: "0.1"
   ```

3. **Verificación manual**: lanzar en la consola del navegador
   `throw new Error("sentry test")` dentro de un componente envuelto por
   `ErrorBoundary` (por ejemplo forzando un estado de error) y comprobar que
   aparece en el dashboard. Sin DSN, aparecerá en la consola como
   `[sentry disabled] …`.

## Extender la instrumentación

Para instrumentar operaciones concretas, importa el helper:

```ts
import { captureException } from "@/lib/sentry"

try {
  await risky()
} catch (err) {
  captureException(err, { area: "risky" })
}
```

Esto respeta el flag interno `initialized`: si Sentry no está configurado,
sólo se registra en `console.error` en desarrollo.
