# Changelog

All notable changes to this project will be documented in this file.

## [0.1.2]

- Web: Added npm package repository metadata so provenance-backed publishes validate against the GitHub repo. (@isomoes) 3c4f3a31

## [0.1.1]

- Chat: Fixed draft restore stealing editor focus when returning to a conversation. (@isomoes) 895bd7e1
- Chat: Kept manual scroll override active until the feed is returned to the bottom. (@isomoes) 4153c194
- Sidebar: Restored hover actions without blocking tree control interactions. (@isomoes) 802cdfe4
- Web: Added package publish workflow and release cleanup for distribution. (@isomoes) e4a25915
- UI: Added the GitHub Dark Colorblind theme. (@isomoes) abc602aa

## [0.1.0]

- Chat: Fixed bottom-follow cancellation for extension-driven scrolling so Surfingkeys-style `j`/`k`/`u`/`d` navigation can reliably break pin-to-bottom behavior. (@isomoes) 46af5931
- Initial IPaper monorepo setup for the web and UI runtimes. (@isomoes) 2ab0538e
