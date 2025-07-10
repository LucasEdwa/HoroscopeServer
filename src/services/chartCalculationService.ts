import { calculateSwissEphChart } from "../hooks/swissephHook";
import { getUserBirthData } from "./userService";
import { geocodeLocation } from "./geocodingService";
import { ChartPoint as UserChartPoint } from "../interfaces/userInterface";
import { processPlanetsData, processHousesData } from "./chartDataProcessor";
import { clearUserChart, insertChartPoints } from "../repositories/chartRepository";

/**
 * Calculate and save user's complete astrological chart
 */
export async function calculateAndSaveUserChart(email: string): Promise<boolean> {
  const userData = await getUserBirthData(email);
  if (!userData) throw new Error("User birth data not found");

  const { user_id, birthdate, birthtime, birth_city, birth_country } = userData;

  if (!birthdate || !birthtime || !birth_city || !birth_country) {
    throw new Error("Invalid input data for Swiss Ephemeris calculations");
  }

  const { latitude, longitude } = await geocodeLocation(birth_city, birth_country);

  if (latitude === undefined || longitude === undefined) {
    throw new Error("Unable to geocode location");
  }

  const chartData = calculateSwissEphChart(birthdate, birthtime, latitude, longitude);
  
  // Clear existing chart data
  await clearUserChart(user_id);

  const houseCusps = chartData.houses.houses;
  
  // Process planets data
  const planetChartPoints = processPlanetsData(
    chartData.planets,
    houseCusps,
    user_id,
    latitude
  );
  
  // Process houses data (ascendant, midheaven)
  const houseChartPoints = processHousesData(
    chartData.houses,
    houseCusps,
    user_id,
    latitude
  );

  // Combine and insert all chart points
  const allChartPoints = [...planetChartPoints, ...houseChartPoints];
  await insertChartPoints(allChartPoints);

  return true;
}
