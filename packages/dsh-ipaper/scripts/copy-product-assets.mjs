import { cp, mkdir, rm } from 'node:fs/promises'

// Only product-owned metadata ships here; upstream Web serves its own shell.
const destination = new URL('../lib/web/', import.meta.url)
const productBrand = new URL('../web-brand/', import.meta.url)
await rm(destination, { recursive: true, force: true })
await mkdir(destination, { recursive: true })
for (const asset of ['manifest.webmanifest', 'favicon.svg']) {
  await cp(new URL(asset, productBrand), new URL(asset, destination))
}
