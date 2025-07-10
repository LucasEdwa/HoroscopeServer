# User Service Documentation

## Overview

The `userService.ts` is the comprehensive user management system that handles authentication, user data operations, birth information storage, and astrological chart integration. This service serves as the primary interface for all user-related operations in the Oracle system and provides seamless integration between user accounts and their astrological profiles.

## 🚀 Core User Data Functions

### `getUserBirthData(email: string): Promise<UserBirthData | null>`

**Purpose**: Retrieves complete birth information for astrological calculations by joining user and user_details tables.

**Database Schema Integration:**
```sql
-- Complex JOIN query for complete birth data
SELECT u.id AS user_id, u.username, u.email, 
       ud.birthdate, ud.birthtime, ud.birth_city, ud.birth_country
FROM users u
LEFT JOIN user_details ud ON u.id = ud.user_id
WHERE u.email = ? LIMIT 1
```

**Data Structure Returned:**
```typescript
interface UserBirthData {
  user_id: number;        // Primary key from users table
  username: string;       // Display name
  email: string;          // User's email address
  birthdate: string | null;    // Birth date (YYYY-MM-DD format)
  birthtime: string | null;    // Birth time (HH:MM:SS format)
  birth_city: string | null;   // Birth city name
  birth_country: string | null; // Birth country name
}
```

**Parameters:**
- `email` (string): User's email address for lookup

**Returns:**
- `UserBirthData | null`: Complete birth information or null if user not found

**Error Handling:**
- Returns `null` for non-existent users (graceful degradation)
- Handles empty result sets safely
- Logs birth data for debugging chart calculations

**Usage Example:**
```typescript
const birthData = await getUserBirthData('user@example.com');
if (birthData) {
  console.log(`User: ${birthData.username}`);
  console.log(`Born: ${birthData.birthdate} at ${birthData.birthtime}`);
  console.log(`Location: ${birthData.birth_city}, ${birthData.birth_country}`);
  
  // Check data completeness for chart calculation
  const canCalculateChart = birthData.birthdate && birthData.birthtime && 
                           birthData.birth_city && birthData.birth_country;
  console.log(`Chart calculation possible: ${canCalculateChart}`);
} else {
  console.log('User not found or no birth data available');
}
```

### `getUserForQuery(email: string): Promise<User | null>`

**Purpose**: Primary function for GraphQL queries that returns complete user profile with integrated astrological chart data.

**Intelligent Chart Management:**
```typescript
// Auto-calculation logic for missing charts
if (userData.birthdate && userData.birthtime && userData.birth_city && userData.birth_country) {
  const [existingChart] = await connection.execute(
    'SELECT COUNT(*) as count FROM user_chart WHERE user_id = ?',
    [userData.user_id]
  );

  if (existingChart[0].count === 0) {
    console.log('No chart found, calculating new chart for user:', userData.email);
    await calculateAndSaveUserChart(email);
  }
}
```

**Complete Data Assembly Process:**
1. **User Validation**: Fetches birth data via `getUserBirthData()`
2. **Chart Existence Check**: Queries for existing astrological chart
3. **Auto-Calculation**: Generates chart if missing and birth data complete
4. **Chart Integration**: Retrieves and formats chart points
5. **Data Assembly**: Combines user info with chart points

**Chart Point Processing:**
```typescript
const chartPoints: ChartPoint[] = chartRows.map((row: any) => ({
  name: row.planet_name,        // Planet/point identifier
  longitude: row.longitude,     // Ecliptic longitude
  latitude: row.latitude,       // Geographic latitude
  sign: row.sign,              // Zodiac sign
  house: row.house,            // Astrological house (1-12)
  degree: row.degree,          // Degrees within sign
  minute: row.minute,          // Arc minutes
  second: row.second,          // Arc seconds
  planet_type: row.planet_type // 'planet', 'point', or 'asteroid'
}));
```

**Parameters:**
- `email` (string): User's email address

**Returns:**
- `User | null`: Complete user object with chart points or null if not found

**Performance Features:**
- **Lazy Chart Calculation**: Charts generated only when needed
- **Existence Optimization**: Fast COUNT query before chart calculation
- **Single Query Assembly**: Efficient chart point retrieval
- **Debug Logging**: Comprehensive operation tracking

