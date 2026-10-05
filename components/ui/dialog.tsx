'use client'

import type React from 'react'
import * as Primitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import styles from './dialog.module.css'

export const Dialog = Primitive.Root
export const DialogTitle = Primitive.Title
export const DialogDescription = Primitive.Description
export function DialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('flex flex-col gap-2 pr-6', className)} {...props} />
}
export function DialogContent({ children, className, closeLabel = 'Fechar parâmetros musicais', mobileViewportScroll = false, ...props }: React.ComponentProps<typeof Primitive.Content> & { closeLabel?: string; mobileViewportScroll?: boolean }) {
  const content = <Primitive.Content className={cn('fixed z-[130] grid w-[calc(100%-2rem)] max-w-lg gap-5 rounded-lg border p-6 shadow-lg', mobileViewportScroll ? 'sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2' : 'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2', mobileViewportScroll && styles.mobileContent, className)} {...props}>
      {children}
      <Primitive.Close className="absolute right-3 top-3 rounded p-1 text-white/70 hover:text-white focus-visible:outline-2" aria-label={closeLabel}><X className="h-4 w-4" /></Primitive.Close>
    </Primitive.Content>

  // Radix forwards DOM refs to each portal child; a Fragment ref is not an Element.
  return <Primitive.Portal>
    <Primitive.Overlay className={cn('fixed inset-0 z-[120] bg-black/75', mobileViewportScroll && styles.mobileViewport)}>
      {mobileViewportScroll ? content : null}
    </Primitive.Overlay>
    {mobileViewportScroll ? null : content}
  </Primitive.Portal>
}
