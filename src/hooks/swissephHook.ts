import swisseph from 'swisseph';
import fs from 'fs';
import path from 'path';
import { ChartPoint } from '../interfaces/userInterface';
import {ZODIAC_SIGNS,PLANET_IDS} from '../constants/astrologyConstants';
// Constants
const EPHE_PATH = process.env.EPHE_PATH || path.join(__dirname, '../../ephe');
const REQUIRED_FILE = 'seas_18.se1';
const DEFAULT_HOUSE_SYSTEM = 'P'; // Placidus


// Initialize Swiss Ephemeris
swisseph.swe_set_ephe_path(EPHE_PATH);

// Verify required file exists
const requiredFilePath = path.join(EPHE_PATH, REQUIRED_FILE);
if (!fs.existsSync(requiredFilePath)) {
  throw new Error(`Swiss Ephemeris file '${REQUIRED_FILE}' is missing in path '${EPHE_PATH}'`);
}

// Utility function for handling SwissEph errors
function handleSwissEphError(operation: string, error: any): never {
  console.error(`SwissEph ${operation} error:`, error);
  throw new Error(`Failed to ${operation}: ${error.message || error}`);
}

/**
 * Calculate planetary position using SwissEph
 */
export function calculatePlanetPosition(julianDay: number, planetId: number): number {
  const result = swisseph.swe_calc_ut(julianDay, planetId, swisseph.SEFLG_SWIEPH);

  if ('error' in result) {
    handleSwissEphError('calculate planet position', result.error);
  }

  if (!('longitude' in result)) {
    throw new Error('Unexpected result format from SwissEph planet calculation');
  }

  return result.longitude;
}

/**
 * Calculate house cusps using SwissEph
 */
export function calculateHouses(
  julianDay: number,
  latitude: number,
  longitude: number,
  houseSystem: string = DEFAULT_HOUSE_SYSTEM
): { houses: number[]; ascendant: number; midheaven: number } {
  const result = swisseph.swe_houses(julianDay, latitude, longitude, houseSystem);

  if ('error' in result) {
    handleSwissEphError('calculate houses', result.error);
  }

  return {
    houses: result.house,
    ascendant: result.ascendant,
    midheaven: result.mc
  };
}

/**
 * Convert date to Julian Day
 */
export function dateToJulian(date: Date): number {
  const result = swisseph.swe_utc_to_jd(
    date.getFullYear(),
    date.getMonth() + 1, // JavaScript months are 0-indexed
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
    swisseph.SE_GREG_CAL
  );
  
  if ('error' in result) {
    handleSwissEphError('convert date to Julian', result.error);
  }
  
  return result.julianDayUT;
}

/**
 * Convert longitude to zodiac sign information
 */
export function longitudeToSign(longitude: number): Omit<ChartPoint, 'user_id' | 'name' | 'latitude' | 'house' | 'planet_type' | 'distance'> {
  const normalizedLon = ((longitude % 360) + 360) % 360;
  const signIndex = Math.floor(normalizedLon / 30);
  const signDegree = normalizedLon % 30;
  const degree = Math.floor(signDegree);
  const minuteFloat = (signDegree - degree) * 60;
  const minute = Math.floor(minuteFloat);
  const second = Math.floor((minuteFloat - minute) * 60);
  
  
  return {
    longitude: normalizedLon,
    sign: ZODIAC_SIGNS[signIndex],
    degree,
    minute,
    second
  };
}

/**
 * Get all main planets using SwissEph
 */
export function getAllPlanets(julianDay: number): Record<string, Omit<ChartPoint, 'user_id' | 'name' | 'latitude' | 'house' | 'planet_type' | 'distance'>> {
  const result: Record<string, any> = {};
  
  for (const planet of PLANET_IDS) {
    try {
      const longitude = calculatePlanetPosition(julianDay, planet.id);
      result[planet.name.toLowerCase()] = longitudeToSign(longitude);
    } catch (error) {
      console.error(`Error calculating ${planet.name}:`, error);
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
  longitude: number,
  timezoneOffset?: number 
): {
  longitude: number;
  planets: Record<string, Omit<ChartPoint, 'user_id' | 'name' | 'latitude' | 'house' | 'planet_type' | 'distance'>>;
  houses: { 
    houses: number[]; 
    ascendant: Omit<ChartPoint, 'user_id' | 'name' | 'latitude' | 'house' | 'planet_type' | 'distance'>; 
    midheaven: Omit<ChartPoint, 'user_id' | 'name' | 'latitude' | 'house' | 'planet_type' | 'distance'>; 
  };
  julianDay: number;
} {
  // Validate input parameters
  if (!birthdate?.trim() || !birthtime?.trim() || 
      typeof latitude !== 'number' || typeof longitude !== 'number') {
    throw new Error('Invalid input data for Swiss Ephemeris calculations');
  }

  
  // Parse date and time components
  const [year, month, day] = birthdate.split('-').map(Number);
  const [hours, minutes, seconds = 0] = birthtime.split(':').map(Number);
  

  // Use provided timezone offset or fallback to longitude-based calculation
  const offsetHours = timezoneOffset !== undefined ? timezoneOffset : Math.round(longitude / 15);
  // Convert local time to UTC
  let utcHours = hours - offsetHours;
  let utcDay = day;
  let utcMonth = month;
  let utcYear = year;
  
  // Handle hour overflow
  if (utcHours >= 24) {
    utcHours -= 24;
    utcDay += 1;
    // Simple day overflow handling
    if (utcDay > 30) { // Simplified
      utcDay = 1;
      utcMonth += 1;
      if (utcMonth > 12) {
        utcMonth = 1;
        utcYear += 1;
      }
    }
  } else if (utcHours < 0) {
    utcHours += 24;
    utcDay -= 1;
    // Simple day underflow handling
    if (utcDay < 1) {
      utcMonth -= 1;
      if (utcMonth < 1) {
        utcMonth = 12;
        utcYear -= 1;
      }
      utcDay = 30; // Simplified
    }
  }
  

  // Convert to Julian Day using UTC time
  const julianDay = swisseph.swe_utc_to_jd(
    utcYear,
    utcMonth,
    utcDay,
    utcHours,
    minutes,
    seconds,
    swisseph.SE_GREG_CAL
  );
  
  if ('error' in julianDay) {
    handleSwissEphError('convert date to Julian', julianDay.error);
  }
  

  // Calculate planets and houses
  const planets = getAllPlanets(julianDay.julianDayUT);
  const houseData = calculateHouses(julianDay.julianDayUT, latitude, longitude);

  const ascendantSign = longitudeToSign(houseData.ascendant);

  return {
    longitude: houseData.ascendant,
    planets,
    houses: {
      houses: houseData.houses,
      ascendant: ascendantSign,
      midheaven: longitudeToSign(houseData.midheaven)
    },
    julianDay: julianDay.julianDayUT
  };
}

/**
 * Calculate planetary positions for a given date, time, and location.
 * Returns an object with planet names as keys and their zodiac/sign/degree info as values.
 */
export function getPlanetsForMoment(
  date: Date,
  latitude: number,
  longitude: number
): Record<string, Omit<ChartPoint, 'user_id' | 'name' | 'latitude' | 'house' | 'planet_type' | 'distance'>> {
  // Convert date to Julian Day (UTC)
  const julianDay = dateToJulian(date);

  // Calculate all main planets for this moment
  return getAllPlanets(julianDay);
}