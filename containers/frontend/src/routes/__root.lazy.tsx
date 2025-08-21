import { Outlet, createRootRouteWithContext } from "@tanstack/react-router";
import type { AuthContextInterface } from "@/auth";

interface MyRouterContext {
  auth: AuthContextInterface;
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  component: () => (
    <>
      <Outlet />
      {/* <Suspense>
        <TanStackRouterDevtools />
      </Suspense> */}
    </>
  ),
});
