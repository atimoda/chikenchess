'use client'
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import styles from './info-tip.module.css'

/** Portalled so help never gets clipped by a scrolling Creative column. */
export function InfoTip({label,children}:{label:string;children:ReactNode}){
 const id=useId(),button=useRef<HTMLButtonElement>(null),panel=useRef<HTMLDivElement>(null)
 const [open,setOpen]=useState(false),[position,setPosition]=useState({left:8,top:8})
 const pinned=useRef(false),timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined)
 const clear=()=>{if(timer.current)clearTimeout(timer.current)}
 const close=()=>{clear();pinned.current=false;setOpen(false)}
 const show=()=>{clear();setOpen(true)}
 const leave=()=>{if(!pinned.current)timer.current=setTimeout(()=>setOpen(false),160)}
 useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current)},[])
 useEffect(()=>{
  if(!open)return
  const place=()=>{const r=button.current?.getBoundingClientRect(),p=panel.current?.getBoundingClientRect();if(!r||!p)return;const width=window.innerWidth,height=window.innerHeight;setPosition({left:Math.max(8,Math.min(width-p.width-8,r.right-p.width)),top:Math.max(8,Math.min(height-p.height-8,r.bottom+8+p.height<=height-8?r.bottom+8:r.top-p.height-8))})}
  const outside=(e:globalThis.Event)=>{if(!button.current?.contains(e.target as Node)&&!panel.current?.contains(e.target as Node))close()}
  const escape=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.preventDefault();close()}}
  place();window.addEventListener('resize',place);window.addEventListener('scroll',place,true);document.addEventListener('pointerdown',outside,true);document.addEventListener('keydown',escape)
  return()=>{window.removeEventListener('resize',place);window.removeEventListener('scroll',place,true);document.removeEventListener('pointerdown',outside,true);document.removeEventListener('keydown',escape)}
 },[open])
 return <span data-info-tip className={styles.anchor}>
  <button ref={button} type="button" className={styles.trigger} aria-label={`Ajuda: ${label}`} aria-expanded={open} aria-controls={open?id:undefined} aria-describedby={open?id:undefined}
   onPointerEnter={e=>{if(e.pointerType==='mouse')show()}} onPointerLeave={leave}
   onFocus={e=>{if(e.currentTarget.matches(':focus-visible'))show()}}
   onBlur={e=>{if(!panel.current?.contains(e.relatedTarget as Node))close()}}
   onPointerDown={e=>e.stopPropagation()} onClick={e=>{e.preventDefault();e.stopPropagation();if(pinned.current)close();else{pinned.current=true;show()}}}>?</button>
  {open&&createPortal(<div ref={panel} id={id} role="tooltip" className={styles.tip} style={position} onPointerEnter={clear} onPointerLeave={leave} onPointerDown={e=>e.stopPropagation()} onClick={e=>e.stopPropagation()}><strong>{label}</strong><div>{children}</div></div>,document.body)}
 </span>
}
export function HelpLabel({label,children}:{label:string;children:ReactNode}){return <span className={styles.label}><span>{label}</span><InfoTip label={label}>{children}</InfoTip></span>}
