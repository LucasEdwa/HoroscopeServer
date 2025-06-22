import { Router } from 'express';
import { graphqlHTTP } from 'express-graphql';
import { buildSchema } from 'graphql';
import { connection } from '../database/connection';
import axios from 'axios';

// Zodiac sign date ranges
const zodiacSigns = [
  { sign: 'Capricorn', start: '01-01', end: '01-19' },
  { sign: 'Aquarius', start: '01-20', end: '02-18' },
  { sign: 'Pisces', start: '02-19', end: '03-20' },
  { sign: 'Aries', start: '03-21', end: '04-19' },
  { sign: 'Taurus', start: '04-20', end: '05-20' },
  { sign: 'Gemini', start: '05-21', end: '06-20' },
  { sign: 'Cancer', start: '06-21', end: '07-22' },
  { sign: 'Leo', start: '07-23', end: '08-22' },
  { sign: 'Virgo', start: '08-23', end: '09-22' },
  { sign: 'Libra', start: '09-23', end: '10-22' },
  { sign: 'Scorpio', start: '10-23', end: '11-21' },
  { sign: 'Sagittarius', start: '11-22', end: '12-21' },
  { sign: 'Capricorn', start: '12-22', end: '12-31' },
];

// Helper to get sign id by name
async function getSignIdByName(sign: string): Promise<number | null> {
  // Normalize sign name for DB lookup
  const normalized = sign?.trim().charAt(0).toUpperCase() + sign?.trim().slice(1).toLowerCase();
  const [rows]: any = await connection.execute(
    'SELECT id FROM signs WHERE name = ? LIMIT 1',
    [normalized]
  );
  if (!Array.isArray(rows) || rows.length === 0) {
    console.error(`[getSignIdByName] Sign not found in DB: "${normalized}" (original: "${sign}")`);
    return null;
  }
  return rows[0].id;
}

// Helper to get sign name and description by id
async function getSignById(id: number): Promise<{ name: string, description: string } | null> {
  const [rows]: any = await connection.execute(
    'SELECT name, description FROM signs WHERE id = ? LIMIT 1',
    [id]
  );
  if (Array.isArray(rows) && rows.length > 0) return rows[0];
  return null;
}

// Helper to get sun sign by birthdate
function getZodiacSign(dateString: string) {
  if (typeof dateString !== 'string') return 'Unknown';
  let year, month, day;
  // Try YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    [year, month, day] = dateString.split('-').map(Number);
  } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
    // Try DD/MM/YYYY
    [day, month, year] = dateString.split('/').map(Number);
  } else if (/^\d{2}-\d{2}-\d{4}$/.test(dateString)) {
    // Try DD-MM-YYYY
    [day, month, year] = dateString.split('-').map(Number);
  } else {
    console.warn('Unrecognized dateOfBirth format:', dateString);
    return 'Unknown';
  }
  if (isNaN(month) || isNaN(day)) {
    console.warn('Invalid dateOfBirth format:', dateString);
    return 'Unknown';
  }
  const mmdd = `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  for (const z of zodiacSigns) {
    if (mmdd >= z.start && mmdd <= z.end) {
      return z.sign;
    }
  }
  return 'Unknown';
}

// Helper: Get latitude/longitude from city/country using OpenCage Geocoding API
async function geocodeCity(city: string, country: string): Promise<{ lat: number, lon: number } | null> {
  const apiKey = process.env.OPENCAGE_API_KEY; // Add this to your .env
  const query = encodeURIComponent(`${city}, ${country}`);
  const url = `https://api.opencagedata.com/geocode/v1/json?q=${query}&key=${apiKey}&limit=1`;
  const res = await axios.get(url);
  if (res.data.results && res.data.results.length > 0) {
    const { lat, lng } = res.data.results[0].geometry;
    return { lat, lon: lng };
  }
  return null;
}

// Helper: Get real chart points from AstroAPI
async function getRealChartPoints(birthdate: string, birthtime: string, city: string, country: string) {
  const geo = await geocodeCity(city, country);
  if (!geo) throw new Error('Could not geocode city/country');
  const astroApiKey = process.env.ASTROAPI_KEY; // Add this to your .env
  const url = 'https://api.astroapi.eu/v1/birth-chart';
  const res = await axios.post(url, {
    date: birthdate,
    time: birthtime,
    latitude: geo.lat,
    longitude: geo.lon,
    // You may need to specify house system, timezone, etc.
  }, {
    headers: { 'Authorization': `Bearer ${astroApiKey}` }
  });

  // Map AstroAPI response to your chart points
  // Example for sun, moon, ascendant, etc.
  const points: { type: string, sign: string, house: number | null }[] = [];
  if (res.data && res.data.points) {
    for (const pt of res.data.points) {
      // pt.type might be 'sun', 'moon', 'ascendant', etc.
      points.push({
        type: pt.type.toLowerCase(),
        sign: pt.sign,
        house: pt.house_number || null
      });
    }
  }
  return points;
}

