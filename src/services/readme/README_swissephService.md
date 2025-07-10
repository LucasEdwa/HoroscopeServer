# Swiss Ephemeris Service Documentation

## Overview

The `swissephService.ts` is the core astrological calculation engine that handles all chart computations using the Swiss Ephemeris library. This service manages planetary positions, house systems, and persistent chart storage for the Oracle system.

## 🌟 Core Functions

### `calculateAndSaveUserChart(email: string): Promise<boolean>`

**Purpose**: Main chart calculation function that computes and persists a complete astrological chart.

**Process Flow:**
1. **Data Validation**: Fetches user birth data via `getUserBirthData()`
2. **Input Validation**: Validates birthdate, birthtime, birth_city, birth_country
3. **Geocoding**: Converts location to coordinates using `geocodeLocation()`
4. **Chart Calculation**: Uses Swiss Ephemeris via `calculateSwissEphChart()`
5. **House Calculation**: Determines house positions for all celestial bodies
6. **Data Processing**: Converts raw chart data to UserChartPoint format
7. **Database Storage**: Saves all chart points to user_chart table

**Parameters:**
- `email` (string): User's email address for identification

**Returns:**
- `boolean`: Success status of chart calculation and storage

**Validation Requirements:**
```typescript
if (!birthdate || !birthtime || !birth_city || !birth_country) {
  throw new Error("Invalid input data for Swiss Ephemeris calculations");
}
```

**Chart Data Calculated:**
- 🪐 **10 Major Planets**: Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto
- 🌟 **Lunar Nodes**: North Node (True Node)
- ☄️ **Asteroids**: Chiron
- 🏠 **House Points**: Ascendant, Midheaven
- 🏠 **12 House System**: Complete Placidus house cusps

**Usage Example:**
```typescript
try {
  const success = await calculateAndSaveUserChart('user@example.com');
  if (success) {
    console.log('Complete astrological chart calculated and saved');
    // Chart includes: 10 planets + North Node + Chiron + Ascendant + Midheaven = 14 points
  }
} catch (error) {
  console.error('Chart calculation failed:', error.message);
}
```

**Database Operations:**
```sql
-- Clears existing chart to prevent duplicates
DELETE FROM user_chart WHERE user_id = ?

-- Inserts each calculated chart point
INSERT INTO user_chart 
(user_id, planet_name, longitude, latitude, sign, house, degree, minute, second, planet_type) 
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
```

### `getUserChartPoints(email: string): Promise<UserChartPoint[]>`

**Purpose**: Optimized chart retrieval function with intelligent caching and auto-calculation.

**Smart Caching Algorithm:**
1. **Existence Check**: Queries database for existing chart data
2. **Cache Hit**: Returns existing chart if found (performance optimization)
3. **Cache Miss**: Auto-calculates chart if birth data is complete
4. **Graceful Degradation**: Returns empty array if no birth data available

**Parameters:**
- `email` (string): User's email address

**Returns:**
- `UserChartPoint[]`: Array of calculated chart points with metadata

**Performance Features:**
- **Fast Path**: Immediate return for cached charts
- **Lazy Loading**: Chart calculation only when needed
- **Existence Optimization**: COUNT query before full retrieval
- **Debug Logging**: Comprehensive operation tracking

**Debug Output:**
```typescript
console.log("Debug: Getting chart points for email:", email);
console.log("Debug: User data found:", userData);
console.log("Debug: Total chart records in DB:", recordCount);
console.log("Debug: Chart calculated and saved, new rows:", newRows.length);
```

**Usage Scenarios:**
```typescript
// Scenario 1: Chart exists (fast path)
const existingChart = await getUserChartPoints('user@example.com');
// Returns immediately from database

// Scenario 2: No chart, has birth data (auto-calculate)
const newChart = await getUserChartPoints('newuser@example.com');
// Calculates chart first, then returns

// Scenario 3: No birth data (graceful degradation)
const emptyChart = await getUserChartPoints('incomplete@example.com');
// Returns [] without errors
```

## 🧮 Internal Calculation Functions

### `calculateHousePosition(planetLongitude: number, houseCusps: number[]): number`

**Purpose**: Determines which astrological house (1-12) a celestial body occupies.

