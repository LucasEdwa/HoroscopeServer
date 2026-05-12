import bcrypt from 'bcrypt';
import { connection } from '../database/connection';
import { calculateAndSaveUserChart } from './swissephService';
import { User, UserBirthData, ChartPoint } from '../interfaces/userInterface';
import { normalizeBirthTime } from '../utils/validation/validationUtils';
import { geocodeLocation } from './geocodingService';
import { calculateSwissEphChart } from '../hooks/swissephHook';
import { validateGeocodedTimezone, enforceGeocodedTimezone, logTimezoneDebugInfo } from '../utils/astrology/timezoneUtils';

export async function getUserBirthData(email: string): Promise<UserBirthData | null> {
  const [userRows]: any = await connection.execute(
    `SELECT u.id AS user_id, u.username, u.email, ud.birthdate, ud.birthtime, ud.birth_city, ud.birth_country
     FROM users u
     LEFT JOIN user_details ud ON u.id = ud.user_id
     WHERE u.email = ? LIMIT 1`,
    [email]
  );

  if (!Array.isArray(userRows) || userRows.length === 0) {
    return null;
  }

  const userData = userRows[0];
  return userData;
}

/**
 * Main function to get complete user data for GraphQL queries
 */
export async function getUserForQuery(email: string): Promise<User | null> {
  const userData = await getUserBirthData(email);
  if (!userData) return null;

  // If user has birth data but no chart, calculate it
  if (userData.birthdate && userData.birthtime && userData.birth_city && userData.birth_country) {
    const [existingChart]: any[] = await connection.execute(
      'SELECT COUNT(*) as count FROM user_chart WHERE user_id = ?',
      [userData.user_id]
    );

    if (existingChart[0].count === 0) {
      console.log('No chart found, calculating new chart for user:', userData.email);
      await calculateAndSaveUserChart(email);
    }
  }

  // Get chart points
  const [chartRows]: any[] = await connection.execute(
    'SELECT * FROM user_chart WHERE user_id = ?',
    [userData.user_id]
  );


  const chartPoints: ChartPoint[] = chartRows.map((row: any) => ({
    name: row.planet_name,
    longitude: row.longitude,
    latitude: row.latitude,
    sign: row.sign,
    house: row.house,
    degree: row.degree,
    minute: row.minute,
    second: row.second,
    planet_type: row.planet_type,
  }));

  return {
    id: userData.user_id.toString(),
    username: userData.username || '',
    email: userData.email,
    birthdate: userData.birthdate,
    birthtime: userData.birthtime,
    birth_city: userData.birth_city,
    birth_country: userData.birth_country,
    chartPoints,
  };
}

export const getUserByEmail = async (email: string) => {
  const [rows]: any = await connection.execute(
    'SELECT * FROM users WHERE LOWER(email) = ? LIMIT 1',
    [email.toLowerCase()]
  );
  const user = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
  return user;
};

export async function createUser(
  name: string,
  email: string,
  password: string,
  dateOfBirth: string,
  timeOfBirth: string,
  city: string,
  country: string
) {
  const normalizedBirthTime = normalizeBirthTime(timeOfBirth);

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Insert user into the database
  const [userResult]: any = await connection.execute(
    'INSERT INTO users (username, email, password, registered) VALUES (?, ?, ?, ?)',
    [name, email, hashedPassword, Math.floor(Date.now() / 1000)]
  );

  const userId = userResult.insertId;

  // Insert user details
  await connection.execute(
    'INSERT INTO user_details (user_id, birthdate, birthtime, birth_city, birth_country) VALUES (?, ?, ?, ?, ?)',
    [userId, dateOfBirth, normalizedBirthTime, city, country]
  );

  return userId;
}

function calculateHousePosition(planetLongitude: number, houseCusps: number[]): number {
  const normalizedLon = ((planetLongitude % 360) + 360) % 360;

  for (let i = 0; i < 12; i++) {
    const currentHouse = houseCusps[i];
    const nextHouse = houseCusps[(i + 1) % 12];

    if (nextHouse > currentHouse) {
      if (normalizedLon >= currentHouse && normalizedLon < nextHouse) {
        return i + 1;
      }
    } else if (normalizedLon >= currentHouse || normalizedLon < nextHouse) {
      return i + 1;
    }
  }

  return 1;
}

