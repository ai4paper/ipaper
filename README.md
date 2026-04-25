# IPaper

Run [OpenCode](https://opencode.ai) in your browser. Install the CLI, open `localhost:3000`, done. Works on desktop browsers, tablets, and phones as a PWA.

This repository is the IPaper monorepo. The published CLI and web package lives in `packages/web` as [`@ai4paper/ipaper`](https://www.npmjs.com/package/@ai4paper/ipaper).

Full project overview, screenshots, and all features: [github.com/ai4paper/ipaper](https://github.com/ai4paper/ipaper)

## Install

```bash
curl -fsSL https://raw.githubusercontent.com/ai4paper/ipaper/main/scripts/install.sh | bash
```

Or install manually: `bun add -g @ai4paper/ipaper` (or npm, pnpm, yarn).

> **Prerequisites:** [OpenCode CLI](https://opencode.ai) installed, Node.js 20+.

## Usage

```bash
ipaper                          # Start on port 3000
ipaper --port 8080              # Custom port
ipaper --ui-password secret     # Password-protect UI
ipaper logs                     # Follow latest instance logs
OPENCODE_PORT=4096 OPENCODE_SKIP_START=true ipaper                    # Connect to external OpenCode server
OPENCODE_HOST=https://myhost:4096 OPENCODE_SKIP_START=true ipaper     # Connect via custom host/HTTPS
ipaper stop                     # Stop server
ipaper update                   # Update to latest version
```

<details>
<summary>Connect to external OpenCode server</summary>

```bash
OPENCODE_PORT=4096 OPENCODE_SKIP_START=true ipaper
OPENCODE_HOST=https://myhost:4096 OPENCODE_SKIP_START=true ipaper
```

| Variable | Description |
|----------|-------------|
| `OPENCODE_HOST` | Full base URL of external server (overrides `OPENCODE_PORT`) |
| `OPENCODE_PORT` | Port of external server |
| `OPENCODE_SKIP_START` | Skip starting embedded OpenCode server |
| `IPAPER_OPENCODE_HOSTNAME` | Bind hostname for managed OpenCode server (default: `127.0.0.1`, use `0.0.0.0` for LAN/remote access; trusted networks only) |

</details>

<details>
<summary>Bind managed OpenCode to LAN / Tailscale</summary>

```bash
IPAPER_OPENCODE_HOSTNAME=0.0.0.0 ipaper --port 3000
```

**Security note:** binding to `0.0.0.0` exposes the server on all network interfaces. Use only on trusted networks and protect it with firewall rules or `--ui-password`.

</details>

<details>
<summary>Background & daemon mode</summary>

```bash
ipaper             # Runs in background by default
ipaper stop        # Stop background server
```

</details>

<details>
<summary>systemd service (VPN / LAN access)</summary>

Use `--foreground` to keep the CLI process alive so systemd (or another process manager) can track and restart it. Combine with `OPENCODE_HOST` to connect to an OpenCode instance running as a separate service.

**`~/.config/systemd/user/opencode.service`**
```ini
[Unit]
Description=OpenCode Server

[Service]
Type=simple
ExecStart=opencode serve --port 4095
Environment="PATH=/home/linuxbrew/.linuxbrew/bin:/home/linuxbrew/.linuxbrew/sbin:/home/YOU/.local/bin:/home/YOU/.npm-global/bin:/usr/local/bin:/usr/bin:/bin"
Environment=SSH_AUTH_SOCK=%t/ssh-agent.socket
Restart=on-failure
RestartSec=5

[Install]
WantedBy=default.target
```

> **Why set `PATH` and `SSH_AUTH_SOCK`?**
> systemd user services start with a minimal environment and do not source your shell profile.
> Without an explicit `PATH`, OpenCode may not find tools installed via Homebrew, npm, or `~/.local/bin`.
> Without `SSH_AUTH_SOCK`, git operations over SSH can fail.
> `%t` expands to `$XDG_RUNTIME_DIR` (for example `/run/user/1000`), where most SSH agents write their socket.

**`~/.config/systemd/user/ipaper.service`**
```ini
[Unit]
Description=IPaper Web Server
After=opencode.service

[Service]
Type=simple
ExecStart=ipaper serve --port 3000 --host 0.0.0.0 --ui-password your-password --foreground
Environment="OPENCODE_HOST=http://localhost:4095"
Environment="OPENCODE_SKIP_START=true"
Restart=on-failure
RestartSec=5

[Install]
WantedBy=default.target
```

```bash
systemctl --user daemon-reload
systemctl --user enable --now opencode ipaper
```

`--host 0.0.0.0` is required to listen on all interfaces (the default is `127.0.0.1`). Use `--host <ip>` or `IPAPER_HOST=<ip>` to bind to a specific interface instead.

</details>

## Local Development

Install workspace dependencies:

```bash
bun install
```

Common monorepo commands from the repository root:

```bash
bun run dev           # Full local dev flow
bun run dev:all       # Server, web build watcher, and shared UI watcher
bun run build         # Build all workspaces
bun run type-check    # Type-check all workspaces
bun run lint          # Lint all workspaces
```

Workspace layout:

- `packages/web`: published `@ai4paper/ipaper` CLI and web runtime
- `packages/ui`: shared UI/runtime package used by the web app

## What makes the web version special

- **Mobile-first PWA**: optimized chat controls, keyboard-safe layouts, drag-to-reorder projects.
- **Background notifications**: know when your agent finishes, even from another tab.
- **Self-update**: update and restart from the UI while keeping server settings intact.
- **Cross-tab tracking**: session activity stays in sync across browser tabs.

## License

MIT