**Algorithm Details:**
```typescript
// 1. Normalize longitude to 0-360° range
const normalizedLon = ((planetLongitude % 360) + 360) % 360;

// 2. Compare with house cusp positions
for (let i = 0; i < 12; i++) {
  const currentHouse = houseCusps[i];
  const nextHouse = houseCusps[(i + 1) % 12];
  
  // 3. Handle boundary cases (houses crossing 0°/360°)
  if (nextHouse > currentHouse) {
    if (normalizedLon >= currentHouse && normalizedLon < nextHouse)
      return i + 1;
  } else if (normalizedLon >= currentHouse || normalizedLon < nextHouse) {
    return i + 1;
  }
}
```

**Special Cases Handled:**
- **360° Crossing**: Houses that span across 0° Aries
- **High Latitude Births**: Extreme house distortions
- **Intercepted Signs**: Signs contained within houses
- **Calculation Failures**: Default to House 1

**Parameters:**
- `planetLongitude` (number): Planet's ecliptic longitude in degrees
- `houseCusps` (number[]): Array of 12 house cusp positions

**Returns:**
- `number`: House number (1-12)

**Example:**
```typescript
const sunLongitude = 120.5; // Leo 0°30'
const houseCusps = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];
const sunHouse = calculateHousePosition(sunLongitude, houseCusps);
// Returns: 5 (5th House - Leo)
```

## 🎯 Data Structure Definitions

### UserChartPoint Interface

Complete chart point data structure used throughout the Oracle system:

```typescript
interface UserChartPoint {
  user_id: number;          // Database user ID
  name: string;            // Planet/point name ('sun', 'moon', 'mercury', etc.)
  longitude: number;       // Ecliptic longitude (0-360°)
  latitude: number;        // Birth location latitude
  sign: string;           // Zodiac sign ('Aries', 'Taurus', etc.)
  house: number;          // House position (1-12)
  degree: number;         // Degrees within sign (0-29)
  minute: number;         // Arc minutes (0-59)
  second: number;         // Arc seconds (0-59)
  planet_type: 'planet' | 'point' | 'asteroid';
}
```

### Planet Type Classification System

**'planet' Type** (Traditional planetary bodies):
- `sun`, `moon`, `mercury`, `venus`, `mars`, `jupiter`, `saturn`, `uranus`, `neptune`, `pluto`

**'point' Type** (Calculated astronomical points):
- `northNode` - Moon's North Node (Dragon's Head)
- `ascendant` - Rising sign / 1st House cusp
- `midheaven` - 10th House cusp / MC

**'asteroid' Type** (Minor planetary bodies):
- `chiron` - The Wounded Healer asteroid

## 🗄️ Database Integration

### Chart Storage Schema
```sql
CREATE TABLE user_chart (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  planet_name VARCHAR(50) NOT NULL,
  longitude DECIMAL(10,6) NOT NULL,
  latitude DECIMAL(10,6) NOT NULL,
  sign VARCHAR(20) NOT NULL,
  house INT NOT NULL,
  degree INT NOT NULL,
  minute INT NOT NULL,
  second INT NOT NULL,
  planet_type ENUM('planet', 'point', 'asteroid') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### Optimized Query Patterns

**Existence Check** (Performance optimization):
```sql
SELECT COUNT(*) as count FROM user_chart WHERE user_id = ?
-- Fast existence verification before full chart retrieval
```

**Full Chart Retrieval**:
```sql
SELECT * FROM user_chart WHERE user_id = ?
-- Complete chart data for user
```

**Chart Replacement** (Atomic operation):
```sql
DELETE FROM user_chart WHERE user_id = ?;
-- Multiple INSERT statements for new chart points
-- Ensures chart consistency and prevents partial updates
```

## 🔄 Service Integration Architecture

### With User Service Integration:
```typescript
import { getUserBirthData } from "./userService";

// Retrieves complete birth information for calculations
const userData = await getUserBirthData(email);
// Returns: { user_id, username, email, birthdate, birthtime, birth_city, birth_country }
```

### With Geocoding Service Integration:
```typescript
import { geocodeLocation } from "./geocodingService";

// Converts textual location to precise coordinates
const { latitude, longitude } = await geocodeLocation(birth_city, birth_country);
// Essential for accurate house calculations
```

### With Swiss Ephemeris Hook Integration:
```typescript
import { calculateSwissEphChart } from "../hooks/swissephHook";

