"use client"

// The end of a round of the Grade de blocos (lib/pigchicken/mine-round.ts): what each local player did and the
// round's titles. "Dispensar" closes it for this browser, and the Pátio goes on with the grid as it ended; whoever
// may start the grid again also has "Resetar grade" here.
import { useSyncExternalStore } from "react"
import { RotateCcw } from "lucide-react"
import { MINE_TITLES, mineTitles, type MineStats } from "@/lib/pigchicken/mine-round"
import { dismissMineEnd, mineStore } from "@/lib/pigchicken/mine-grid-store"

const COLUMNS: { key: keyof MineStats; label: string; hint: string }[] = [
  { key: "music", label: "Música", hint: "Notas que encheram a barra azul ou a amarela" },
  { key: "damage", label: "Dano", hint: "Dano de tiros que encheu a barra vermelha" },
  { key: "opened", label: "Abertos", hint: "Blocos abertos" },
  { key: "flags", label: "Bandeiras", hint: "Bandeiras hasteadas" },
  { key: "flagsOnBomb", label: "Em bomba", hint: "Bandeiras hasteadas em cima de uma bomba" },
  { key: "doubts", label: "Dúvidas", hint: "Dúvidas levantadas" },
  { key: "solved", label: "Sanadas", hint: "Dúvidas sanadas, com a bandeira de novo ou abrindo o bloco" },
  { key: "disarmed", label: "Desarmes", hint: "Bombas desarmadas" },
  { key: "installed", label: "Instaladas", hint: "Bombas instaladas" },
  { key: "kills", label: "Mortes", hint: "Mortes pelas bombas que instalou ou detonou" },
  { key: "deaths", label: "Kids", hint: "Vezes que virou kid" },
]

export function MineRoundEnd({ players, onReset }: { players: { id: string; name: string; color: string }[]; onReset?: () => void }) {
  useSyncExternalStore(mineStore.subscribe, mineStore.version, () => 0)
  const round = mineStore.round
  if (!round?.over || mineStore.dismissed) return null
  const titles = mineTitles(round.stats)
  return (
    <div role="dialog" aria-label="Fim da rodada" className="pointer-events-auto fixed left-1/2 top-1/2 z-[400] max-h-[86vh] w-[min(96vw,1120px)] -translate-x-1/2 -translate-y-1/2 overflow-auto rounded-xl border border-white/15 bg-[#0f1713]/95 p-4 font-mono text-sm text-[#e8f0ea] shadow-2xl">
      <table className="w-full border-separate border-spacing-y-1 text-right">
        <thead>
          <tr className="text-xs text-white/60">
            <th className="text-left font-normal">Fim da rodada</th>
            {COLUMNS.map(c => <th key={c.key} title={c.hint} className="px-1.5 font-normal">{c.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {players.map(pl => {
            const s = round.stats[pl.id]
            return (
              <tr key={pl.id} className="bg-[#22302a]">
                <td className="whitespace-nowrap rounded-l-md px-2 py-1.5 text-left">
                  <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ background: pl.color }} />{pl.name}
                  {MINE_TITLES.filter(t => titles[t.id].includes(pl.id)).map(t => <span key={t.id} className="ml-2 rounded bg-[#ffd166] px-1.5 py-0.5 text-xs font-bold text-[#14181d]">{t.name}</span>)}
                </td>
                {COLUMNS.map((c, i) => <td key={c.key} className={`px-1.5 py-1.5 ${i === COLUMNS.length - 1 ? "rounded-r-md" : ""} ${s?.[c.key] ? "font-bold" : "text-white/35"}`}>{s?.[c.key] ?? 0}</td>)}
              </tr>
            )
          })}
        </tbody>
      </table>
      <div className="mt-3 flex justify-end gap-2">
        {onReset && <button type="button" onClick={onReset} className="flex h-10 items-center gap-2 rounded-md border border-white/15 bg-[#0b110e] px-3 hover:border-[#ffd166] hover:text-white"><RotateCcw className="h-4 w-4" />Resetar grade</button>}
        <button type="button" onClick={dismissMineEnd} className="h-10 rounded-md bg-[var(--primary)] px-4 font-bold text-[#0b110e]">Dispensar</button>
      </div>
    </div>
  )
}
