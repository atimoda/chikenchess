/** Remaining match eggs form a single pot. Black receives the odd egg on a draw. */
export function matchEggPayout(eggs: { w: number; b: number }, winner: 'w' | 'b' | null) {
  const total = eggs.w + eggs.b
  return winner === 'w' ? { w: total, b: 0 }
    : winner === 'b' ? { w: 0, b: total }
      : { w: Math.floor(total / 2), b: Math.ceil(total / 2) }
}

/** Attribute each recipient's share to the two counters without inventing eggs. */
export function matchEggSources(eggs: { w: number; b: number }, winner: 'w' | 'b' | null, recipient: 'w' | 'b') {
  if (winner) return winner === recipient ? { ...eggs } : { w: 0, b: 0 }
  const blackPayout = matchEggPayout(eggs, null).b
  const blackFromBlack = Math.min(Math.ceil(eggs.b / 2), blackPayout)
  const blackFromWhite = blackPayout - blackFromBlack
  const whiteFromWhite = eggs.w - blackFromWhite
  const whiteFromBlack = eggs.b - blackFromBlack
  return recipient === 'w' ? { w: whiteFromWhite, b: whiteFromBlack }
    : { w: blackFromWhite, b: blackFromBlack }
}

export function basketVisualEggCount(balance: number) {
  const eggs = Math.max(0, Math.floor(balance))
  return Math.min(20, eggs <= 10 ? eggs : 10 + Math.floor(eggs / 100))
}