**Usage Example:**
```typescript
const user = await getUserForQuery('user@example.com');
if (user) {
  console.log(`User Profile: ${user.username} (${user.email})`);
  console.log(`Birth Info: ${user.birthdate} at ${user.birthtime}`);
  console.log(`Location: ${user.birth_city}, ${user.birth_country}`);
  console.log(`Chart Points: ${user.chartPoints.length} calculated`);
  
  // Analyze chart data
  const sunSign = user.chartPoints.find(p => p.name === 'sun')?.sign;
  const moonSign = user.chartPoints.find(p => p.name === 'moon')?.sign;
  const ascendant = user.chartPoints.find(p => p.name === 'ascendant')?.sign;
  
  console.log(`Big Three: ${sunSign} Sun, ${moonSign} Moon, ${ascendant} Rising`);
}
```

### `getUserByEmail(email: string): Promise<User | null>`

**Purpose**: Simple, efficient user lookup with case-insensitive email matching for authentication and basic user operations.

**Case-Insensitive Implementation:**
```sql
-- Handles email case variations automatically
SELECT * FROM users 
WHERE LOWER(email) = ? 
LIMIT 1
```

**Security Features:**
- **Case Normalization**: Converts email to lowercase for consistent matching
- **SQL Injection Protection**: Parameterized query prevents injection attacks
- **Result Validation**: Properly handles empty result sets
- **Debug Logging**: Tracks user lookup operations

**Parameters:**
- `email` (string): User's email address (case-insensitive)

**Returns:**
- `User | null`: Raw user database record or null if not found

**Authentication Integration:**
```typescript
// Used in authentication flows
const user = await getUserByEmail('USER@EXAMPLE.COM'); // Works with any case
if (user && user.password) {
  const isValidPassword = await bcrypt.compare(inputPassword, user.password);
  // Authentication logic continues...
}
```

**Usage Example:**
```typescript
// Case-insensitive lookup works with any email format
const user1 = await getUserByEmail('user@example.com');
const user2 = await getUserByEmail('USER@EXAMPLE.COM');
const user3 = await getUserByEmail('User@Example.Com');
// All three queries return the same user record

console.log('Debug: Searching for email in database (case-insensitive):', email);
const foundUser = await getUserByEmail(email);
console.log('Debug: User found:', foundUser ? 'Yes' : 'No');
```

## 🔐 Authentication & User Management

### `createUser(...): Promise<number>`

**Purpose**: Complete user registration system with secure password handling and birth data storage.

**Comprehensive Registration Process:**
```typescript
async function createUser(
  name: string,           // Display name
  email: string,          // Email address (unique)
  password: string,       // Plain text password (will be hashed)
  dateOfBirth: string,    // Birth date (YYYY-MM-DD)
  timeOfBirth: string,    // Birth time (HH:MM:SS)
  city: string,          // Birth city
  country: string        // Birth country
): Promise<number>
```

**Security Implementation:**
```typescript
// Password hashing with bcrypt (10 salt rounds)
const hashedPassword = await bcrypt.hash(password, 10);
console.log('Hashed password during user creation:', hashedPassword);

// Secure database insertion
const [userResult] = await connection.execute(
  'INSERT INTO users (username, email, password, registered) VALUES (?, ?, ?, ?)',
  [name, email, hashedPassword, Math.floor(Date.now() / 1000)]
);
```

**Two-Table Architecture:**
```sql
-- Step 1: Create user account
INSERT INTO users (username, email, password, registered) 
VALUES (?, ?, ?, ?)

-- Step 2: Store birth details
INSERT INTO user_details (user_id, birthdate, birthtime, birth_city, birth_country) 
VALUES (?, ?, ?, ?, ?)
```

**Parameters:**
- `name` (string): User's display name
- `email` (string): Unique email address
- `password` (string): Plain text password (automatically hashed)
- `dateOfBirth` (string): Birth date in YYYY-MM-DD format
- `timeOfBirth` (string): Birth time in HH:MM:SS format
- `city` (string): Birth city name
- `country` (string): Birth country name

**Returns:**
- `number`: New user's database ID (auto-generated primary key)

**Security Features:**
- **Password Hashing**: bcrypt with 10 salt rounds for strong security
- **Unique Email Constraint**: Database-level uniqueness enforcement
- **Registration Timestamp**: Unix timestamp for account creation tracking
- **Input Validation**: Should be validated at GraphQL resolver level

