function findPaperTab(): HTMLButtonElement | undefined {
  const candidates = document.querySelectorAll<HTMLButtonElement>('button[role="tab"]')
  return [...candidates].find(button => button.getAttribute('aria-label') === 'Paper status')
}

/** Toggle the current session between Chat and the hidden Paper-status view tab. */
export function togglePaperStatusView(): boolean {
  const paper = findPaperTab()
  if (paper === undefined) return false
  if (paper.getAttribute('aria-selected') === 'true') {
    const tablist = paper.closest('[role="tablist"]')
    const chat = tablist?.querySelector<HTMLButtonElement>('button[role="tab"]')
    chat?.click()
    return false
  }
  paper.click()
  return true
}