// Calculate all chart points for a user (stub/demo logic)
// WARNING: This does NOT calculate the real ascendant! Use a real astrology library or API for production.
async function calculateChartPoints(birthdate: string, birthtime: string, city: string, country: string) {
  return await getRealChartPoints(birthdate, birthtime, city, country);
}

// Insert chart points for a user
export async function createUserChartPointsIfNotExists(userId: number, birthdate: string, birthtime: string, city: string, country: string) {
  // Check if chart points already exist
  const [existing]: any = await connection.execute(
    `SELECT id FROM user_chart_points WHERE user_id = ? LIMIT 1`, [userId]
  );
  if (Array.isArray(existing) && existing.length > 0) return;

  const points = await calculateChartPoints(birthdate, birthtime, city, country);

  for (const point of points) {
    const signId = await getSignIdByName(point.sign);
    if (signId) {
      await connection.execute(
        `INSERT INTO user_chart_points (user_id, point_type, sign_id, house_number)
         VALUES (?, ?, ?, ?)`,
        [userId, point.type, signId, point.house]
      );
    }
  }
}

// Fetch chart points for a user
async function getUserChartPoints(userId: number) {
  const [rows]: any = await connection.execute(
    `SELECT point_type, sign_id, house_number FROM user_chart_points WHERE user_id = ?`,
    [userId]
  );
  const result: Record<string, { sign: string | null, description: string | null, house: number | null }> = {};
  for (const row of rows) {
    const sign = row.sign_id ? await getSignById(row.sign_id) : null;
    result[row.point_type] = {
      sign: sign?.name ?? null,
      description: sign?.description ?? null,
      house: row.house_number ?? null
    };
  }
  return result;
}

// GraphQL schema for normalized chart points
const schema = buildSchema(`
  type ChartPoint {
    sign: String
    description: String
    house: Int
  }

  type ZodiacChart {
    sun: ChartPoint
    ascendant: ChartPoint
    descendant: ChartPoint
    moon: ChartPoint
    venus: ChartPoint
    mars: ChartPoint
    mercury: ChartPoint
    jupiter: ChartPoint
    saturn: ChartPoint
    uranus: ChartPoint
    neptune: ChartPoint
    pluto: ChartPoint
    dateOfBirth: String
    timeOfBirth: String
    city: String
    country: String
  }

  type Query {
    zodiacChart(email: String!): ZodiacChart
  }
`);

const root = {
  zodiacChart: async ({ email }: { email: string }) => {
    // Get user and details
    const [userRows]: any = await connection.execute(
      `SELECT u.id, ud.birthdate, ud.birthtime, ud.birth_city, ud.birth_country 
       FROM users u 
       JOIN user_details ud ON u.id = ud.user_id 
       WHERE u.email = ? LIMIT 1`,
      [email]
    );
    if (!Array.isArray(userRows) || userRows.length === 0) return null;
    const user = userRows[0];

    // Ensure chart points exist
    await createUserChartPointsIfNotExists(
      user.id,
      user.birthdate instanceof Date ? user.birthdate.toISOString().slice(0, 10) : user.birthdate,
      user.birthtime instanceof Date ? user.birthtime.toISOString().slice(11, 19) : user.birthtime,
      user.birth_city,
      user.birth_country
    );

    // Fetch chart points
    const points = await getUserChartPoints(user.id);

    return {
      sun: points.sun ?? null,
      ascendant: points.ascendant ?? null,
      descendant: points.descendant ?? null,
      moon: points.moon ?? null,
      venus: points.venus ?? null,
      mars: points.mars ?? null,
      mercury: points.mercury ?? null,
      jupiter: points.jupiter ?? null,
      saturn: points.saturn ?? null,
      uranus: points.uranus ?? null,
      neptune: points.neptune ?? null,
      pluto: points.pluto ?? null,
      dateOfBirth: user.birthdate instanceof Date
        ? user.birthdate.toISOString().slice(0, 10)
        : user.birthdate,
      timeOfBirth: user.birthtime,
      city: user.birth_city,
      country: user.birth_country
    };
  },
};

const router = Router();
router.use(
  '/',
  graphqlHTTP({
    schema,
    rootValue: root,
    graphiql: true,
  })
);

export default router;
