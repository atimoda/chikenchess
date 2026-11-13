"use client"

// The Quadro de lousa's art: a green school chalkboard in a wooden frame with a chalk tray, its text written in white
// chalk (Cabin Sketch, a crumbly crayon-like hand) and fitted to the board (lib/pigchicken/chalkboard.ts).
import { memo } from "react"
import { Cabin_Sketch } from "next/font/google"
import { chalkFit, type ChalkboardParams } from "@/lib/pigchicken/chalkboard"

const chalkFont = Cabin_Sketch({ subsets: ["latin"], weight: ["400", "700"], display: "swap" })

export const ChalkboardArt = memo(function ChalkboardArt({ board, w, h }: { board: ChalkboardParams; w: number; h: number }) {
  const { lines, size } = chalkFit(board.text, w, h)
  return (
    <div className="absolute inset-0 rounded-[6px] p-[10px] shadow-[0_8px_18px_rgba(0,0,0,0.35)]" style={{ background: "linear-gradient(135deg,#9a6a3a,#6e4521 60%,#5a3618)" }}>
      <div
        className="relative h-full w-full overflow-hidden rounded-[3px]"
        style={{ background: "radial-gradient(ellipse at 30% 25%,rgba(255,255,255,0.09),transparent 60%),radial-gradient(ellipse at 75% 80%,rgba(255,255,255,0.05),transparent 55%),#2f5b3f", boxShadow: "inset 0 0 22px rgba(0,0,0,0.45)" }}
      >
        <div
          className={`${chalkFont.className} absolute inset-0 flex flex-col justify-center whitespace-pre px-[12px] py-[10px] text-center`}
          style={{ fontSize: size, lineHeight: 1.18, color: "rgba(248,250,246,0.92)", textShadow: "0 0 1px rgba(255,255,255,0.55),0 0 6px rgba(255,255,255,0.12)" }}
        >
          {lines.map((line, i) => <div key={i} style={i === 0 && lines.length > 1 ? { fontWeight: 700 } : undefined}>{line || " "}</div>)}
        </div>
      </div>
      {/* the chalk tray, with a stick of chalk */}
      <div className="absolute inset-x-[6%] bottom-[-6px] h-[8px] rounded-[2px] bg-[#5a3618] shadow-[0_3px_4px_rgba(0,0,0,0.35)]">
        <div className="absolute bottom-[5px] right-[18%] h-[5px] w-[22px] rounded-[2px] bg-[#f4f1e6]" />
      </div>
    </div>
  )
})
