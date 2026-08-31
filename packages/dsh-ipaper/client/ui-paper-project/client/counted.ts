export function counted(count: number, singular: string): string {
  return `${count} ${singular}${count === 1 ? '' : 's'}`
}
