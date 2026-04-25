# @ai4paper/ipaper

Run [OpenCode](https://opencode.ai) in your browser. Install the CLI, open `localhost:3000`, done. Works on desktop browsers, tablets, and phones as a PWA.

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
OPENCODE_HOST=https://myhost:4096 OPENCODE_SKIP_START=true ipaper  # Connect via custom host/HTTPS
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
| `IPAPER_OPENCODE_HOSTNAME` | Bind hostname for managed OpenCode server (default: `127.0.0.1`, use `0.0.0.0` for LAN/remote access — trusted networks only) |

</details>

<details>
<summary>Bind managed OpenCode to LAN / Tailscale</summary>

```bash
IPAPER_OPENCODE_HOSTNAME=0.0.0.0 ipaper --port 3000
```

**Security note:** binding to `0.0.0.0` exposes the server on all network interfaces — use only on trusted networks and protect with firewall rules or `--ui-password`.

</details>

**Optional env vars:**
```yaml
environment:
  UI_PASSWORD: your_secure_password
  IPAPER_TUNNEL_MODE: quick # quick | managed-remote | managed-local
  IPAPER_TUNNEL_PROVIDER: cloudflare
```

For `managed-remote` mode, also set:

```yaml
environment:
  IPAPER_TUNNEL_MODE: managed-remote
  IPAPER_TUNNEL_HOSTNAME: app.example.com
  IPAPER_TUNNEL_TOKEN: <token>
```

For `managed-local` mode, you can set:

```yaml
environment:
  IPAPER_TUNNEL_MODE: managed-local
  IPAPER_TUNNEL_CONFIG: /home/ipaper/.cloudflared/config.yml
```

Managed-local path note: `IPAPER_TUNNEL_CONFIG` must use a container path under `/home/ipaper/...`. If the config file references `credentials-file`, ensure that JSON path is also mounted and reachable inside the container.

**Data directory:** mount `data/` for persistent storage. Ensure permissions:
```bash
mkdir -p data/ipaper data/opencode/share data/opencode/config data/ssh
chown -R 1000:1000 data/
```

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

Use `--foreground` to keep the CLI process alive so systemd (or any other process manager) can track and restart it. Combine with `OPENCODE_HOST` to connect to an OpenCode instance running as a separate service.

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
> systemd user services start with a minimal environment — no shell profile is sourced.
> Without an explicit `PATH`, OpenCode won't find tools installed via Homebrew, npm, or `~/.local/bin`.
> Without `SSH_AUTH_SOCK`, git operations over SSH (push, pull, clone) will fail.
> `%t` expands to `$XDG_RUNTIME_DIR` (e.g. `/run/user/1000`), where most SSH agents write their socket.

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

## What makes the web version special

- **Mobile-first PWA** - optimized chat controls, keyboard-safe layouts, drag-to-reorder projects
- **Background notifications** - know when your agent finishes, even from another tab
- **Self-update** - update and restart from the UI, server settings stay intact
- **Cross-tab tracking** - session activity stays in sync across browser tabs

- Mobile-first experience: optimized chat controls, keyboard-safe layouts, and attachment-friendly UI
- Background notifications plus reliable cross-tab session activity tracking
- Built-in self-update + restart flow that keeps your server settings intact

## License

MIT
