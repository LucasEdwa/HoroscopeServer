import { calculateSwissEphChart } from "../hooks/swissephHook";
import { getUserBirthData } from "./userService";
import { connection } from "../database/connection";
import { geocodeLocation } from "./geocodingService";
import { ChartPoint as UserChartPoint } from "../interfaces/userInterface";
import { getCachedUserChartPoints } from "../utils/performanceOptimizations";

/**
 * Calculate which house a planet is in based on longitude and house cusps
 */
function calculateHousePosition(
  planetLongitude: number,
  houseCusps: number[]
): number {
  const normalizedLon = ((planetLongitude % 360) + 360) % 360;

  for (let i = 0; i < 12; i++) {
    const currentHouse = houseCusps[i];
    const nextHouse = houseCusps[(i + 1) % 12];

    if (nextHouse > currentHouse) {
      if (normalizedLon >= currentHouse && normalizedLon < nextHouse)
        return i + 1;
    } else if (normalizedLon >= currentHouse || normalizedLon < nextHouse) {
      return i + 1;
    }
  }

  return 1; // Default to first house if calculation fails
}


/**
 * Calculate and save user's complete astrological chart
 */
export async function calculateAndSaveUserChart(
  email: string
): Promise<boolean> {
  const userData = await getUserBirthData(email);
  if (!userData) throw new Error("User birth data not found");

  const { user_id, birthdate, birthtime, birth_city, birth_country } = userData;

  if (!birthdate || !birthtime || !birth_city || !birth_country) {
    throw new Error("Invalid input data for Swiss Ephemeris calculations");
  }

  const { latitude, longitude, timezone, timezoneOffset } = await geocodeLocation(
    birth_city,
    birth_country
  );

  if (latitude === undefined || longitude === undefined) {
    throw new Error("Unable to geocode location");
  }

  const chartData = calculateSwissEphChart(
    birthdate,
    birthtime,
    latitude,
    longitude,
    timezoneOffset // Pass timezone offset to chart calculation
  );
  await connection.execute("DELETE FROM user_chart WHERE user_id = ?", [
    user_id,
  ]);

  const chartPointsToInsert: UserChartPoint[] = [];
  const houseCusps = chartData.houses.houses;

  Object.entries(chartData.planets).forEach(([planetName, planetData]) => {
    const housePosition = calculateHousePosition(
      planetData.longitude,
      houseCusps
    );
    
    console.log(`Debug: Processing planet '${planetName}' with sign '${planetData.sign}' at longitude ${planetData.longitude}`);
    
    chartPointsToInsert.push({
      user_id,
      name: planetName,
      longitude: planetData.longitude,
      latitude: latitude,
      sign: planetData.sign,
      house: housePosition,
      degree: planetData.degree,
      minute: planetData.minute,
      second: planetData.second,
      planet_type: ["northNode"].includes(planetName)
        ? "point"
        : ["chiron"].includes(planetName)
        ? "asteroid"
        : "planet",
    });
  });

  (["ascendant", "midheaven"] as const).forEach((point) => {
    const housePosition = calculateHousePosition(
      chartData.houses[point].longitude,
      houseCusps
    );
    
    console.log(`Debug: Processing house point '${point}' with sign '${chartData.houses[point].sign}' at longitude ${chartData.houses[point].longitude}`);
    
    chartPointsToInsert.push({
      user_id,
      name: point,
      longitude: chartData.houses[point].longitude,
      latitude: latitude,
      sign: chartData.houses[point].sign,
      house: housePosition,
      degree: chartData.houses[point].degree,
      minute: chartData.houses[point].minute,
      second: chartData.houses[point].second,
      planet_type: "point",
    });
  });

  for (const chartPoint of chartPointsToInsert) {
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

  return true;
}

/**
 * Get user's chart points as array (optimized for GraphQL)
 */
export async function getUserChartPoints(
  email: string
): Promise<UserChartPoint[]> {
  // Use the cached version for performance
  return getCachedUserChartPoints(email);
}
