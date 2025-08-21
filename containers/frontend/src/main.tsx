import ReactDOM from "react-dom/client";
import { RouterProvider, createRouter } from "@tanstack/react-router";

import { routeTree } from "./routeTree.gen";
import { AuthProvider, useAuth } from "./auth";
import "./index.css";
import { Toaster } from "@/components/ui/sonner"; // Importar Toaster

// Set up a Router instance
const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  // scrollRestoration: true,
  context: {
    auth: undefined!, // Este valor se asignará una vez que la app esté envuelta en AuthProvider
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
