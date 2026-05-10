import { useState } from "react";
import { ChevronDown, ChevronRight, Wrench } from "lucide-react";
import type { ToolUse } from "@/lib/types";

function summarize(tool: ToolUse): string {
  const input = tool.toolInput ?? {};
  const get = (k: string) => {
    const v = input[k];
    return typeof v === "string" ? v : undefined;
  };
  switch (tool.toolName) {
    case "Read":
    case "Write":
    case "Edit":
      return get("file_path") ?? "";
    case "Bash": {
      const cmd = get("command") ?? "";
      return cmd.length > 80 ? cmd.slice(0, 80) + "…" : cmd;
    }
    case "Grep":
      return `"${get("pattern") ?? ""}" in ${get("path") ?? "."}`;
    case "Glob":
      return get("pattern") ?? "";
    case "WebSearch":
      return get("query") ?? "";
    case "WebFetch":
      return get("url") ?? "";
    default: {
      const json = JSON.stringify(input);
      return json.length > 80 ? json.slice(0, 80) + "…" : json;
    }
  }
}

export function ToolUseBlock({ tool }: { tool: ToolUse }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="ml-10 max-w-[85%] overflow-hidden rounded-lg border border-border/50 bg-card/40 text-xs">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-2.5 py-1.5 text-left transition-colors hover:bg-muted/40"
      >
        <span className="flex min-w-0 items-center gap-2">
          <Wrench className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="font-mono text-[11px] font-semibold uppercase tracking-wide text-foreground/80">
            {tool.toolName}
          </span>
          <span className="truncate text-muted-foreground">
            {summarize(tool)}
          </span>
        </span>
        {open ? (
          <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
        )}
      </button>
      {open && (
        <pre className="border-t border-border/50 bg-background/60 p-2 font-mono text-[11px] leading-relaxed whitespace-pre-wrap">
          {JSON.stringify(tool.toolInput, null, 2)}
        </pre>
      )}
    </div>
  );
}
