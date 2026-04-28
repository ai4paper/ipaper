# Changelog

All notable changes to this project will be documented in this file.

## [0.1.5]

- Session: Fixed session directory handling after restart. (@isomoes) 47915d99

## [0.1.4]

- UI: Removed voice features. (@isomoes) b37822b1
- Web: Removed the remote tunnel feature. (@isomoes) 5fa4b99c
- Docs: Added the MIT license. (@isomoes) 44d3e5dc
- Docs: Added a monorepo root README. (@isomoes) 616ee456

## [0.1.3]

- Chat: Added support for mentioning folders directly in chat prompts. (@isomoes) 45430f06
- Sidebar: Kept session controls visible without requiring hover. (@isomoes) 1a8be247
- Security: Stopped sending usage data during update checks. (@isomoes) b9e2f139
- UI: Restored keyboard navigation looping in dropdown menus. (@isomoes) a105c257
- Tooling: Added a `bun run stop` command for detached web dev processes. (@isomoes) ef120e16

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
