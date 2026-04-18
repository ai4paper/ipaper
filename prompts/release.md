# Release Prompt

Use this flow for a normal release:

1. Update `CHANGELOG.md` with a new top section for the target version.
2. Run `node scripts/bump-version.mjs <version>`.
3. Verify the workspace version updates in:
   `package.json`, `packages/ui/package.json`, and `packages/web/package.json`
4. Verify the release build:
   `bun run build:web`
5. Stage the release files.
6. Commit with:
   `git commit -m "release v<version>"`
7. Push the branch:
   `git push origin main`
8. Create the release tag:
   `git tag v<version>`
9. Push the tag:
   `git push origin v<version>`
