/// <reference path="../../types/express/index.d.ts" />
import bcrypt from 'bcryptjs';
import { connection } from '../database/connection';
import { getFullChartPointsWithSwisseph } from './fullChartPointsController';
import { UserDatabase } from '../models/UserDatabase';


// GraphQL Signup
type SignupArgs = {
  name: string;
  email: string;
  password: string;
  dateOfBirth: string;
  timeOfBirth: string;
  city: string;
  country: string;
};

export const signupUser = async ({
  name,
  email,
  password,
  dateOfBirth,
  timeOfBirth,
  city,
  country,
}: SignupArgs) => {
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const registered = Math.floor(Date.now() / 1000); // Unix timestamp in seconds
    const [userResult]: any = await connection.execute(
      `INSERT INTO users (username, email, password, registered) VALUES (?, ?, ?, ?)`,
      [name, email, hashedPassword, registered]
    );
    const userId = userResult.insertId;
    await connection.execute(
      `INSERT INTO user_details (user_id, birthdate, birthtime, birth_city, birth_country) VALUES (?, ?, ?, ?, ?)`,
      [userId, dateOfBirth, timeOfBirth, city, country]
    );
    return { success: true, message: 'User created successfully!' };
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') {
      return { success: false, message: 'Email already exists.' };
    }
    return { success: false, message: error.message || 'Internal server error' };
  }
};

type SigninArgs = {
  email: string;
  password: string;
};

const userDatabase = new UserDatabase(connection);

export const signinUser = async ({
  email,
  password,
}: SigninArgs) => {
  try {
    const [rows]: any = await connection.execute(
      'SELECT * FROM users WHERE email = ? LIMIT 1',
      [email]
    );
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return { success: false, message: 'Invalid credentials', email: null };
    }
    await userDatabase.updateLastLogin(user.id);
    return { success: true, message: 'Sign in successful!', email: user.email };
  } catch (error: any) {
    return { success: false, message: error.message || 'Internal server error', email: null };
  }
};

// GraphQL resolver for user details by email, including chart points
export const getUserDetails = async ({ email }: { email: string }) => {
  const [rows]: any = await connection.execute(
    `SELECT u.id, u.email, u.username, ud.birthdate, ud.birthtime, ud.birth_city, ud.birth_country
     FROM users u
     LEFT JOIN user_details ud ON u.id = ud.user_id
     WHERE u.email = ? LIMIT 1`,
    [email]
  );
  if (!Array.isArray(rows) || rows.length === 0) return null;
  const user = rows[0];

  // Fetch all sign descriptions and build a map
  let signDescriptions: Record<string, string> = {};
  try {
    const [signRows]: any = await connection.execute(
      `SELECT name, description FROM signs`
    );
    for (const row of signRows) {
      signDescriptions[row.name?.toLowerCase()] = row.description;
    }
  } catch (e) {
    // fallback: leave signDescriptions empty
  }

  // Fetch chart points using fullChartPointsController
  let chartPoints: any[] = [];
  try {
    const rawPoints = await getFullChartPointsWithSwisseph(email);
    chartPoints = rawPoints.map((point: any) => ({
      pointType: point.type || point.pointType || null, 
      sign: point.sign,
      house: point.house,
      description: point.sign
        ? signDescriptions[point.sign.toLowerCase()] || null
        : null,
    }));
  } catch (e) {
    chartPoints = [];
  }

  return {
    id: user.id,
    email: user.email,
    username: user.username,
    birthdate: user.birthdate instanceof Date
      ? user.birthdate.toISOString().slice(0, 10)
      : user.birthdate,
    birthtime: user.birthtime,
    birth_city: user.birth_city,
    birth_country: user.birth_country,
    chartPoints,
  };
};