# SolidStart

Everything you need to build a Solid project, powered by [`solid-start`](https://start.solidjs.com).

## Creating a project

```bash
# create a new project in the current directory
bun create solid@latest

# create a new project in my-app
bun create solid@latest my-app
```

## Installing dependencies

```bash
bun install
```

## Developing

Start a development server with:

```bash
bun run dev

# or start the server and open the app in a new browser tab
bun run dev --open
```

## Building

Solid apps are built with _presets_, which optimize your project for deployment to different environments.

By default, `bun run build` will generate a Node app that you can run with `bun run start`. To use a different preset, add it to the `devDependencies` in `package.json` and specify it in your `app.config.js`.

## This project was created with the [Solid CLI](https://github.com/solidjs-community/solid-cli)