export async function createUserWithChart(
  name: string,
  email: string,
  password: string,
  dateOfBirth: string,
  timeOfBirth: string,
  city: string,
  country: string
) {
  console.log(`\n========== Starting signup for ${email} ==========`);
  console.log(`User: ${name}, DOB: ${dateOfBirth}, Time: ${timeOfBirth}, Location: ${city}, ${country}`);
  
  let normalizedBirthTime: string;
  try {
    normalizedBirthTime = normalizeBirthTime(timeOfBirth);
    console.log(`✓ Birth time normalized to: ${normalizedBirthTime}`);
  } catch (error: any) {
    throw new Error(`Birth time parsing failed: ${error.message || error}`);
  }

  let latitude: number, longitude: number, timezoneOffset: number;
  try {
    const geoData = await geocodeLocation(city, country);
    latitude = geoData.latitude;
    longitude = geoData.longitude;
    
    // Validate and enforce geocoded timezone
    const validatedTimezone = validateGeocodedTimezone(geoData, city);
    timezoneOffset = enforceGeocodedTimezone(validatedTimezone);
    
    if (validatedTimezone.confidence === 'low') {
      throw new Error(
        `Geocoding confidence is LOW for "${city}, ${country}". ` +
        `The location may not have been recognized correctly. ` +
        `Returned coordinates: lat=${latitude}, lng=${longitude}, timezone=${geoData.timezone}. ` +
        `Please verify the city and country names are spelled correctly.`
      );
    }
    
    logTimezoneDebugInfo(geoData, validatedTimezone);
    console.log(`✓ Geocoded location: lat=${latitude}, lng=${longitude}, timezone=${geoData.timezone}, offset=${timezoneOffset}h`);
  } catch (error: any) {
    throw new Error(`Geocoding failed for "${city}, ${country}": ${error.message || error}`);
  }

  const db = await connection.getConnection();

  try {
    await db.beginTransaction();

    const hashedPassword = await bcrypt.hash(password, 10);

    const [userResult]: any = await db.execute(
      'INSERT INTO users (username, email, password, registered) VALUES (?, ?, ?, ?)',
      [name, email, hashedPassword, Math.floor(Date.now() / 1000)]
    );

    const userId = userResult.insertId;

    await db.execute(
      'INSERT INTO user_details (user_id, birthdate, birthtime, birth_city, birth_country) VALUES (?, ?, ?, ?, ?)',
      [userId, dateOfBirth, normalizedBirthTime, city, country]
    );

    let chartData;
    try {
      console.log(`Chart calculation: Birth date=${dateOfBirth}, Birth time=${normalizedBirthTime}, Location=(${latitude}, ${longitude}), Timezone offset=${timezoneOffset}`);
      chartData = calculateSwissEphChart(
        dateOfBirth,
        normalizedBirthTime,
        latitude,
        longitude,
        timezoneOffset
      );
      console.log('Swiss Ephemeris calculation completed successfully');
    } catch (error: any) {
      await db.rollback();
      db.release();
      throw new Error(`Swiss Ephemeris calculation failed: ${error.message || error}`);
    }

    const houseCusps = chartData.houses.houses;
    const chartPointsToInsert: ChartPoint[] = [];

    Object.entries(chartData.planets).forEach(([planetName, planetData]) => {
      const housePosition = calculateHousePosition(planetData.longitude, houseCusps);
      console.log(`Debug: Processing planet '${planetName}' with sign '${planetData.sign}' at longitude ${planetData.longitude}`);
      
      chartPointsToInsert.push({
        user_id: userId,
        name: planetName,
        longitude: planetData.longitude,
        latitude,
        sign: planetData.sign,
        house: housePosition,
        degree: planetData.degree,
        minute: planetData.minute,
        second: planetData.second,
        planet_type: ['northNode'].includes(planetName)
          ? 'point'
          : ['chiron'].includes(planetName)
          ? 'asteroid'
          : 'planet',
      });
    });

    (['ascendant', 'midheaven'] as const).forEach((point) => {
      const pointData = chartData.houses[point];
      const housePosition = calculateHousePosition(pointData.longitude, houseCusps);
      console.log(`Debug: Processing house point '${point}' with sign '${pointData.sign}' at longitude ${pointData.longitude}`);
      
      chartPointsToInsert.push({
        user_id: userId,
        name: point,
        longitude: pointData.longitude,
        latitude,
        sign: pointData.sign,
        house: housePosition,
        degree: pointData.degree,
        minute: pointData.minute,
        second: pointData.second,
        planet_type: 'point',
      });
    });

    for (const chartPoint of chartPointsToInsert) {
      await db.execute(
        `INSERT INTO user_chart 
         (user_id, planet_name, longitude, latitude, sign, house, degree, minute, second, planet_type) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          chartPoint.user_id,
          chartPoint.name,
          chartPoint.longitude,
          chartPoint.latitude,
          chartPoint.sign,
          chartPoint.house,
          chartPoint.degree,
          chartPoint.minute,
          chartPoint.second,
          chartPoint.planet_type,
        ]
      );
    }

    console.log(`✓ User chart created successfully with ${chartPointsToInsert.length} chart points`);

    await db.commit();
    console.log(`✓ Signup completed successfully for ${email} (user_id=${userId})`);
    console.log(`========== End signup ==========\n`);
    return userId;
  } catch (error) {
    await db.rollback();
    throw error;
  } finally {
    db.release();
  }
}

export async function getUserChart(userId: number): Promise<ChartPoint[]> {
  const [rows]: any = await connection.execute(
    `SELECT planet_name AS name, longitude, latitude, sign, house, degree, minute, second, planet_type
     FROM user_chart
     WHERE user_id = ?`,
    [userId]
  );

  return rows.map((row: any) => ({
    name: row.name,
    longitude: row.longitude,
    latitude: row.latitude,
    sign: row.sign,
    house: row.house,
    degree: row.degree,
    minute: row.minute,
    second: row.second,
    planet_type: row.planet_type,
  }));
}