import { calculateSwissEphChart } from '../hooks/swissephHook';
import { getUserBirthData } from './userService';
import { connection } from '../database/connection';
import { geocodeLocation } from './geocodingService';
import { ChartPoint as UserChartPoint } from '../interfaces/userInterface';

/**
 * Calculate which house a planet is in based on longitude and house cusps
 */
function calculateHousePosition(planetLongitude: number, houseCusps: number[]): number {
  const normalizedLon = ((planetLongitude % 360) + 360) % 360;

  for (let i = 0; i < 12; i++) {
    const currentHouse = houseCusps[i];
    const nextHouse = houseCusps[(i + 1) % 12];

    if (nextHouse > currentHouse) {
      if (normalizedLon >= currentHouse && normalizedLon < nextHouse) return i + 1;
    } else if (normalizedLon >= currentHouse || normalizedLon < nextHouse) {
      return i + 1;
    }
  }

  return 1; // Default to first house if calculation fails
}

/**
 * Calculate and save user's complete astrological chart
 */
export async function calculateAndSaveUserChart(email: string): Promise<boolean> {
  const userData = await getUserBirthData(email);
  if (!userData) throw new Error('User birth data not found');

  const { user_id, birthdate, birthtime, birth_city, birth_country } = userData;
  
  if (!birthdate || !birthtime || !birth_city || !birth_country) {
    throw new Error('Invalid input data for Swiss Ephemeris calculations');
  }

  const { latitude, longitude } = await geocodeLocation(birth_city, birth_country);

  if (latitude === undefined || longitude === undefined) {
    throw new Error('Unable to geocode location');
  }

  const chartData = calculateSwissEphChart(birthdate, birthtime, latitude, longitude);
  await connection.execute('DELETE FROM user_chart WHERE user_id = ?', [user_id]);

  const chartPointsToInsert: UserChartPoint[] = [];
  const houseCusps = chartData.houses.houses;

  Object.entries(chartData.planets).forEach(([planetName, planetData]) => {
    const housePosition = calculateHousePosition(planetData.longitude, houseCusps);
    chartPointsToInsert.push({
      user_id,
      planet_name: planetName,
      longitude: planetData.longitude,
      latitude: latitude,
      sign: planetData.sign,
      house: housePosition,
      degree: planetData.degree,
      minute: planetData.minute,
      second: planetData.second,
      planet_type: ['northNode'].includes(planetName) ? 'point' : 
                  ['chiron'].includes(planetName) ? 'asteroid' : 'planet',
    });
  });

  (['ascendant', 'midheaven'] as const).forEach((point) => {
    const housePosition = calculateHousePosition(chartData.houses[point].longitude, houseCusps);
    chartPointsToInsert.push({
      user_id,
      planet_name: point,
      longitude: chartData.houses[point].longitude,
      latitude: latitude,
      sign: chartData.houses[point].sign,
      house: housePosition,
      degree: chartData.houses[point].degree,
      minute: chartData.houses[point].minute,
      second: chartData.houses[point].second,
      planet_type: 'point',
    });
  });

  for (const chartPoint of chartPointsToInsert) {
    await connection.execute(
      `INSERT INTO user_chart 
       (user_id, planet_name, longitude, latitude, sign, house, degree, minute, second, planet_type) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        chartPoint.user_id,
        chartPoint.planet_name,
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

  return true;
}

/**
 * Get user's chart points as array (optimized for GraphQL)
 */
export async function getUserChartPoints(email: string): Promise<UserChartPoint[]> {
  console.log('Debug: Getting chart points for email:', email);
  
  const userData = await getUserBirthData(email);
  if (!userData) {
    console.log('Debug: No user data found');
    return [];
  }

  console.log('Debug: User data found:', {
    user_id: userData.user_id,
    email: userData.email,
    birthdate: userData.birthdate,
    birthtime: userData.birthtime,
    birth_city: userData.birth_city,
    birth_country: userData.birth_country
  });

  // Check if user has any existing chart data first
  const [allChartRows]: any[] = await connection.execute(
    'SELECT COUNT(*) as count FROM user_chart WHERE user_id = ?',
    [userData.user_id]
  );
  
  console.log('Debug: Total chart records in DB for user:', allChartRows[0].count);

  // If user already has chart data, return it directly
  if (allChartRows[0].count > 0) {
    const [rows]: any[] = await connection.execute(
      'SELECT * FROM user_chart WHERE user_id = ?',
      [userData.user_id]
    );

    console.log('Debug: Returning existing chart data, rows found:', rows.length);
    
    return rows.map((row: any) => ({
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
  }

  // If no chart data exists, try to calculate it if birth data is available
  if (userData.birthdate && userData.birthtime && userData.birth_city && userData.birth_country) {
    console.log('Debug: Birth data available, calculating chart...');
    try {
      await calculateAndSaveUserChart(email);
      
      // Fetch the newly created chart data
      const [newRows]: any[] = await connection.execute(
        'SELECT * FROM user_chart WHERE user_id = ?',
        [userData.user_id]
      );

      console.log('Debug: Chart calculated and saved, new rows:', newRows.length);
      
      return newRows.map((row: any) => ({
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
    } catch (error) {
      console.error('Error calculating chart:', error);
      return [];
    }
  } else {
    console.log('Debug: Missing birth data - birthdate:', !!userData.birthdate, 
                'birthtime:', !!userData.birthtime, 
                'birth_city:', !!userData.birth_city, 
                'birth_country:', !!userData.birth_country);
    return [];
  }
}