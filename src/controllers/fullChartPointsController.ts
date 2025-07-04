import swisseph from 'swisseph';
import { getUserChartByEmail } from './astronomiaController';
import { connection } from '../database/connection';

swisseph.swe_set_ephe_path('/path/to/ephemeris/files'); 
const PLANETS = [
  { type: 'sun', id: swisseph.SE_SUN },
  { type: 'moon', id: swisseph.SE_MOON },
  { type: 'mercury', id: swisseph.SE_MERCURY },
  { type: 'venus', id: swisseph.SE_VENUS },
  { type: 'mars', id: swisseph.SE_MARS },
  { type: 'jupiter', id: swisseph.SE_JUPITER },
  { type: 'saturn', id: swisseph.SE_SATURN },
  { type: 'uranus', id: swisseph.SE_URANUS },
  { type: 'neptune', id: swisseph.SE_NEPTUNE },
  { type: 'pluto', id: swisseph.SE_PLUTO }
];

const ZODIAC_SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
];

function getSign(longitude: number): string {
  const index = Math.floor(longitude / 30) % 12;
  return ZODIAC_SIGNS[index];
}

function getHouseNumber(houses: number[], longitude: number): number | null {
  // houses: array of 13 cusp longitudes (1-based, 1..12, 13==1)
  for (let i = 1; i <= 12; i++) {
    const start = houses[i];
    const end = houses[i + 1] || houses[1] + 360;
    if (
      (start <= longitude && longitude < end) ||
      (end < start && (longitude >= start || longitude < end % 360))
    ) {
      return i;
    }
  }
  return null;
}

// Helper: Get sign_id from sign name
async function getSignIdByName(sign: string): Promise<number | null> {
  const [rows]: any = await connection.execute(
    'SELECT id FROM signs WHERE name = ? LIMIT 1',
    [sign]
  );
  if (!Array.isArray(rows) || rows.length === 0) return null;
  return rows[0].id;
}

// Insert chart points into user_chart_points
async function insertUserChartPoints(userId: number, chartPoints: { type: string, sign: string, house: number | null }[]) {
  for (const point of chartPoints) {
    const signId = await getSignIdByName(point.sign);
    if (!signId) continue;
    await connection.execute(
      `INSERT INTO user_chart_points (user_id, point_type, sign_id, house_number)
       VALUES (?, ?, ?, ?)`,
      [userId, point.type, signId, point.house]
    );
  }
}

export async function getFullChartPointsWithSwisseph(email: string) {
  const chart = await getUserChartByEmail(email);
  if (!chart) throw new Error('User chart not found');

  // Fetch user_id from database
  const [userRows]: any = await connection.execute(
    'SELECT id FROM users WHERE email = ? LIMIT 1',
    [email]
  );
  if (!Array.isArray(userRows) || userRows.length === 0) throw new Error('User not found');
  const userId = userRows[0].id;

  // Parse date and time
  const [year, month, day] = chart.birthdate.split('-').map(Number);
  const [hour, minute] = chart.birthtime.split(':').map(Number);

  let latitude = chart.latitude;
  let longitude = chart.longitude;

//   // --- DEBUG: Log all location/time values for troubleshooting ---
//   console.log({
//     latitude,
//     longitude,
//     birthdate: chart.birthdate,
//     birthtime: chart.birthtime,
//     birth_city: chart.birth_city,
//     birth_country: chart.birth_country
//   });

  // Ensure longitude is negative for western hemisphere
  if (longitude > 0 && (
    (chart.birth_country && (
      chart.birth_country.toLowerCase() === 'brazil' ||
      chart.birth_country.toLowerCase() === 'usa'
    )) ||
    (latitude < 0 && longitude > 0)
  )) {
    longitude = -Math.abs(longitude);
  }

  // Get timezone using GeoNames Timezone API if not present
  let timezone = (chart as any).timezone;
  if (timezone === undefined || timezone === null) {
    if (chart.birth_country && chart.birth_country.toLowerCase() === 'brazil') {
      timezone = -3;
    } else {
      timezone = 0;
    }
  }

  // --- DEBUG: Log timezone and UT ---
  const ut = hour + minute / 60 - timezone;
//   console.log({ timezone, ut });

  // Calculate Julian Day
  const jd = swisseph.swe_julday(year, month, day, ut, swisseph.SE_GREG_CAL);

  // Calculate houses (Placidus)
  const housesResult = swisseph.swe_houses(
    jd,
    latitude,
    longitude,
    'P'
  );
  if (!('house' in housesResult)) {
    throw new Error(`House calculation failed: ${(housesResult as any).error || 'Unknown error'}`);
  }
  const houses = housesResult.house; // 1-based, 1..12


  // Calculate planets
  const chartPoints: { type: string, sign: string, house: number | null }[] = [];
  for (const planet of PLANETS) {
    const result = swisseph.swe_calc_ut(jd, planet.id, 0);
    const longitude =
      Array.isArray((result as any).position)
        ? (result as any).position[0]
        : (result as any).longitude;
    const sign = getSign(longitude);
    const house = getHouseNumber([0, ...houses], longitude);
    chartPoints.push({ type: planet.type, sign, house });
  }
  // Ascendant and Descendant
  const asc = houses[0];
  const desc = (asc + 180) % 360;
  chartPoints.push({ type: 'ascendant', sign: getSign(asc), house: 1 });

  // Insert into DB
  await insertUserChartPoints(userId, chartPoints);

  return chartPoints;
}