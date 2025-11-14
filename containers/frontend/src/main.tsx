import ReactDOM from "react-dom/client";
import { RouterProvider, createRouter } from "@tanstack/react-router";

import { routeTree } from "./routeTree.gen";
import { AuthProvider, useAuth } from "./auth";
import "./index.css";
import "leaflet/dist/leaflet.css";
import { Toaster } from "@/components/ui/sonner"; // Importar Toaster

// Manejo de errores de importación dinámica
// Esto evita errores cuando el navegador tiene cacheada una versión antigua
const RELOAD_KEY = 'dynamic-import-reload-attempted';

window.addEventListener('error', (event) => {
  // Detectar errores de importación dinámica
  if (
    event.message?.includes('Failed to fetch dynamically imported module') ||
    event.message?.includes('Importing a module script failed')
  ) {
    const hasReloaded = sessionStorage.getItem(RELOAD_KEY);

    if (!hasReloaded) {
      console.log('Detectado error de importación dinámica. Recargando página...');
      sessionStorage.setItem(RELOAD_KEY, 'true');
      window.location.reload();
    } else {
      console.error('Error persistente de importación dinámica después de recargar');
      sessionStorage.removeItem(RELOAD_KEY);
    }
  }
});

// Limpiar el flag de recarga cuando la página carga exitosamente
window.addEventListener('load', () => {
  sessionStorage.removeItem(RELOAD_KEY);
});

// Manejar promesas rechazadas (para errores de importación en async/await)
window.addEventListener('unhandledrejection', (event) => {
  const errorMsg = event.reason?.message || event.reason?.toString() || '';

  if (
    errorMsg.includes('Failed to fetch dynamically imported module') ||
    errorMsg.includes('Importing a module script failed') ||
    errorMsg.includes('Failed to fetch') ||
    errorMsg.includes('error loading dynamically imported module')
  ) {
    event.preventDefault();
    const hasReloaded = sessionStorage.getItem(RELOAD_KEY);

    if (!hasReloaded) {
      console.log('Detectado error de importación dinámica (promise). Recargando página...');
      sessionStorage.setItem(RELOAD_KEY, 'true');
      window.location.reload();
    } else {
      console.error('Error persistente de importación dinámica después de recargar');
      sessionStorage.removeItem(RELOAD_KEY);
    }
  }
});

// Set up a Router instance
const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  // scrollRestoration: true,
  context: {
    auth: undefined!, // Este valor se asignará una vez que la app esté envuelta en AuthProvider
  },
  defaultErrorComponent: ({ error }) => {
    // Manejar errores de importación de módulos
    if (error?.message?.includes('Failed to fetch dynamically imported module')) {
      const hasReloaded = sessionStorage.getItem(RELOAD_KEY);

      if (!hasReloaded) {
        sessionStorage.setItem(RELOAD_KEY, 'true');
        window.location.reload();
        return null;
      }
    }

    // Para otros errores, mostrar un mensaje genérico
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h1 style={{ color: '#ef4444', marginBottom: '1rem' }}>Error</h1>
        <p style={{ color: '#6b7280' }}>{error?.message || 'Ha ocurrido un error inesperado'}</p>
        <button
          onClick={() => window.location.reload()}
          style={{
            marginTop: '1rem',
            padding: '0.5rem 1rem',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '0.375rem',
            cursor: 'pointer'
          }}
        >
          Recargar página
        </button>
      </div>
    );
  },
});

// Registro para typesafety
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}

function InnerApp() {
  const auth = useAuth();
  return <RouterProvider router={router} context={{ auth }} />;
}

function App() {
  return (
    <AuthProvider>
      <InnerApp />
      <Toaster richColors position="top-right" closeButton theme="system" />
    </AuthProvider>
  );
}

const rootElement = document.getElementById("root")!;

if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    // <React.StrictMode>
      <App />
    // </React.StrictMode>
  );
}
