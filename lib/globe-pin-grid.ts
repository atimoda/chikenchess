export interface GeoPoint { lat: number; lng: number }

export const PIN_GRID_LATITUDE_ROWS = 48
export const PIN_GRID_EQUATOR_COLUMNS = 96

/** Reduce each row's longitude count with its circumference to keep dot spacing balanced. */
export function pinGridColumnCount(latitude: number) {
  return Math.max(4, Math.round(PIN_GRID_EQUATOR_COLUMNS * Math.cos(latitude * Math.PI / 180)))
}

// Dots mark cell centers. Longitude converges near the poles, so those rows use fewer columns.
export function pinGridCells(): GeoPoint[] {
  const cells: GeoPoint[] = []
  const latitudeStep = 180 / PIN_GRID_LATITUDE_ROWS
  for (let row = 0; row < PIN_GRID_LATITUDE_ROWS; row++) {
    const lat = -90 + (row + .5) * latitudeStep
    const columns = pinGridColumnCount(lat)
    const longitudeStep = 360 / columns
    for (let column = 0; column < columns; column++) {
      cells.push({ lat, lng: -180 + (column + .5) * longitudeStep })
    }
  }
  return cells
}

function angularDistance(a: GeoPoint, b: GeoPoint) {
  const radians = Math.PI / 180
  const latA = a.lat * radians, latB = b.lat * radians
  const difference = (a.lng - b.lng) * radians
  return Math.acos(Math.max(-1, Math.min(1,
    Math.sin(latA) * Math.sin(latB) + Math.cos(latA) * Math.cos(latB) * Math.cos(difference),
  )))
}

export function placePinsOnGrid(locations: readonly { id: string; geoCoordinates: GeoPoint }[]) {
  const cells = pinGridCells()
  const groups = new Map<string, { ids: string[]; exact: GeoPoint; closest: number }>()
  for (const location of locations) {
    const exact = location.geoCoordinates
    const key = `${exact.lat}:${exact.lng}`
    const group = groups.get(key)
    if (group) group.ids.push(location.id)
    else groups.set(key, {
      ids: [location.id], exact,
      closest: Math.min(...cells.map(cell => angularDistance(exact, cell))),
    })
  }

  // Locations closest to a dot claim it first; each remaining location takes
  // the nearest available dot. Eras with identical coordinates share one dot.
  const ordered = [...groups.values()].sort((a, b) => a.closest - b.closest ||
    (a.ids[0] < b.ids[0] ? -1 : a.ids[0] > b.ids[0] ? 1 : 0))
  const occupied = new Set<number>()
  const positions: Record<string, GeoPoint> = {}
  for (const group of ordered) {
    const nearest = cells.map((cell, index) => ({ index, distance: angularDistance(group.exact, cell) }))
      .sort((a, b) => a.distance - b.distance || a.index - b.index)
      .find(candidate => !occupied.has(candidate.index))
    if (!nearest) throw new Error('The globe pin grid has no free cells')
    occupied.add(nearest.index)
    for (const id of group.ids) positions[id] = cells[nearest.index]
  }
  return positions
}
