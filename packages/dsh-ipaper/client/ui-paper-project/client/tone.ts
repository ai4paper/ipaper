export function tone(status: string): 'attention' | 'good' | undefined {
  if (['blocked', 'contested', 'unverified', 'open'].includes(status)) return 'attention'
  if (['accepted', 'done', 'verified', 'supported', 'ready', 'resolved', 'satisfied'].includes(status)) return 'good'
  return undefined
}
