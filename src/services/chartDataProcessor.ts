import { ChartPoint as UserChartPoint } from "../interfaces/userInterface";
import { calculateHousePosition, getPlanetType } from "../utils/astrology/astrologyCalculations";

/**
 * Process planets data into UserChartPoint format
 */
export function processPlanetsData(
  planets: Record<string, any>,
  houseCusps: number[],
  userId: number,
  latitude: number
): UserChartPoint[] {
  const chartPoints: UserChartPoint[] = [];

  Object.entries(planets).forEach(([planetName, planetData]) => {
    const housePosition = calculateHousePosition(planetData.longitude, houseCusps);
    
    chartPoints.push({
      user_id: userId,
      name: planetName,
      longitude: planetData.longitude,
      latitude: latitude,
      sign: planetData.sign,
      house: housePosition,
      degree: planetData.degree,
      minute: planetData.minute,
      second: planetData.second,
      planet_type: getPlanetType(planetName),
    });
  });

  return chartPoints;
}

/**
 * Process houses data (ascendant, midheaven) into UserChartPoint format
 */
export function processHousesData(
  houses: { ascendant: any; midheaven: any },
  houseCusps: number[],
  userId: number,
  latitude: number
): UserChartPoint[] {
  const chartPoints: UserChartPoint[] = [];

  (["ascendant", "midheaven"] as const).forEach((point) => {
    const housePosition = calculateHousePosition(houses[point].longitude, houseCusps);
    
    chartPoints.push({
      user_id: userId,
      name: point,
      longitude: houses[point].longitude,
      latitude: latitude,
      sign: houses[point].sign,
      house: housePosition,
      degree: houses[point].degree,
      minute: houses[point].minute,
      second: houses[point].second,
      planet_type: "point",
    });
  });

  return chartPoints;
}

/**
 * Transform database row to UserChartPoint
 */
export function transformDbRowToChartPoint(row: any): UserChartPoint {
  return {
    user_id: row.user_id,
    name: row.planet_name,
    longitude: row.longitude,
    latitude: row.latitude,
    sign: row.sign,
    house: row.house,
    degree: row.degree,
    minute: row.minute,
    second: row.second,
    planet_type: row.planet_type,
  };
}
