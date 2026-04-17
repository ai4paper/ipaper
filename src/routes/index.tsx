import { Title } from "@solidjs/meta";
import AgentApp from "~/components/agent/AgentApp";

export default function Home() {
  return (
    <>
      <a
        href="#main-content"
        class="sr-only rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus-visible:ring-2 focus-visible:ring-ring"
      >
        Skip to Main Content
      </a>
      <main id="main-content" class="flex min-h-0 flex-1 px-2 py-2 sm:px-3 sm:py-3 lg:px-4 lg:py-4">
        <Title>iPaper Web Agent</Title>
        <div class="flex min-h-0 w-full flex-1 flex-col">
          <AgentApp restoreLastCwd={false} />
        </div>
      </main>
    </>
  );
}
