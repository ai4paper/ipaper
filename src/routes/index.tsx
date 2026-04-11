import { Title } from "@solidjs/meta";
import AgentApp from "~/components/agent/AgentApp";

export default function Home() {
  return (
    <>
      <a
        href="#main-content"
        class="sr-only z-50 rounded-full bg-slate-900 px-3 py-2 text-sm text-white focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus-visible:ring-2 focus-visible:ring-sky-400/60"
      >
        Skip to Main Content
      </a>
      <main id="main-content" class="min-h-screen px-3 py-4 sm:px-5 sm:py-5 lg:px-6">
        <Title>iPaper Web Agent</Title>
        <div class="mx-auto w-full max-w-6xl">
          <AgentApp />
        </div>
      </main>
    </>
  );
}
