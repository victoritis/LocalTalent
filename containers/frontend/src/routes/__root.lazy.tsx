import { Outlet, createRootRouteWithContext } from "@tanstack/react-router";
import type { AuthContextInterface } from "@/auth";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";

interface MyRouterContext {
  auth: AuthContextInterface;
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  component: () => (
    <ErrorBoundary>
      <Outlet />
      {/* <Suspense>
        <TanStackRouterDevtools />
      </Suspense> */}
    </ErrorBoundary>
  ),
});