// Performs core astronomical calculations
const chartData = calculateSwissEphChart(birthdate, birthtime, latitude, longitude);
// Returns complete planetary positions and house system
```

## 🔧 Technical Implementation Details

### Swiss Ephemeris Configuration:
- **Ephemeris Path**: `/Users/lucaseduardo/HoroscopeServer/ephe`
- **Required Files**: `seas_18.se1` (primary ephemeris data)
- **House System**: Placidus (most common Western astrology system)
- **Node Calculation**: True Node (mean node also available)
- **Coordinate System**: Geocentric ecliptic longitude/latitude

### Precision Specifications:
- **Positional Accuracy**: 0.001 arc-second precision
- **Time Resolution**: UTC with leap second handling
- **House Calculation**: Sub-degree accuracy for house cusps
- **Date Range**: 5400 BCE to 5400 CE (Swiss Ephemeris range)

### Coordinate System Details:
```typescript
// Ecliptic Coordinates (planetary positions)
longitude: 0-360°     // 0° = 0° Aries, 90° = 0° Cancer, etc.
latitude: ±90°        // Deviation from ecliptic plane

// Geographic Coordinates (birth location)
latitude: ±90°        // North/South from equator
longitude: ±180°      // East/West from Greenwich meridian

// Zodiacal Coordinates (astrology format)
degree: 0-29          // Degrees within zodiac sign
minute: 0-59          // Arc minutes within degree
second: 0-59          // Arc seconds within minute
```

## 📊 Performance Optimization Strategies

### Database Optimizations:
- **Indexed Queries**: Fast user_id lookups with O(log n) performance
- **Batch Inserts**: Single transaction for complete charts reduces overhead
- **Existence Checks**: COUNT queries before full retrieval prevent unnecessary data transfer
- **Connection Pooling**: Efficient database resource usage with persistent connections

### Calculation Optimizations:
- **Chart Caching**: Multi-level caching system to avoid redundant calculations
  - **Chart Points Cache**: Stores complete user chart data in memory for instant retrieval
  - **Swiss Ephemeris Cache**: Caches raw calculation results by birth data + coordinates
  - **Intelligent Cache Keys**: Uses birth data + location coordinates for precise cache matching
  - **Automatic Expiration**: 24-hour TTL with cleanup of expired entries
  - **Cache Statistics**: Real-time monitoring of hit rates and performance gains
- **Lazy Loading**: Calculate only when requested
- **Bulk Processing**: Process all chart points in single calculation
- **Error Recovery**: Continue calculation if individual planets fail

### Chart Caching Implementation:

#### Cache Architecture:
```typescript
// Two-tier caching system
ChartPointsCache: Map<email, CachedChart>     // User-level chart cache
CalculationCache: Map<cacheKey, ChartData>    // Calculation-level cache

// Cache key generation
const cacheKey = `calc_${birthdate}_${birthtime}_${latitude}_${longitude}`;
const userKey = `chart_points_${email}`;
```

#### Cache Flow:
```
1. getUserChartPoints(email) → Check ChartPointsCache
2. Cache Hit → Return cached chart points immediately
3. Cache Miss → Check database
4. Database Hit → Cache result → Return chart points
5. Database Miss → Check CalculationCache
6. Calculation Cache Hit → Use cached Swiss Ephemeris result
7. Calculation Cache Miss → Calculate with Swiss Ephemeris → Cache result
8. Process and save to database → Cache chart points → Return
```

#### Performance Benefits:
- **Instant Retrieval**: Cached charts return in ~1ms vs ~100ms+ for calculations
- **Reduced Database Load**: Fewer queries to chart tables
- **Swiss Ephemeris Optimization**: Avoid expensive astronomical calculations
- **Memory Efficiency**: LRU eviction prevents memory bloat
- **High Availability**: Graceful degradation during calculation errors

### Memory Management:
- **Object Pooling**: Reuse chart point objects to reduce garbage collection
- **Efficient Data Structures**: Optimized chart point arrays with minimal overhead
- **Automatic Cleanup**: Periodic cache cleanup removes expired entries
- **Memory Monitoring**: Track cache sizes and memory usage patterns

## 🎯 Cache Usage Examples

### Basic Chart Retrieval with Caching:
```typescript
// First call - calculates and caches
const chart1 = await getUserChartPoints('user@example.com');
// Time: ~150ms (calculation + caching)

