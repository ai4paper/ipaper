#!/usr/bin/env bash

set -euo pipefail

PACKAGE_NAME="@ai4paper/ipaper"
PACKAGE_VERSION="${IPAPER_VERSION:-latest}"
PACKAGE_SPEC="${PACKAGE_NAME}@${PACKAGE_VERSION}"

info() {
  printf '==> %s\n' "$1"
}

fail() {
  printf 'Error: %s\n' "$1" >&2
  exit 1
}

command_exists() {
  command -v "$1" >/dev/null 2>&1
}

check_node() {
  command_exists node || fail "Node.js 20+ is required. Install Node.js, then run this installer again."

  local major
  major="$(node -p "Number(process.versions.node.split('.')[0])")"
  if [ "$major" -lt 20 ]; then
    fail "Node.js 20+ is required. Found $(node -v)."
  fi
}

install_package() {
  if command_exists bun; then
    info "Installing ${PACKAGE_SPEC} with bun"
    bun add -g "$PACKAGE_SPEC"
    return
  fi

  if command_exists npm; then
    info "Installing ${PACKAGE_SPEC} with npm"
    npm install -g "$PACKAGE_SPEC"
    return
  fi

  if command_exists pnpm; then
    info "Installing ${PACKAGE_SPEC} with pnpm"
    pnpm add -g "$PACKAGE_SPEC"
    return
  fi

  if command_exists yarn; then
    info "Installing ${PACKAGE_SPEC} with yarn"
    yarn global add "$PACKAGE_SPEC"
    return
  fi

  fail "No supported package manager found. Install bun, npm, pnpm, or yarn, then run this installer again."
}

main() {
  check_node
  install_package

  if ! command_exists ipaper; then
    fail "Installed ${PACKAGE_NAME}, but the ipaper command is not on PATH. Check your package manager's global bin directory."
  fi

  info "IPaper installed successfully"
  ipaper --version || true
  printf '\nRun ipaper to start the server.\n'
}

main "$@"