**Usage Example:**
```typescript
try {
  const newUserId = await createUser(
    'John Doe',
    'john.doe@example.com',
    'mySecurePassword123',
    '1990-05-15',
    '14:30:00',
    'New York',
    'USA'
  );
  
  console.log(`New user created with ID: ${newUserId}`);
  
  // Chart calculation can be triggered after user creation
  await calculateAndSaveUserChart('john.doe@example.com');
  
} catch (error) {
  if (error.code === 'ER_DUP_ENTRY') {
    console.error('Email address already exists');
  } else {
    console.error('User creation failed:', error.message);
  }
}
```

### `getUserChart(userId: number): Promise<ChartPoint[]>`

**Purpose**: Direct chart retrieval function using user ID for internal service operations.

**Optimized Chart Query:**
```sql
-- Efficient chart retrieval with column aliasing
SELECT planet_name AS name, longitude, latitude, sign, house, 
       degree, minute, second, planet_type
FROM user_chart
WHERE user_id = ?
```

**Data Transformation:**
```typescript
// Maps database rows to ChartPoint interface
return rows.map((row: any) => ({
  name: row.name,              // Planet/point name
  longitude: row.longitude,    // Ecliptic longitude
  latitude: row.latitude,      // Geographic latitude
  sign: row.sign,             // Zodiac sign
  house: row.house,           // Astrological house
  degree: row.degree,         // Degrees within sign
  minute: row.minute,         // Arc minutes
  second: row.second,         // Arc seconds
  planet_type: row.planet_type // Classification
}));
```

**Parameters:**
- `userId` (number): User's database ID (primary key)

**Returns:**
- `ChartPoint[]`: Array of astrological chart points

**Internal Usage:**
```typescript
// Used internally when user ID is already known
const userChart = await getUserChart(123);

// Chart analysis examples
const fireSignPlanets = userChart.filter(point => 
  ['Aries', 'Leo', 'Sagittarius'].includes(point.sign)
);

const angularHousePlanets = userChart.filter(point => 
  [1, 4, 7, 10].includes(point.house)
);

console.log(`Fire sign planets: ${fireSignPlanets.length}`);
console.log(`Angular house planets: ${angularHousePlanets.length}`);
```

## 🗄️ Database Architecture & Schema

### Multi-Table User Data Structure

#### Users Table (Authentication):
```sql
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,  -- bcrypt hashed
  registered INT NOT NULL,         -- Unix timestamp
  status INT DEFAULT 0,
  verified INT DEFAULT 0,
  resettable INT DEFAULT 1,
  roles_mask INT DEFAULT 0,
  last_login INT NULL,
  force_logout INT DEFAULT 0
);
```

#### User Details Table (Birth Information):
```sql
CREATE TABLE user_details (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  birthdate DATE,
  birthtime TIME,
  birth_city VARCHAR(255),
  birth_country VARCHAR(255),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

#### User Chart Table (Astrological Data):
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
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### Database Optimization Strategy

**Indexing Strategy:**
```sql
-- Primary indexes
ALTER TABLE users ADD INDEX idx_email (email);
ALTER TABLE user_details ADD INDEX idx_user_id (user_id);
ALTER TABLE user_chart ADD INDEX idx_user_id (user_id);

-- Composite indexes for complex queries
ALTER TABLE user_chart ADD INDEX idx_user_planet (user_id, planet_name);
```

**Query Performance:**
- **Email Lookups**: O(log n) via email index
- **Chart Retrieval**: O(log n) via user_id index
- **JOIN Operations**: Optimized foreign key relationships
- **Cascade Deletes**: Automatic cleanup on user deletion

## 🔄 Service Integration Architecture

### Swiss Ephemeris Integration:
```typescript
import { calculateAndSaveUserChart } from './swissephService';

// Automatic chart calculation in getUserForQuery
if (userData.birthdate && userData.birthtime && userData.birth_city && userData.birth_country) {
  const [existingChart] = await connection.execute(
    'SELECT COUNT(*) as count FROM user_chart WHERE user_id = ?',
    [userData.user_id]
  );

  if (existingChart[0].count === 0) {
    await calculateAndSaveUserChart(email);
  }
}
```

### GraphQL Resolver Integration:
```typescript
// Primary user queries utilize getUserForQuery
const user = await getUserForQuery(email);

// Authentication uses getUserByEmail
const authUser = await getUserByEmail(email);

