/** Two-character code for a store without a logo: initials of the first two words, or the first two letters. */
export function storeCode(name: string): string {
  const words = name
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)
  if (words.length === 0) return '?'
  if (words.length === 1) return Array.from(words[0]).slice(0, 2).join('').toUpperCase()
  return (Array.from(words[0])[0] + Array.from(words[1])[0]).toUpperCase()
}

/** Short, readable order reference. */
export function orderRef(orderId: string): string {
  return orderId.replace(/-/g, '').slice(0, 6).toUpperCase()
}
