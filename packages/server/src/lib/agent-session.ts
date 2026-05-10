import {
  query,
  type SDKMessage,
  type SDKUserMessage,
} from "@anthropic-ai/claude-agent-sdk";

const SYSTEM_PROMPT = `You are IPaper, an AI research and writing assistant.
You help users explore literature, draft and edit academic papers, and answer
technical questions. Be concise, accurate, and cite sources when helpful.`;

type UserMessage = SDKUserMessage;

class MessageQueue {
  private messages: UserMessage[] = [];
  private waiting: ((msg: UserMessage) => void) | null = null;
  private closed = false;

  push(content: string) {
    const msg: UserMessage = {
      type: "user",
      message: { role: "user", content },
      parent_tool_use_id: null,
    };
    if (this.waiting) {
      this.waiting(msg);
      this.waiting = null;
    } else {
      this.messages.push(msg);
    }
  }

  async *[Symbol.asyncIterator](): AsyncIterableIterator<UserMessage> {
    while (!this.closed) {
      if (this.messages.length > 0) {
        yield this.messages.shift()!;
      } else {
        yield await new Promise<UserMessage>((resolve) => {
          this.waiting = resolve;
        });
      }
    }
  }

  close() {
    this.closed = true;
  }
}

export interface AgentSessionOptions {
  claudePath?: string;
}

export class AgentSession {
  private queue = new MessageQueue();
  private outputIterator: AsyncIterator<SDKMessage>;

  constructor(opts: AgentSessionOptions = {}) {
    this.outputIterator = query({
      prompt: this.queue as AsyncIterable<UserMessage>,
      options: {
        maxTurns: 100,
        model: "sonnet",
        allowedTools: ["Read", "Grep", "Glob", "WebSearch", "WebFetch"],
        systemPrompt: SYSTEM_PROMPT,
        ...(opts.claudePath
          ? { pathToClaudeCodeExecutable: opts.claudePath }
          : {}),
      },
    })[Symbol.asyncIterator]();
  }

  sendMessage(content: string) {
    this.queue.push(content);
  }

  async *getOutputStream(): AsyncGenerator<SDKMessage> {
    while (true) {
      const { value, done } = await this.outputIterator.next();
      if (done) break;
      yield value;
    }
  }

  close() {
    this.queue.close();
  }
}
