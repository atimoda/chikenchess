"use client"

import { useEffect } from 'react'

// One-screen worlds keep the document still, including Safari's rubber-band gesture.
// A panel/list can consume a swipe only while it has room in that direction.
export function useGamePageScrollLock() {
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px), (pointer: coarse)')
    let unlock: (() => void) | undefined
    const apply = () => {
      unlock?.()
      unlock = undefined
      if (!mq.matches) return
      const html = document.documentElement, body = document.body
      const properties = ['overflow', 'overscroll-behavior', 'position', 'inset', 'width'] as const
      const saved = [html, body].map(el => properties.map(p => [p, el.style.getPropertyValue(p), el.style.getPropertyPriority(p)]))
      const previousLock = html.getAttribute('data-game-page-locked')
      html.setAttribute('data-game-page-locked', '')
      const { scrollX, scrollY } = window
      html.style.overflow = 'hidden'
      html.style.overscrollBehavior = 'none'
      body.style.overflow = 'hidden'
      body.style.overscrollBehavior = 'none'
      body.style.position = 'fixed'
      body.style.inset = '0'
      body.style.width = '100%'
      let point: { x: number; y: number } | null = null
      const start = (e: TouchEvent) => {
        const t = e.touches[0]
        point = t ? { x: t.clientX, y: t.clientY } : null
      }
      const move = (e: TouchEvent) => {
        const t = e.touches[0], prev = point
        point = t ? { x: t.clientX, y: t.clientY } : null
        if (!t || !prev) return
        const dx = prev.x - t.clientX, dy = prev.y - t.clientY
        const horizontal = Math.abs(dx) > Math.abs(dy), delta = horizontal ? dx : dy
        let el = e.target instanceof Element ? e.target : null
        // Native range controls need their own drag gesture, with no page pan.
        if (el?.closest('input[type="range"]')) return
        while (el && el !== body && el !== html) {
          const css = window.getComputedStyle(el)
          const overflow = horizontal ? css.overflowX : css.overflowY
          const position = horizontal ? el.scrollLeft : el.scrollTop
          const max = horizontal ? el.scrollWidth - el.clientWidth : el.scrollHeight - el.clientHeight
          if (/auto|scroll/.test(overflow) && max > 0 && (delta < 0 ? position > 0 : delta > 0 && position < max - 1)) return
          el = el.parentElement
        }
        if (e.cancelable) e.preventDefault()
      }
      document.addEventListener('touchstart', start, { passive: true })
      document.addEventListener('touchmove', move, { passive: false })
      unlock = () => {
        document.removeEventListener('touchstart', start)
        document.removeEventListener('touchmove', move)
        ;[html, body].forEach((el, i) => saved[i].forEach(([p, value, priority]) => {
          if (value) el.style.setProperty(p, value, priority)
          else el.style.removeProperty(p)
        }))
        if (previousLock === null) html.removeAttribute('data-game-page-locked')
        else html.setAttribute('data-game-page-locked', previousLock)
        window.scrollTo(scrollX, scrollY)
      }
    }
    apply()
    mq.addEventListener('change', apply)
    return () => { mq.removeEventListener('change', apply); unlock?.() }
  }, [])
}
