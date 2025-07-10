import { connection } from "../database/connection";
import { ChartPoint as UserChartPoint } from "../interfaces/userInterface";
import { transformDbRowToChartPoint } from "../services/chartDataProcessor";

/**
 * Clear existing chart data for a user
 */
export async function clearUserChart(userId: number): Promise<void> {
  await connection.execute("DELETE FROM user_chart WHERE user_id = ?", [userId]);
}

/**
 * Insert a single chart point into the database
 */
export async function insertChartPoint(chartPoint: UserChartPoint): Promise<void> {
  await connection.execute(
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

/**
 * Insert multiple chart points in batch
 */
export async function insertChartPoints(chartPoints: UserChartPoint[]): Promise<void> {
  for (const chartPoint of chartPoints) {
    await insertChartPoint(chartPoint);
  }
}

/**
 * Get chart points count for a user
 */
export async function getChartPointsCount(userId: number): Promise<number> {
  const [rows]: any[] = await connection.execute(
    "SELECT COUNT(*) as count FROM user_chart WHERE user_id = ?",
    [userId]
  );
  return rows[0].count;
}

/**
 * Get all chart points for a user
 */
export async function getChartPointsByUserId(userId: number): Promise<UserChartPoint[]> {
  const [rows]: any[] = await connection.execute(
    "SELECT * FROM user_chart WHERE user_id = ?",
    [userId]
  );
  
  return rows.map(transformDbRowToChartPoint);
}
