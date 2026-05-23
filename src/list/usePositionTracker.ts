import { useRef, useCallback } from "react"
import type { PositionMap } from "./types"

export function usePositionTracker(containerRef: React.RefObject<HTMLElement | null>) {
  const posRef = useRef<PositionMap>(new Map())

  const snapshot = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    const map: PositionMap = new Map()
    const containerRect = el.getBoundingClientRect()
    for (const child of el.children) {
      const key = (child as HTMLElement).getAttribute("data-trigr-key")
      if (!key) continue
      const rect = (child as HTMLElement).getBoundingClientRect()
      map.set(key, {
        top: rect.top - containerRect.top - el.clientTop,
        left: rect.left - containerRect.left - el.clientLeft,
        width: rect.width,
        height: rect.height,
      })
    }
    posRef.current = map
  }, [containerRef])

  const getPositions = useCallback((): PositionMap => {
    return new Map(posRef.current)
  }, [])

  return { snapshot, getPositions }
}
