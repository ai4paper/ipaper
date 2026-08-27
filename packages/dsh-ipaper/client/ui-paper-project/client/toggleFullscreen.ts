export async function toggleFullscreen(element: HTMLElement): Promise<void> {
  if (document.fullscreenElement === element) {
    await document.exitFullscreen()
    return
  }
  await element.requestFullscreen()
}
