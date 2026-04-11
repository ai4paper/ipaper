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
      <main id="main-content" class="min-h-screen px-3 py-4 sm:px-5 sm:py-5 lg:px-6">
        <Title>iPaper Web Agent</Title>
        <div class="mx-auto flex w-full max-w-7xl flex-col gap-6">
          <AgentApp restoreLastCwd={false} />
        </div>
      </main>
    </>
  );
}
