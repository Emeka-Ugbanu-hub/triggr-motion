import { useRef, useEffect } from "react"
import type { ListDiff } from "./types"

export function useListDiff(keys: (string | number)[]): ListDiff {
  const prevKeysRef = useRef<(string | number)[]>([])
  const prev = prevKeysRef.current

  const prevSet = new Set(prev)
  const currSet = new Set(keys)

  const added = keys.filter((k) => !prevSet.has(k))
  const removed = prev.filter((k) => !currSet.has(k))
  const stable: (string | number)[] = []
  const reordered: (string | number)[] = []

  const prevIndexMap = new Map(prev.map((k, i) => [k, i]))
  keys.forEach((k, i) => {
    if (prevSet.has(k) && currSet.has(k)) {
      if (prevIndexMap.get(k) !== i) reordered.push(k)
      else stable.push(k)
    }
  })

  useEffect(() => {
    prevKeysRef.current = keys
  })

  return { added, removed, reordered, stable }
}
