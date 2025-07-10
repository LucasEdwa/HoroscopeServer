import { ChartPoint } from '../interfaces/aiInterface';

export function formatChartForAI(chartPoints: ChartPoint[]): string {
  if (!chartPoints || chartPoints.length === 0) {
    return 'No chart data available.';
  }

  let formatted = '';
  
  // Group by planet type for better organization
  const planets = chartPoints.filter(p => p.planet_type === 'planet');
  const houses = chartPoints.filter(p => p.planet_type === 'house');
  const aspects = chartPoints.filter(p => p.planet_type === 'aspect');

  if (planets.length > 0) {
    formatted += 'PLANETARY POSITIONS:\n';
    planets.forEach(planet => {
      formatted += `- ${planet.name}: ${planet.sign} ${planet.degree}°${planet.minute}' (House ${planet.house || 'N/A'})\n`;
    });
    formatted += '\n';
  }

  if (houses.length > 0) {
    formatted += 'HOUSE CUSPS:\n';
    houses.forEach(house => {
      formatted += `- ${house.name}: ${house.sign} ${house.degree}°${house.minute}'\n`;
    });
    formatted += '\n';
  }

  if (aspects.length > 0) {
    formatted += 'MAJOR ASPECTS:\n';
    aspects.forEach(aspect => {
      formatted += `- ${aspect.name}\n`;
    });
  }

  return formatted;
}

export function getMoonPhase(moonLongitude: number, sunLongitude: number): string {
  const angleDiff = ((moonLongitude - sunLongitude + 360) % 360);
  
  if (angleDiff < 45) return 'New Moon';
  if (angleDiff < 90) return 'Waxing Crescent';
  if (angleDiff < 135) return 'First Quarter';
  if (angleDiff < 180) return 'Waxing Gibbous';
  if (angleDiff < 225) return 'Full Moon';
  if (angleDiff < 270) return 'Waning Gibbous';
  if (angleDiff < 315) return 'Last Quarter';
  return 'Waning Crescent';
}

export function getAspectName(angle: number): string | null {
  const aspects = [
    { name: 'Conjunction', angle: 0, orb: 8 },
    { name: 'Sextile', angle: 60, orb: 6 },
    { name: 'Square', angle: 90, orb: 8 },
    { name: 'Trine', angle: 120, orb: 8 },
    { name: 'Opposition', angle: 180, orb: 8 }
  ];
  
  for (const aspect of aspects) {
    if (Math.abs(angle - aspect.angle) <= aspect.orb) {
      return aspect.name;
    }
  }
  
  return null;
}
