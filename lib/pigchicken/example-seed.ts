// The example Pátios. They are not buttons of the Playgrounds panel: each one goes to the database once as a normal
// Pátio (lobby) of the admin's account (creator, godparent and who saved it: profile code ADMIN_PROFILE_CODE) and is
// featured (Destaques), so the admin keeps editing it in the Modo editor and every player opens it from Destaques.
// `node scripts/example-patios-migration.cjs <AAAAMMDDNNNN>` writes the migration that adds the ones below that the
// database does not have yet (a fixed id each; an existing row with that id or that name is never overwritten,
// only given to the admin's account and featured). A new example: its layout file, one entry here, a new migration.
import { sunsetPowerLayout } from './example-patios'
import { valleyLayout } from './example-valley'
import { trainingLayout } from './example-training'
import { minefieldLayout } from './example-minefield'
import { MENU_NAME, menuLayout } from './example-menu'
import { arsenalLayout } from './example-arsenal'
import { gridLayout } from './example-grid'
import { deadlockLayout } from './example-deadlock'
import type { PatioLayout } from './layout'

export const ADMIN_PROFILE_CODE = '000000001'

// default: becomes the default Pátio when the migration first adds it (never again afterwards, so the admin's later
// choice of another default stands)
export type ExamplePatio = { id: string; name: string; layout: () => PatioLayout; default?: boolean }
export const EXAMPLE_PATIOS: ExamplePatio[] = [
  { id: '5e7a0c11-0001-4e5a-9c0d-ec5a3b1e0001', name: 'Pôr do sol com torres', layout: sunsetPowerLayout },
  { id: '5e7a0c11-0002-4e5a-9c0d-ec5a3b1e0002', name: 'Vales e ilhas no céu', layout: valleyLayout },
  { id: '5e7a0c11-0003-4e5a-9c0d-ec5a3b1e0003', name: 'Training room', layout: trainingLayout },
  { id: '5e7a0c11-0004-4e5a-9c0d-ec5a3b1e0004', name: 'Campo minado', layout: minefieldLayout },
  { id: '5e7a0c11-0005-4e5a-9c0d-ec5a3b1e0005', name: MENU_NAME, layout: menuLayout, default: true },
  { id: '5e7a0c11-0006-4e5a-9c0d-ec5a3b1e0006', name: 'Sala de armas e instrumentos', layout: arsenalLayout },
  { id: '5e7a0c11-0007-4e5a-9c0d-ec5a3b1e0007', name: 'Grid com loot', layout: gridLayout },
  { id: '5e7a0c11-0008-4e5a-9c0d-ec5a3b1e0008', name: 'Arquipélago das Almas', layout: deadlockLayout },
]
