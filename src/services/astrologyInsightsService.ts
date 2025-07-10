import { getAllPlanets, dateToJulian } from '../hooks/swissephHook';
import { getAspectName, getMoonPhase } from '../utils/chartFormatters';

export async function getCurrentPlanetsAdvanced(): Promise<string> {
  try {
    const now = new Date();
    const julianDay = dateToJulian(now);
    const planets = getAllPlanets(julianDay);

    let formatted = 'CURRENT PLANETARY POSITIONS:\n';
    
    Object.entries(planets).forEach(([planetName, position]) => {
      const name = planetName.charAt(0).toUpperCase() + planetName.slice(1);
      formatted += `- ${name}: ${position.sign} ${position.degree}°${position.minute}'\n`;
    });

    return formatted;
  } catch (error) {
    console.error('Error getting advanced planetary positions:', error);
    return 'Current planetary positions unavailable';
  }
}

export async function getAstrologicalAspects(): Promise<string> {
  try {
    const now = new Date();
    const julianDay = dateToJulian(now);
    const planets = getAllPlanets(julianDay);
    
    let aspects = 'MAJOR CURRENT ASPECTS:\n';
    
    // Calculate major aspects between planets
    const planetList = Object.entries(planets);
    
    for (let i = 0; i < planetList.length; i++) {
      for (let j = i + 1; j < planetList.length; j++) {
        const [planet1Name, planet1] = planetList[i];
        const [planet2Name, planet2] = planetList[j];
        
        const angle = Math.abs(planet1.longitude - planet2.longitude);
        const normalizedAngle = angle > 180 ? 360 - angle : angle;
        
        // Check for major aspects (allowing 5-degree orb)
        const aspectName = getAspectName(normalizedAngle);
        if (aspectName) {
          aspects += `- ${planet1Name.charAt(0).toUpperCase() + planet1Name.slice(1)} ${aspectName} ${planet2Name.charAt(0).toUpperCase() + planet2Name.slice(1)}\n`;
        }
      }
    }
    
    return aspects;
  } catch (error) {
    console.error('Error calculating aspects:', error);
    return 'Astrological aspects unavailable';
  }
}

export async function getDailyAstrologyInsights(): Promise<string> {
  try {
    const planets = await getCurrentPlanetsAdvanced();
    const aspects = await getAstrologicalAspects();
    const now = new Date();
    const julianDay = dateToJulian(now);
    
    // Get moon phase
    const moonPosition = getAllPlanets(julianDay).moon;
    const sunPosition = getAllPlanets(julianDay).sun;
    const moonPhase = getMoonPhase(moonPosition.longitude, sunPosition.longitude);
    
    return `
${planets}

${aspects}

LUNAR INFORMATION:
- Moon Phase: ${moonPhase}
- Moon Sign: ${moonPosition.sign} ${moonPosition.degree}°${moonPosition.minute}'

DATE: ${now.toDateString()}
`;
  } catch (error) {
    console.error('Error getting daily astrology insights:', error);
    return 'Daily astrological insights unavailable';
  }
}
