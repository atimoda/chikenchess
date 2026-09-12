'use client'

import type React from 'react'
import * as Primitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

export const Dialog = Primitive.Root
export const DialogTitle = Primitive.Title
export const DialogDescription = Primitive.Description
export function DialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('flex flex-col gap-2 pr-6', className)} {...props} />
}
export function DialogContent({ children, className, ...props }: React.ComponentProps<typeof Primitive.Content>) {
  return <Primitive.Portal>
    <Primitive.Overlay className="fixed inset-0 z-[120] bg-black/75" />
    <Primitive.Content className={cn('fixed left-1/2 top-1/2 z-[130] grid w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 gap-5 rounded-lg border p-6 shadow-lg', className)} {...props}>
      {children}
      <Primitive.Close className="absolute right-3 top-3 rounded p-1 text-white/70 hover:text-white focus-visible:outline-2" aria-label="Fechar parâmetros musicais"><X className="h-4 w-4" /></Primitive.Close>
    </Primitive.Content>
  </Primitive.Portal>
}
