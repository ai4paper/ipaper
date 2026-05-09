import { Outlet } from "@tanstack/react-router";

function IconButton({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      {children}
    </button>
  );
}

export function RootComponent() {
  return (
    <div className="dark flex h-screen w-screen overflow-hidden bg-background text-foreground antialiased">
      <aside className="flex w-12 shrink-0 flex-col items-center gap-1 border-r border-border/60 py-3">
        <IconButton label="Toggle sidebar">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-4"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M9 3v18" />
          </svg>
        </IconButton>
        <IconButton label="New chat">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-4"
          >
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
            <path d="M12 8v6" />
            <path d="M9 11h6" />
          </svg>
        </IconButton>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border/60 px-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="New conversation"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-4"
              >
                <path d="M12 5v14" />
                <path d="M5 12h14" />
              </svg>
            </button>
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-medium text-foreground">
                New conversation
              </span>
              <span className="text-xs text-muted-foreground">
                IPaper Agent
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <div className="mr-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="relative inline-flex size-3 items-center justify-center">
                <span className="absolute inset-0 rounded-full border-2 border-emerald-500/30" />
                <span
                  className="absolute inset-0 rounded-full border-2 border-transparent border-t-emerald-500"
                  style={{ transform: "rotate(40deg)" }}
                />
              </span>
              <span className="font-medium text-foreground">Ready</span>
            </div>
            <IconButton label="Layers">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-4"
              >
                <path d="m12 2 9 5-9 5-9-5 9-5z" />
                <path d="m3 17 9 5 9-5" />
                <path d="m3 12 9 5 9-5" />
              </svg>
            </IconButton>
            <IconButton label="Terminal">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-4"
              >
                <path d="m4 17 6-6-6-6" />
                <path d="M12 19h8" />
              </svg>
            </IconButton>
            <IconButton label="Right panel">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-4"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M15 3v18" />
              </svg>
            </IconButton>
          </div>
        </header>

        <Outlet />
      </div>
    </div>
  );
}
