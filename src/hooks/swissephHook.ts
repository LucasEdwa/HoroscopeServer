import swisseph from 'swisseph';
import fs from 'fs';
import path from 'path';
import { ChartPoint } from '../interfaces/userInterface';
import {ZODIAC_SIGNS,PLANET_IDS} from '../constants/astrologyConstants';

const EPHE_PATH = process.env.EPHE_PATH || path.join(__dirname, '../../ephe');
const REQUIRED_FILE = 'seas_18.se1';
const DEFAULT_HOUSE_SYSTEM = 'P';

swisseph.swe_set_ephe_path(EPHE_PATH);
const requiredFilePath = path.join(EPHE_PATH, REQUIRED_FILE);
if (!fs.existsSync(requiredFilePath)) {
  throw new Error(`Swiss Ephemeris file '${REQUIRED_FILE}' is missing in path '${EPHE_PATH}'`);
}

function handleSwissEphError(operation: string, error: any): never {
  console.error(`SwissEph ${operation} error:`, error);
  throw new Error(`Failed to ${operation}: ${error.message || error}`);
}

export function calculatePlanetPosition(julianDay: number, planetId: number): number {
  const result = swisseph.swe_calc_ut(julianDay, planetId, swisseph.SEFLG_SWIEPH);
  if ('error' in result) handleSwissEphError('calculate planet position', result.error);
  if (!('longitude' in result)) throw new Error('Unexpected result format from SwissEph planet calculation');
  return result.longitude;
}

export function calculateHouses(
  julianDay: number,
  latitude: number,
  longitude: number,
  houseSystem: string = DEFAULT_HOUSE_SYSTEM
): { houses: number[]; ascendant: number; midheaven: number } {
  const result = swisseph.swe_houses(julianDay, latitude, longitude, houseSystem);
  if ('error' in result) handleSwissEphError('calculate houses', result.error);
  return {
    houses: result.house,
    ascendant: result.ascendant,
    midheaven: result.mc
  };
}

export function dateToJulian(date: Date): number {
  const result = swisseph.swe_utc_to_jd(
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
    swisseph.SE_GREG_CAL
  );
  if ('error' in result) handleSwissEphError('convert date to Julian', result.error);
  return result.julianDayUT;
}

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

export function getAllPlanets(julianDay: number): Record<string, Omit<ChartPoint, 'user_id' | 'name' | 'latitude' | 'house' | 'planet_type' | 'distance'>> {
  const result: Record<string, any> = {};
  for (const planet of PLANET_IDS) {
    try {
      const longitude = calculatePlanetPosition(julianDay, planet.id);
      result[planet.name.toLowerCase()] = longitudeToSign(longitude);
    } catch (error) {
      console.error(`Error calculating ${planet.name}:`, error);
    }
  }
  return result;
}

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
  if (!birthdate?.trim() || !birthtime?.trim() || 
      typeof latitude !== 'number' || typeof longitude !== 'number') {
    throw new Error('Invalid input data for Swiss Ephemeris calculations');
  }
  const [year, month, day] = birthdate.split('-').map(Number);
  const [hours, minutes, seconds = 0] = birthtime.split(':').map(Number);
  const offsetHours = timezoneOffset !== undefined ? timezoneOffset : Math.round(longitude / 15);
  let utcHours = hours - offsetHours;
  let utcDay = day, utcMonth = month, utcYear = year;
  if (utcHours >= 24) {
    utcHours -= 24; utcDay += 1;
    if (utcDay > 30) { utcDay = 1; utcMonth += 1; if (utcMonth > 12) { utcMonth = 1; utcYear += 1; } }
  } else if (utcHours < 0) {
    utcHours += 24; utcDay -= 1;
    if (utcDay < 1) { utcMonth -= 1; if (utcMonth < 1) { utcMonth = 12; utcYear -= 1; } utcDay = 30; }
  }
  const julianDay = swisseph.swe_utc_to_jd(
    utcYear, utcMonth, utcDay, utcHours, minutes, seconds, swisseph.SE_GREG_CAL
  );
  if ('error' in julianDay) handleSwissEphError('convert date to Julian', julianDay.error);
  const planets = getAllPlanets(julianDay.julianDayUT);
  const houseData = calculateHouses(julianDay.julianDayUT, latitude, longitude);
  return {
    longitude: houseData.ascendant,
    planets,
    houses: {
      houses: houseData.houses,
      ascendant: longitudeToSign(houseData.ascendant),
      midheaven: longitudeToSign(houseData.midheaven)
    },
    julianDay: julianDay.julianDayUT
  };
}

export function getPlanetsForMoment(
  date: Date,
  latitude: number,
  longitude: number
): Record<string, Omit<ChartPoint, 'user_id' | 'name' | 'latitude' | 'house' | 'planet_type' | 'distance'>> {
  const julianDay = dateToJulian(date);
  return getAllPlanets(julianDay);
}