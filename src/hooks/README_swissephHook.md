# SwissEph Hook - Swiss Ephemeris Integration

## Overview

The `swissephHook.ts` is a critical core module that provides the astrological calculation foundation for the entire HoroscopeServer application. It serves as a comprehensive wrapper around the Swiss Ephemeris library, offering precise astronomical calculations for planetary positions, house systems, and astrological chart generation.

## What is Swiss Ephemeris?

Swiss Ephemeris is a high-precision ephemeris developed by Astrodienst, based on the JPL ephemeris DE431. It provides accurate planetary positions for thousands of years and is considered the gold standard for astrological calculations.

## Key Features

### 🌟 Core Astronomical Calculations
- **Planetary Positions**: Calculate precise positions for all major planets and celestial bodies
- **House Systems**: Support for multiple house systems (default: Placidus)
- **Julian Day Conversion**: Accurate date-to-Julian day conversions
- **Zodiac Sign Mapping**: Convert astronomical coordinates to astrological signs

### 🎯 Supported Celestial Bodies
- **Classical Planets**: Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn
- **Modern Planets**: Uranus, Neptune, Pluto
- **Lunar Nodes**: True North Node
- **Asteroids**: Chiron
- **Chart Points**: Ascendant, Midheaven

## Architecture & Dependencies

### Required Files
- **Ephemeris Data**: `seas_18.se1` (and other .se1 files in `/ephe` directory)
- **Path Configuration**: Configurable via `EPHE_PATH` environment variable

### Error Handling
- Comprehensive error handling for all Swiss Ephemeris operations
- Graceful degradation when individual planet calculations fail
- Detailed error logging for debugging

## Core Functions

### 1. `calculatePlanetPosition(julianDay, planetId)`
Calculates the precise longitude of a specific planet at a given Julian Day.

**Parameters:**
- `julianDay` (number): Julian Day Number
- `planetId` (number): Swiss Ephemeris planet identifier

**Returns:** Longitude in degrees (0-360)

### 2. `calculateHouses(julianDay, latitude, longitude, houseSystem?)`
Calculates house cusps and important chart angles.

**Parameters:**
- `julianDay` (number): Julian Day Number
- `latitude` (number): Geographic latitude
- `longitude` (number): Geographic longitude
- `houseSystem` (string, optional): House system ('P' for Placidus, default)

**Returns:** Object with houses array, ascendant, and midheaven

### 3. `dateToJulian(date)`
Converts a JavaScript Date object to Julian Day Number.

**Parameters:**
- `date` (Date): JavaScript Date object

**Returns:** Julian Day Number (decimal)

### 4. `longitudeToSign(longitude)`
Converts astronomical longitude to astrological sign information.

**Parameters:**
- `longitude` (number): Longitude in degrees

**Returns:** ChartPoint object with sign, degree, minute, second

### 5. `getAllPlanets(julianDay)`
Calculates positions for all supported planets and celestial bodies.

**Parameters:**
- `julianDay` (number): Julian Day Number

**Returns:** Record of planet names to ChartPoint objects

### 6. `calculateSwissEphChart(birthdate, birthtime, latitude, longitude)`
**Main Function** - Generates a complete astrological chart.

**Parameters:**
- `birthdate` (string): Birth date in YYYY-MM-DD format
- `birthtime` (string): Birth time in HH:MM format
- `latitude` (number): Birth location latitude
- `longitude` (number): Birth location longitude

**Returns:** Complete chart object with planets, houses, and metadata

## Integration Points

### 1. SwissEph Service (`/services/swissephService.ts`)
**Primary Consumer** - Uses the hook to:
- Calculate and save user birth charts to database
- Retrieve chart data for GraphQL queries
- Manage chart caching and optimization

### 2. AI Chat Utilities (`/utils/ChatOi.ts`)
**Real-time Analysis** - Uses the hook for:
- Current planetary transits analysis
- Astrological aspects calculation
- Daily horoscope generation
- Future predictions based on planetary movements

### 3. Chart Calculation Service (`/services/chartCalculationService.ts`)
**Specialized Calculations** - Extends hook functionality for:
- Advanced chart calculations
- Custom chart configurations
- Performance-optimized chart generation