// Second call - returns from cache
const chart2 = await getUserChartPoints('user@example.com');
// Time: ~1ms (cache hit)

console.log('Charts identical:', JSON.stringify(chart1) === JSON.stringify(chart2));
// Output: Charts identical: true
```

### Cache Statistics Monitoring:
```typescript
import { getChartCacheStats } from '../services/swissephService';

const stats = getChartCacheStats();
console.log('Cache Performance:', {
  chartPointsCache: `${stats.chartPointsCache.size}/${stats.chartPointsCache.maxSize}`,
  calculationCache: `${stats.calculationCache.size}/${stats.calculationCache.maxSize}`,
  hitRates: stats.hitRates
});

// Example output:
// Cache Performance: {
//   chartPointsCache: "245/1000",
//   calculationCache: "189/1000", 
//   hitRates: { chartPoints: 24.5, calculations: 18.9 }
// }
```

### Cache Invalidation:
```typescript
import { ChartCache } from '../utils/chartCaching';

// Invalidate specific user's cache (e.g., after chart recalculation)
ChartCache.invalidateUserCache('user@example.com');

// Clear all caches (e.g., during maintenance)
ChartCache.clearAllCaches();

// Cleanup expired entries manually
ChartCache.cleanupExpiredCaches();
```

## 🎯 Usage Examples & Patterns

### Complete Chart Generation Workflow:
```typescript
// Step 1: Calculate new user's chart
await calculateAndSaveUserChart('newuser@example.com');

// Step 2: Retrieve chart for analysis
const chartPoints = await getUserChartPoints('newuser@example.com');

// Step 3: Analyze chart data
const sunSign = chartPoints.find(p => p.name === 'sun')?.sign;
const moonSign = chartPoints.find(p => p.name === 'moon')?.sign;
const ascendant = chartPoints.find(p => p.name === 'ascendant')?.sign;

console.log(`Big Three: ${sunSign} Sun, ${moonSign} Moon, ${ascendant} Rising`);
```

### Chart Analysis Patterns:
```typescript
const chart = await getUserChartPoints('user@example.com');

// Find planets in specific signs
const fireSignPlanets = chart.filter(p => 
  ['Aries', 'Leo', 'Sagittarius'].includes(p.sign)
);

// Find planets in angular houses (1, 4, 7, 10)
const angularPlanets = chart.filter(p => 
  [1, 4, 7, 10].includes(p.house)
);

// Get specific planetary positions
const venusPosition = chart.find(p => p.name === 'venus');
console.log(`Venus: ${venusPosition.degree}°${venusPosition.minute}' ${venusPosition.sign} in House ${venusPosition.house}`);
```

### Oracle AI Integration:
```typescript
// Chart data formatted for AI analysis
const chartForAI = chartPoints.map(point => ({
  planet: point.name,
  position: `${point.degree}°${point.minute}' ${point.sign}`,
  house: point.house,
  type: point.planet_type
}));

// Used by Oracle AI for personalized readings
```

## 🚀 Future Enhancement Opportunities

### Calculation Enhancements:
- **Multiple House Systems**: Koch, Equal, Whole Sign houses
- **Additional Asteroids**: Ceres, Pallas, Juno, Vesta
- **Arabic Parts**: Part of Fortune, Part of Spirit
- **Fixed Stars**: Conjunction calculations with major stars
- **Aspect Calculations**: Major and minor planetary aspects

### Performance Improvements:
- **Parallel Calculations**: Multi-threaded planet calculations
- **Chart Versioning**: Track chart updates and versions
- **Bulk User Processing**: Batch chart calculations
- **Progressive Enhancement**: Calculate basic chart first, details later

### Advanced Features:
- **Transit Calculations**: Current planetary positions vs natal
- **Progression Calculations**: Secondary progressions and solar arcs
- **Composite Charts**: Relationship compatibility charts
- **Relocation Charts**: Charts for different geographic locations
- **Return Charts**: Solar, lunar, and planetary returns

This optimized documentation provides complete coverage of every function, algorithm, and integration point in the Swiss Ephemeris service, making it easy to understand and maintain the Oracle system's core calculation engine.
