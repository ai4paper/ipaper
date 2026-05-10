import {
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { RootComponent } from "./routes/__root";
import { IndexComponent } from "./routes/index";
import { ChatComponent } from "./routes/chats.$chatId";

const rootRoute = createRootRoute({
  component: RootComponent,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: IndexComponent,
});

const chatRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/chats/$chatId",
  component: ChatComponent,
});

const routeTree = rootRoute.addChildren([indexRoute, chatRoute]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