### 4. Astrology Insights Service (`/services/astrologyInsightsService.ts`)
**Interpretive Analysis** - Uses hook data for:
- Planetary aspect analysis
- Transit calculations
- Astrological interpretation logic

## Data Flow

```
User Birth Data → SwissEph Hook → Database Storage
                      ↓
Current Time → Real-time Calculations → AI Analysis
                      ↓
GraphQL Queries ← Chart Data ← Database
```

## Configuration

### Environment Variables
```bash
EPHE_PATH=/path/to/ephemeris/files 
```

### Required Ephemeris Files
The hook requires Swiss Ephemeris data files in the `/ephe` directory:
- `seas_18.se1` (main file, checked at startup)
- Additional .se1 files for extended date ranges

## Error Handling Strategy

### 1. Initialization Errors
- Validates ephemeris file existence on startup
- Throws initialization errors if required files are missing

### 2. Calculation Errors
- Individual planet calculation failures don't stop the entire process
- Detailed error logging for debugging
- Graceful fallbacks where possible

### 3. Input Validation
- Validates date/time formats
- Checks latitude/longitude ranges
- Ensures required parameters are present

## Performance Considerations

### Optimization Features
- **Single Calculation per Chart**: Calculates all planets in one pass
- **Efficient House Calculations**: Optimized house cusp calculations
- **Error Recovery**: Continues processing even if individual calculations fail
- **Caching Ready**: Results can be cached by consuming services

### Memory Management
- Minimal memory footprint
- No persistent state between calculations
- Clean error handling prevents memory leaks

## Usage Examples

### Basic Planet Position
```typescript
import { calculatePlanetPosition, dateToJulian } from './swissephHook';

const date = new Date('2024-01-01T12:00:00');
const julianDay = dateToJulian(date);
const sunPosition = calculatePlanetPosition(julianDay, swisseph.SE_SUN);
```

### Complete Chart Calculation
```typescript
import { calculateSwissEphChart } from './swissephHook';

const chart = calculateSwissEphChart(
  '1990-05-15',  // birthdate
  '14:30',       // birthtime
  40.7128,       // latitude (NYC)
  -74.0060       // longitude (NYC)
);
```

## Why This Hook is Critical

### 1. **Foundation Layer**
- All astrological functionality depends on this hook
- Provides the mathematical foundation for the entire application
- Ensures calculation accuracy and consistency

### 2. **Data Integrity**
- Swiss Ephemeris provides NASA-grade astronomical accuracy
- Consistent calculations across all application features
- Reliable source of truth for astrological data

### 3. **Scalability**
- Efficient calculation methods support high user loads
- Stateless design enables horizontal scaling
- Optimized for both real-time and batch processing

### 4. **Extensibility**
- Clean interface allows easy addition of new celestial bodies
- Modular design supports new calculation types
- Flexible enough to support different astrological traditions

## Dependencies

### External Libraries
- **swisseph**: Swiss Ephemeris library for astronomical calculations
- **fs**: File system operations for ephemeris file validation
- **path**: Path utilities for file location management

### Internal Dependencies
- **ChartPoint Interface**: Type definitions from `../interfaces/userInterface`

## Testing Considerations

### Validation Points
- Date conversion accuracy
- Planetary position precision
- House calculation correctness
- Error handling robustness

### Test Data Requirements
- Known chart calculations for validation
- Edge cases (leap years, time zones, etc.)
- Error conditions (invalid dates, missing files)

## Maintenance Notes

### Regular Updates
- Swiss Ephemeris data files may need updates for extended date ranges
- Monitor for library updates and astronomical corrections
- Validate calculations against known reference charts

### Monitoring
- Log calculation errors for pattern analysis
- Monitor performance metrics for optimization opportunities
- Track ephemeris file usage and storage requirements

## Future Enhancements

### Potential Additions
- Support for additional house systems
- Fixed star calculations
- Arabic parts and midpoints
- Heliocentric calculations
- Custom ephemeris file support

### Performance Improvements
- Calculation result caching
- Batch calculation optimization
- Parallel processing for multiple charts
- Memory pool management for high-load scenarios

---

**This hook is the astronomical engine that powers the entire HoroscopeServer application, providing the precise calculations needed for accurate astrological analysis and predictions.**
