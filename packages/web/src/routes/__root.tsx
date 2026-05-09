import { Outlet } from "@tanstack/react-router";

export function RootComponent() {
  return (
    <div className="flex min-h-screen flex-col bg-neutral-50 text-neutral-900 antialiased">
      <Outlet />
    </div>
  );
}