// Registration uses createUser
const newUserId = await createUser(name, email, password, ...birthData);
```

### Oracle Service Integration:
```typescript
// Oracle service uses getUserForQuery for AI context
const userData = await getUserForQuery(email);
// Provides complete user profile with chart for personalized AI responses
```

## 📊 Data Flow & Business Logic

### User Registration Flow:
```
1. Input Validation → 2. Password Hashing → 3. User Creation → 
4. Birth Data Storage → 5. Chart Calculation → 6. Account Ready
```

### Authentication Flow:
```
1. Email Lookup → 2. User Validation → 3. Password Verification → 
4. Session Creation → 5. Access Granted
```

### Chart Integration Flow:
```
1. User Query → 2. Birth Data Check → 3. Chart Existence Check → 
4. Auto-Calculation (if needed) → 5. Data Assembly → 6. Response Return
```

## 🛡️ Security & Data Protection

### Password Security:
```typescript
// Strong password hashing
const hashedPassword = await bcrypt.hash(password, 10);

// Secure password verification
const isValidPassword = await bcrypt.compare(inputPassword, storedHash);
```

### SQL Injection Prevention:
```typescript
// All queries use parameterized statements
const [rows] = await connection.execute(
  'SELECT * FROM users WHERE LOWER(email) = ? LIMIT 1',
  [email.toLowerCase()]
);
```

### Data Access Control:
- **User Isolation**: Users can only access their own data
- **Foreign Key Constraints**: Referential integrity enforcement
- **Cascade Deletes**: Automatic cleanup of related data
- **Input Validation**: Email format and data type validation

## 📈 Performance & Scalability Considerations

### Database Optimizations:
- **Connection Pooling**: Efficient database resource management
- **Prepared Statements**: Query plan caching and security
- **Indexed Queries**: Fast lookups on email and user_id
- **LIMIT Clauses**: Prevent runaway queries

### Memory Management:
- **Efficient Queries**: Select only required columns
- **Result Mapping**: Direct transformation without intermediate objects
- **Proper Cleanup**: Automatic garbage collection of query results

### Cache-Ready Architecture:
```typescript
// Functions designed for easy caching integration
const user = await getUserForQuery(email); // Cache by email
const chart = await getUserChart(userId);  // Cache by user ID
```

## 🔧 Configuration & Dependencies

### Required Imports:
```typescript
import bcrypt from 'bcrypt';                        // Password hashing
import { connection } from '../database/connection'; // Database access
import { calculateAndSaveUserChart } from './swissephService'; // Chart integration
import { User, UserBirthData, ChartPoint } from '../interfaces/userInterface'; // Types
```

### Environment Configuration:
- **Database Connection**: Configured via connection module
- **bcrypt Salt Rounds**: 10 (configurable for security requirements)
- **No External APIs**: Self-contained user management

## 🎯 Usage Examples & Patterns

### Complete User Lifecycle:
```typescript
// 1. User Registration
const userId = await createUser(
  'Alice Johnson',
  'alice@example.com',
  'securePassword123',
  '1985-03-20',
  '09:15:00',
  'London',
  'UK'
);

// 2. Chart Auto-Calculation
const user = await getUserForQuery('alice@example.com');
console.log(`Chart calculated with ${user.chartPoints.length} points`);

// 3. Authentication
const authUser = await getUserByEmail('alice@example.com');
const isValid = await bcrypt.compare('securePassword123', authUser.password);

// 4. Chart Analysis
const sunSign = user.chartPoints.find(p => p.name === 'sun')?.sign;
const moonSign = user.chartPoints.find(p => p.name === 'moon')?.sign;
console.log(`Alice is ${sunSign} Sun, ${moonSign} Moon`);
```

### Oracle Integration Pattern:
```typescript
// Oracle service uses complete user context
const userData = await getUserForQuery('user@example.com');
const oracleResponse = await askOracle(
  "What does my chart say about career?",
  userData.chartPoints,
  userData.email
);
```

### Admin Operations:
```typescript
// User management and analytics
const allUserCharts = await Promise.all(
  userEmails.map(email => getUserForQuery(email))
);

const chartStats = allUserCharts
  .filter(user => user.chartPoints.length > 0)
  .map(user => ({
    email: user.email,
    sunSign: user.chartPoints.find(p => p.name === 'sun')?.sign,
    chartComplete: user.chartPoints.length >= 14
  }));
```
