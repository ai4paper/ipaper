import { Title } from "@solidjs/meta";
import AgentApp from "~/components/agent/AgentApp";

export default function Home() {
  return (
    <main class="app-shell">
      <Title>iPaper Web Agent</Title>
      <AgentApp />
    </main>
  );
}
