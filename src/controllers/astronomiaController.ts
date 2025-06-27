/// <reference path="../../types/express/astronomia.d.ts" />
/// <reference path="../../types/express/json.d.ts" />
import { Request, Response } from 'express';
import axios from 'axios';
import { connection } from '../database/connection';
import { julian, planetposition, solar } from 'astronomia';

const vsop87Bearth = require('../../data/vsop87Bearth.js');

/**
 * Calculate the Sun's ecliptic longitude using VSOP87 (accurate).
 */
export async function calculateSunPosition(
  birthdate: string,
  birthtime: string,
  latitude: number,
  longitude: number
): Promise<{ longitude: number; sign: string }> {
  // Combine date and time
  const dateTime = `${birthdate}T${birthtime}`;
  const date = new Date(dateTime);

  // Calculate Julian Day
  const jd = julian.CalendarGregorianToJD(
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate() +
      date.getHours() / 24 +
      date.getMinutes() / 1440 +
      date.getSeconds() / 86400
  );

  // Fix: If the JS file uses `module.exports = { ... }`, require returns the object directly.
  // If it uses `exports.default = ...`, require returns { default: ... }
  // So, always use the correct object:
  const vsopData = vsop87Bearth.default || vsop87Bearth;
  const sun = new planetposition.Planet(vsopData);

  // Calculate ecliptic position
  const eclPos = solar.trueVSOP87(sun, jd);
  const sunLon = eclPos.lon * 180 / Math.PI; // Convert radians to degrees

  // Determine zodiac sign
  const signs = [
    'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
    'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
  ];
  const signIndex = Math.floor(((sunLon % 360) / 30));
  const sign = signs[signIndex];

  return { longitude: sunLon, sign };
}

/**
 * Calculate the user's full chart (Sun + optionally other planets)
 */
export async function getUserChartByEmail(email: string) {
  // 1. Get user birth data
  const [userRows]: any = await connection.execute(
    `SELECT ud.birthdate, ud.birthtime, ud.birth_city, ud.birth_country
     FROM users u
     LEFT JOIN user_details ud ON u.id = ud.user_id
     WHERE u.email = ? LIMIT 1`,
    [email]
  );
  if (!Array.isArray(userRows) || userRows.length === 0) {
    throw new Error('User not found');
  }
  const { birthdate, birthtime, birth_city, birth_country } = userRows[0];

  // 2. Geocode city/country to lat/lon
  const geoResp = await axios.get(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
      birth_city + (birth_country ? ',' + birth_country : '')
    )}&count=1`
  );
  if (!geoResp.data.results || geoResp.data.results.length === 0) {
    throw new Error('City not found');
  }
  // Fix: longitude should be negative for western hemisphere (Americas)
  let { latitude, longitude } = geoResp.data.results[0];
  if (longitude > 0 && (
    (birth_country && (
      birth_country.toLowerCase() === 'brazil' ||
      birth_country.toLowerCase() === 'usa' ||
      birth_country.toLowerCase() === 'united states'
    )) ||
    // fallback: if longitude is > 0 and city is in the Americas, make it negative
    (latitude < 0 && longitude > 0)
  )) {
    longitude = -Math.abs(longitude);
  }

  // 3. Calculate chart points (expand here for more planets)
  const sun = await calculateSunPosition(birthdate, birthtime, latitude, longitude);

  // You can expand this with more planets using astronomia's planetposition and VSOP87 data

  // 4. Return chart object
  return {
    sun,
    // Add more planets here as you implement them
    birthdate,
    birthtime,
    birth_city,
    birth_country,
    latitude,
    longitude
  };
}

/**
 * Get user Astronomia chart data
 */
export const getUserAstronomiaChart = async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required.' });

  try {
    const chart = await getUserChartByEmail(email);
    res.json({ chart });
  } catch (error: any) {
    res.status(404).json({ error: error.message || 'Error generating chart' });
  }
};
