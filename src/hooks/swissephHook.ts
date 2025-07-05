import swisseph from 'swisseph';
import fs from 'fs';
import path from 'path';

const ephePath = '/Users/lucaseduardo/HoroscopeServer/ephe';
swisseph.swe_set_ephe_path(ephePath);

// Verify that the required file exists
const requiredFile = path.join(ephePath, 'seas_18.se1');
if (!fs.existsSync(requiredFile)) {
  console.error(`Required Swiss Ephemeris file not found: ${requiredFile}`);
  throw new Error(`Swiss Ephemeris file 'seas_18.se1' is missing in path '${ephePath}'`);
}


export interface ChartPoint {
  longitude: number;
  latitude?: number; // Optional latitude property
  sign: string;
  degree: number;
  minute: number;
  second: number;
  house?: number; // Optional house property
  planet_type?: string; // Optional planet type property
}

/**
 * Calculate planetary position using SwissEph
 */
export function calculatePlanetPosition(
  julianDay: number,
  planetId: number
): number {
  try {
    const result = swisseph.swe_calc_ut(julianDay, planetId, swisseph.SEFLG_SWIEPH);

    if ('error' in result) {
      throw new Error(`SwissEph calculation error: ${result.error}`);
    }

    if ('longitude' in result) {
      return result.longitude;
    } else {
      throw new Error('Unexpected result format from SwissEph');
    }
  } catch (error: any) {
    console.error(`Error calculating planet position for planetId=${planetId}:`, error);
    throw new Error(`Failed to calculate planet position: ${error.message}`);
  }
}

/**
 * Calculate house cusps using SwissEph
 */
export function calculateHouses(
  julianDay: number,
  latitude: number,
  longitude: number,
  houseSystem: string = 'P' // Placidus by default
): { houses: number[]; ascendant: number; midheaven: number } {
  try {
    const result = swisseph.swe_houses(julianDay, latitude, longitude, houseSystem);

    if ('error' in result) {
      throw new Error(`SwissEph houses calculation error: ${result.error}`);
    }

    return {
      houses: result.house,
      ascendant: result.ascendant,
      midheaven: result.mc
    };
  } catch (error: any) {
    console.error(`Error calculating houses for latitude=${latitude}, longitude=${longitude}:`, error);
    throw new Error(`Failed to calculate houses: ${error.message}`);
  }
}

/**
 * Convert date to Julian Day
 */
export function dateToJulian(date: Date): number {
  const result = swisseph.swe_utc_to_jd(
    date.getFullYear(),
    date.getMonth() + 1, // Month is 0-indexed in JavaScript so we add 1 to match SwissEph, because it expects 1-12
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
    swisseph.SE_GREG_CAL
  );
  
  if ('error' in result) {
    throw new Error(`Date to Julian conversion error: ${result.error}`);
  }
  
  return result.julianDayUT;
}

/**
 * Convert longitude to zodiac sign information
 */
export function longitudeToSign(longitude: number): ChartPoint {
  const signs = [
    'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
    'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
  ];
  
  const normalizedLon = ((longitude % 360) + 360) % 360;
  const signIndex = Math.floor(normalizedLon / 30);
  const signDegree = normalizedLon % 30;
  const degree = Math.floor(signDegree);
  const minute = Math.floor((signDegree - degree) * 60);
  const second = Math.floor(((signDegree - degree) * 60 - minute) * 60);
  
  return {
    longitude: normalizedLon,
    sign: signs[signIndex],
    degree,
    minute,
    second
  };
}

/**
 * Get all main planets using SwissEph
 */
export function getAllPlanets(julianDay: number): Record<string, ChartPoint> {
  const planets = {
    sun: swisseph.SE_SUN,
    moon: swisseph.SE_MOON,
    mercury: swisseph.SE_MERCURY,
    venus: swisseph.SE_VENUS,
    mars: swisseph.SE_MARS,
    jupiter: swisseph.SE_JUPITER,
    saturn: swisseph.SE_SATURN,
    uranus: swisseph.SE_URANUS,
    neptune: swisseph.SE_NEPTUNE,
    pluto: swisseph.SE_PLUTO,
    northNode: swisseph.SE_TRUE_NODE,
    chiron: swisseph.SE_CHIRON
  };
  
  const result: Record<string, ChartPoint> = {};
  
  for (const [planetName, planetId] of Object.entries(planets)) {
    try {
      const longitude = calculatePlanetPosition(julianDay, planetId);
      result[planetName] = longitudeToSign(longitude);
    } catch (error) {
      console.error(`Error calculating ${planetName}:`, error);
      // Continue with other planets even if one fails
    }
  }
  
  return result;
}

/**
 * Calculate complete astrological chart using SwissEph
 */
export function calculateSwissEphChart(
  birthdate: string,
  birthtime: string,
  latitude: number,
  longitude: number
): {
  longitude: number;
  planets: Record<string, ChartPoint>;
  houses: { houses: number[]; ascendant: ChartPoint; midheaven: ChartPoint };
  julianDay: number;
} {
  if (!birthdate || !birthtime || latitude === undefined || longitude === undefined) {
    console.error('Invalid input data for Swiss Ephemeris:', { birthdate, birthtime, latitude, longitude });
    throw new Error('Invalid input data for Swiss Ephemeris calculations');
  }

  console.log('Valid input data for Swiss Ephemeris:', { birthdate, birthtime, latitude, longitude });

  // Parse date and time
  const dateTime = `${birthdate}T${birthtime}`;
  const date = new Date(dateTime);

  // Convert to Julian Day
  const julianDay = dateToJulian(date);
  console.log('Julian Day:', julianDay);

  // Calculate planets
  const planets = getAllPlanets(julianDay);

  // Calculate houses
  const houseData = calculateHouses(julianDay, latitude, longitude);

  return {
    longitude: houseData.ascendant,
    planets,
    houses: {
      houses: houseData.houses,
      ascendant: longitudeToSign(houseData.ascendant),
      midheaven: longitudeToSign(houseData.midheaven)
    },
    julianDay
  };
}