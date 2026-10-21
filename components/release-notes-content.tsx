'use client'

import { CHANGELOG } from '@/lib/changelog'

export function ReleaseNotesContent() {
  return <div tabIndex={0} aria-label="Histórico de versões" className="h-full overflow-y-auto overscroll-contain min-h-0 pr-3 space-y-8 text-xs">
    {CHANGELOG.map(release => <article key={release.version}>
      <h2 className="text-base font-mono text-primary">v{release.version} · {release.title}</h2>
      {release.date && <p className="text-[11px] text-[#a7b6a9] mt-1">{release.date}</p>}
      {release.groups.map(group => <section key={group.title} className="mt-5">
        <h3 className="text-xs font-semibold mb-2">{group.title}</h3>
        <ul className="list-disc pl-5 space-y-2 text-xs text-[#bdcabc]">{group.items.map(item => <li key={item}>{item}</li>)}</ul>
      </section>)}
    </article>)}
  </div>
}
