'use client'

import { useEffect, useState } from 'react'

/**
 * Returns a periodically-updated timestamp. Reading the clock happens inside
 * an effect (subscription to an external system), keeping render pure so the
 * React Compiler / purity lint rules are satisfied.
 */
export function useNow(intervalMs = 30_000): number {
  // Lazy initializer runs once; updates flow through the interval callback.
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])

  return now
}
