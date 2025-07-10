// src/utils/performanceOptimizations.ts

import { getUserChartPoints } from '../services/swissephService';
import { connection } from '../database/connection';

/**
 * In-memory cache for user chart points (per session).
 * For production, consider Redis or another distributed cache.
 */
const chartCache: Map<string, any> = new Map();

/**
 * Get chart points with in-memory caching.
 * @param email User's email
 * @returns Chart points array
 */
export async function getCachedUserChartPoints(email: string) {
  if (chartCache.has(email)) {
    return chartCache.get(email);
  }
  const chartPoints = await getUserChartPoints(email);
  chartCache.set(email, chartPoints);
  return chartPoints;
}

/**
 * Clear the in-memory chart cache for a user or all users.
 * @param email Optional user email to clear specific cache
 */
export function clearChartCache(email?: string) {
  if (email) {
    chartCache.delete(email);
  } else {
    chartCache.clear();
  }
}

/**
 * Pre-warm the cache for all users with chart data.
 * Useful after server restart or for heavy-traffic endpoints.
 */
export async function prewarmChartCache() {
  const [rows]: any[] = await connection.execute('SELECT email FROM users');
  for (const row of rows) {
    await getCachedUserChartPoints(row.email);
  }
}

/**
 * Utility to measure execution time of a function.
 */
export async function measurePerformance<T>(fn: () => Promise<T>, label: string): Promise<T> {
  const start = process.hrtime.bigint();
  const result = await fn();
  const end = process.hrtime.bigint();
  console.log(`[PERF] ${label}: ${(Number(end - start) / 1e6).toFixed(2)} ms`);
  return result;
}