/**
 * Calculate which house a planet is in based on longitude and house cusps
 */
export function calculateHousePosition(
  planetLongitude: number,
  houseCusps: number[]
): number {
  const normalizedLon = ((planetLongitude % 360) + 360) % 360;

  for (let i = 0; i < 12; i++) {
    const currentHouse = houseCusps[i];
    const nextHouse = houseCusps[(i + 1) % 12];

    if (nextHouse > currentHouse) {
      if (normalizedLon >= currentHouse && normalizedLon < nextHouse)
        return i + 1;
    } else if (normalizedLon >= currentHouse || normalizedLon < nextHouse) {
      return i + 1;
    }
  }

  return 1; // Default to first house if calculation fails
}

/**
 * Determine planet type based on planet name
 */
export function getPlanetType(planetName: string): 'planet' | 'point' | 'asteroid' {
  if (["northNode"].includes(planetName)) {
    return "point";
  }
  if (["chiron"].includes(planetName)) {
    return "asteroid";
  }
  return "planet";
}
