type Listener = (message: unknown) => void;
type StatusListener = (connected: boolean) => void;

class WSClient {
  private socket: WebSocket | null = null;
  private listeners = new Set<Listener>();
  private statusListeners = new Set<StatusListener>();
  private connected = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private outbox: string[] = [];

  private url(): string {
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${proto}//${window.location.host}/ws`;
  }

  private setConnected(value: boolean) {
    if (this.connected === value) return;
    this.connected = value;
    for (const fn of this.statusListeners) fn(value);
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    const delay = Math.min(15000, 500 * 2 ** this.reconnectAttempts);
    this.reconnectAttempts += 1;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  private connect() {
    if (
      this.socket &&
      (this.socket.readyState === WebSocket.OPEN ||
        this.socket.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    const ws = new WebSocket(this.url());
    this.socket = ws;

    ws.addEventListener("open", () => {
      this.reconnectAttempts = 0;
      this.setConnected(true);
      const queued = this.outbox;
      this.outbox = [];
      for (const m of queued) ws.send(m);
    });

    ws.addEventListener("message", (e) => {
      try {
        const data = JSON.parse(typeof e.data === "string" ? e.data : "");
        for (const fn of this.listeners) fn(data);
      } catch {
        // ignore malformed
      }
    });

    ws.addEventListener("close", () => {
      this.setConnected(false);
      this.socket = null;
      this.scheduleReconnect();
    });

    ws.addEventListener("error", () => {
      try {
        ws.close();
      } catch {
        // ignore
      }
    });
  }

  ensure() {
    this.connect();
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    this.connect();
    return () => {
      this.listeners.delete(listener);
    };
  }

  subscribeStatus(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    listener(this.connected);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  send(message: unknown): void {
    const text = JSON.stringify(message);
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(text);
    } else {
      this.outbox.push(text);
      this.connect();
    }
  }

  isConnected(): boolean {
    return this.connected;
  }
}

export const wsClient = new WSClient();
