import bcrypt from 'bcrypt';
import { connection } from '../database/connection';
import { calculateAndSaveUserChart } from './swissephService';
import { User, UserBirthData, ChartPoint } from '../interfaces/userInterface';

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
    [userId, dateOfBirth, timeOfBirth, city, country]
  );

  return userId;
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