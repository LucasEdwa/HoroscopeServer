# Authentication & Signup Flow

This document explains the complete signup and signin flows, including all validation, timezone handling, and data consistency mechanisms.

---

## Table of Contents

1. [Signup Flow](#signup-flow)
2. [Signin Flow](#signin-flow)
3. [Key Utilities & Their Importance](#key-utilities--their-importance)
4. [Data Consistency Mechanisms](#data-consistency-mechanisms)
5. [Error Handling](#error-handling)
6. [Architecture Diagram](#architecture-diagram)

---

## Signup Flow

### Overview

The signup process creates a user account, validates their birth location/timezone, and calculates their astrological chart in a **single atomic transaction**. If any step fails, the entire signup is rolled back.

```
User Input (email, password, birth data)
    ↓
[1] Validate Birth Time Format
    ↓
[2] Geocode Location (city, country)
    ↓
[3] Validate & Enforce Timezone
    ↓
[4] BEGIN TRANSACTION
    ├─ Insert User (users table)
    ├─ Insert Birth Details (user_details table)
    ├─ Calculate Astrological Chart (Swiss Ephemeris)
    ├─ Insert Chart Points (user_chart table)
    └─ COMMIT
    ↓
Success ✓ or ROLLBACK ✗
```

### Step-by-Step Breakdown

#### 1️⃣ **Birth Time Normalization** (`normalizeBirthTime()`)

**File:** `src/utils/validation/validationUtils.ts`

**Purpose:** Convert any 12-hour or 24-hour format to standardized `HH:MM:SS` format.

**Input Examples:**
- `"12:35 PM"` → `"12:35:00"`
- `"11:45 AM"` → `"11:45:00"`
- `"23:35"` → `"23:35:00"`
- `"3:15:45 PM"` → `"15:15:45"`

**Why it matters:**
- Prevents MySQL `TIME` column errors (won't accept `12:35 PM`)
- Ensures consistent input for Swiss Ephemeris calculations
- Validates hour/minute/second ranges
- Detects invalid formats early

**Code example:**
```typescript
const normalizedTime = normalizeBirthTime("12:35 PM");
// Returns: "12:35:00"
```

---

#### 2️⃣ **Location Geocoding** (`geocodeLocation()`)

**File:** `src/services/geocodingService.ts`

**Purpose:** Convert city/country names to precise coordinates and timezone.

**API:** OpenCage Geocoding API

**Returns:**
```typescript
{
  latitude: number;       
  longitude: number;       
  timezone: string;        
  timezoneOffset: number;  
  formatted: string;       
}
```

**Example:**
```
Input: city="Natal", country="Brazil"
Output: {
  latitude: -5.795,
  longitude: -35.209,
  timezone: "America/Sao_Paulo",
  timezoneOffset: -3,
  formatted: "Natal, Rio Grande do Norte, Brazil"
}
```

**Error Handling:**
- 401/403: Invalid or expired API key
- 402/429: Quota exceeded
- Empty results: Location not found
- Network errors: API unreachable

---

#### 3️⃣ **Timezone Validation & Enforcement** (`validateGeocodedTimezone()`, `enforceGeocodedTimezone()`)

**File:** `src/utils/astrology/timezoneUtils.ts`

**Purpose:** Ensure the geocoded timezone is valid and accurate. Detect when geocoding returned vague/wrong results.

**Validation Checks:**

1. **Offset Type Check**
   - Is `timezoneOffset` a valid number?
   - Is it in reasonable range?

2. **Timezone Name Check**
   - Is timezone in IANA format (`America/New_York`, `Europe/London`)?
   - Is it not null/undefined?

3. **Cross-validation**
   - Compare geocoded offset with longitude-based calculation
   - Flag if difference > 3.5 hours (indicates error or DST boundary confusion)

4. **Result Vagueness Check** ⭐ **Most Important**
   - Count commas in formatted address
   - `"Natal, Rio Grande do Norte, Brazil"` = 2 commas ✓ (GOOD)
   - `"Brazil"` = 0 commas ✗ (VAGUE - city not recognized)
   - If vague, set confidence to `LOW` and reject signup

**Confidence Levels:**
```
HIGH    → Geocoding result matches request & offset is reasonable
LOW     → Result is vague, offset mismatches, or location unrecognized
FALLBACK → Using calculated timezone (only if geocoding completely failed)
```

**Example - Wrong City Name:**
```
Input: city="Natal, Rio grande do North" (typo)
Geocoding returns: "Brazil" (no state)
Confidence: LOW
Action: REJECT signup with error message
Result: User told to verify spelling
```

**Example - Correct City Name:**
```
Input: city="Natal, Rio Grande do Norte"
Geocoding returns: "Natal, Rio Grande do Norte, Brazil"
Confidence: HIGH
Action: PROCEED with chart calculation
```

---

#### 4️⃣ **Atomic Transaction** (`createUserWithChart()`)

**File:** `src/services/userService.ts`

**Purpose:** Create user account and chart in one atomic operation. If any step fails, all changes are rolled back.

**Transaction Steps:**
```sql
BEGIN TRANSACTION

1. INSERT INTO users (username, email, password, registered)
   VALUES (name, email, hashedPassword, timestamp)

2. INSERT INTO user_details (user_id, birthdate, birthtime, birth_city, birth_country)
   VALUES (userId, dateOfBirth, normalizedBirthTime, city, country)

3. [Swiss Ephemeris] Calculate planetary positions for UTC time
   - Convert local time to UTC using geocoded timezone offset
   - Calculate 12 planets + ascendant + midheaven

4. INSERT INTO user_chart (user_id, planet_name, longitude, latitude, sign, house, degree, minute, second, planet_type)
   VALUES (...) × 12 rows

COMMIT (if all steps succeed)
or
ROLLBACK (if any step fails)
```

**Why Transaction is Critical:**
- **Without transaction:** User inserted, then chart calculation fails → orphan account
- **With transaction:** All succeed together or all fail together ✓

---

## Signin Flow

### Overview

Signin validates credentials, issues a JWT token, and returns user info.

```
User Input (email, password)
    ↓
[1] Look up user by email
    ↓
[2] Verify password (bcrypt)
    ↓
[3] Generate JWT token
    ↓
Success + Token
```

### Step-by-Step Breakdown

#### 1️⃣ **User Lookup**

**Query:**
```sql
SELECT * FROM users WHERE LOWER(email) = ? LIMIT 1
```

**Handles:**
- Case-insensitive email matching
- Non-existent users → error response

---

#### 2️⃣ **Password Verification**

**Library:** bcrypt

**Process:**
```typescript
const isValid = await bcrypt.compare(plainPassword, hashedPassword);
```

**Important:**
- Passwords are hashed with bcrypt during signup
- Never stored in plain text
- Constant-time comparison prevents timing attacks

---

#### 3️⃣ **JWT Token Generation**

**Library:** jsonwebtoken

**Token Contains:**
```typescript
{
  id: user.id,
  email: user.email,
  expiresIn: "1h"
}
```

**Signed with:** `process.env.JWT_SECRET`

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "email": "user@example.com",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

## Key Utilities & Their Importance

### 1. **validationUtils.ts** — Data Integrity

| Utility | Purpose | Location |
|---------|---------|----------|
| `normalizeBirthTime()` | Convert 12-hour to 24-hour format | `src/utils/validation/validationUtils.ts` |
| `validateBirthData()` | Ensure birth fields are present | `src/utils/validation/validationUtils.ts` |
| `validateEmail()` | Validate email format | `src/utils/validation/validationUtils.ts` |
| `validatePassword()` | Ensure minimum 6 characters | `src/utils/validation/validationUtils.ts` |

**Why important:**
- Catch invalid input early before database operations
- Prevent MySQL errors from malformed data
- Give users clear feedback on what needs fixing

---

### 2. **timezoneUtils.ts** — Timezone Consistency

| Utility | Purpose | Location |
|---------|---------|----------|
| `validateGeocodedTimezone()` | Verify geocoding quality & detect vague results | `src/utils/astrology/timezoneUtils.ts` |
| `enforceGeocodedTimezone()` | Ensure geocoded timezone is used (never fallback) | `src/utils/astrology/timezoneUtils.ts` |
| `calculateTimezoneFromLongitude()` | Fallback: estimate timezone from coordinates | `src/utils/astrology/timezoneUtils.ts` |
| `logTimezoneDebugInfo()` | Detailed timezone logging for debugging | `src/utils/astrology/timezoneUtils.ts` |

**Why important:**
- **Timezone = Ascendant:** Wrong timezone = wrong chart
- Prevents silent fallbacks to inaccurate calculated timezone
- Catches misspelled city names that geocoding can't recognize
- Logs everything for debugging when chart is wrong

---

### 3. **geocodingService.ts** — Location Data

| Service | Purpose |
|---------|---------|
| `geocodeLocation()` | Convert city/country → lat/lng/timezone |

**Error Handling:**
```typescript
if (status === 401 || status === 403) {
  // Invalid API key
}
if (status === 402 || status === 429) {
  // Quota exceeded
}
if (results.length === 0) {
  // Location not found
}
```

**Why important:**
- Accurate coordinates = accurate house calculations
- Timezone from geocoding = accurate UTC conversion
- Error handling prevents silent failures

---

### 4. **swissephService.ts & swissephHook.ts** — Chart Calculation

| Function | Purpose |
|----------|---------|
| `calculateSwissEphChart()` | Main chart calculation (planets, houses, signs) |
| `calculateSwissEphChart()` with logging | Shows exact UTC time sent to Swiss Ephemeris |

**Key Logged Info:**
```
[SwissEph] Birth time (local): 12:35:00
[SwissEph] Birth time (UTC): 16:35:00 on 1992-09-02
[SwissEph] Location: latitude=-5.795, longitude=-35.209
[SwissEph] Timezone offset: -3h
[SwissEph] Ascendant (longitude): 263.158°
```

**Why important:**
- Logging reveals if timezone conversion is wrong
- Shows exact moment Swiss Ephemeris was calculated
- Helps debug wrong ascendants or planetary positions

---

### 5. **authUtils.ts** — Auth Middleware

| Function | Purpose |
|----------|---------|
| `requireAuth()` | Verify JWT token exists and is valid |
| `requireOwnership()` | Ensure user can only query their own data |

**Protects:**
- Unauthorized access to protected queries
- Users viewing other users' data

---

## Data Consistency Mechanisms

### 1. **Atomic Transactions**

```typescript
const db = await connection.getConnection();
await db.beginTransaction();

try {
  // All inserts here
  await db.commit();
} catch (error) {
  await db.rollback();
} finally {
  db.release();
}
```

**Guarantees:** User + birth data + chart all created or all rolled back. Never partial.

---

### 2. **Birth Time Normalization**

```
User Input (various formats)
    ↓
normalizeBirthTime() → "HH:MM:SS"
    ↓
Stored in user_details.birthtime
    ↓
Used in Swiss Ephemeris calculation
```

**Guarantees:** Same format everywhere, no format mismatches.

---

### 3. **Timezone Validation**

```
Geocoding Result
    ↓
validateGeocodedTimezone()
    ├─ Check offset type
    ├─ Check timezone name
    ├─ Cross-validate offset vs. longitude
    ├─ Check result vagueness (commas in formatted)
    └─ Set confidence: HIGH / LOW / FALLBACK
    ↓
If confidence = LOW → REJECT
If confidence = HIGH → USE geocoded timezone
```

**Guarantees:** Wrong timezones are rejected before chart calculation.

---

### 4. **Detailed Error Messages**

Each failure step returns specific error:

```typescript
// Birth time parsing
"Birth time parsing failed: Birth time must use a valid time format..."

// Geocoding
"Geocoding failed for 'Natal, Rio grande do North, Brazil': 
Geocoding confidence is LOW. Returned coordinates: lat=-4, lng=-60. 
Please verify the city and country names are spelled correctly."

// Swiss Ephemeris
"Swiss Ephemeris calculation failed: ..."

// Timezone
(caught by validateGeocodedTimezone before chart calculation)
```

**Guarantees:** User knows exactly what went wrong and how to fix it.

---

### 5. **Logging at Every Step**

```
========== Starting signup for lucas.eduardo2070@gmail.com ==========
✓ Birth time normalized to: 12:35:00
✓ Geocoded location: lat=-5.795, lng=-35.209, timezone=America/Sao_Paulo, offset=-3h
[TimezoneValidation] Timezone validated: America/Sao_Paulo (offset=-3h) ✓
[SwissEph] === Chart Calculation ===
[SwissEph] Birth time (UTC): 16:35:00 on 1992-09-02
[SwissEph] Ascendant (longitude): 263.158°
✓ User chart created successfully with 12 chart points
✓ Signup completed successfully for lucas.eduardo2070@gmail.com (user_id=1)
========== End signup ==========
```

**Guarantees:** Can trace exactly what happened and where any error occurred.

---

## Error Handling

### Signup Errors (In Order of Execution)

| Error | Cause | Fix |
|-------|-------|-----|
| "Birth time parsing failed" | Invalid time format | Use `HH:MM` or `HH:MM:SS` or `HH:MM AM/PM` |
| "Geocoding failed... API key" | Invalid/expired OpenCage key | Update `GEOCODING_API_KEY` in `.env` |
| "Geocoding failed... quota exceeded" | Used up free tier (20k/day) | Wait or upgrade plan |
| "No geocoding results found" | City/country name not recognized | Fix spelling or use more specific location |
| "Geocoding confidence is LOW" | Returned vague result (e.g., "Brazil") | Use correct city name spelling |
| "Swiss Ephemeris calculation failed" | Invalid coordinates or time | Check timezone offset is correct |
| "Duplicate entry... for key 'users.email'" | Email already exists | Use different email or sign in instead |

### Signin Errors

| Error | Cause | Fix |
|-------|-------|-----|
| "User not found" | Email doesn't exist in database | Sign up first or use correct email |
| "Invalid password" | Wrong password | Check caps lock, special characters |
| "JWT_SECRET not set" | Server configuration error | Add JWT_SECRET to `.env` |

---

## Architecture Diagram

### Signup Flow (Detailed)

```
┌─────────────────────────────────────────────────────────────────┐
│                    SIGNUP MUTATION                               │
│  (name, email, password, dateOfBirth, timeOfBirth,              │
│   city, country)                                                 │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
        ┌────────────────────────────────────┐
        │  1. normalizeBirthTime()           │
        │     Input:  "12:35 PM"             │
        │     Output: "12:35:00"             │
        │     Status: ✓ or throw error       │
        └────────────┬───────────────────────┘
                     │
                     ▼
        ┌────────────────────────────────────┐
        │  2. geocodeLocation()              │
        │     API: OpenCage                  │
        │     Input:  city, country          │
        │     Output: lat, lng, tz, offset   │
        │     Status: ✓ or throw error       │
        └────────────┬───────────────────────┘
                     │
                     ▼
        ┌────────────────────────────────────┐
        │  3. validateGeocodedTimezone()     │
        │     Check: offset type             │
        │     Check: timezone name           │
        │     Check: offset vs longitude     │
        │     Check: result vagueness        │
        │     Confidence: HIGH/LOW/FALLBACK  │
        └────────────┬───────────────────────┘
                     │
         ┌───────────┴─────────────┐
         │ Confidence = LOW?        │
         ├─ YES ──────────────►REJECT
         │
         └─ NO
         │
         ▼
        ┌─────────────────────────────────────────────────┐
        │  4. START TRANSACTION                           │
        │                                                 │
        │  INSERT users                                   │
        │  INSERT user_details                            │
        │  calculateSwissEphChart()                        │
        │    └─ Convert local time to UTC                 │
        │    └─ Calculate planets (12) + houses (2)       │
        │  INSERT user_chart × 14 rows                    │
        │                                                 │
        │  COMMIT ✓ or ROLLBACK ✗                         │
        └─────────────────────────────────────────────────┘
```

### Signin Flow (Detailed)

```
┌───────────────────────────────────┐
│     SIGNIN MUTATION               │
│  (email, password)                │
└────────────┬──────────────────────┘
             │
             ▼
    ┌────────────────────────────┐
    │  1. getUserByEmail()       │
    │     Query: users table     │
    │     Status: Found or NULL  │
    └────────────┬───────────────┘
                 │
      ┌──────────┴──────────┐
      │ User found?         │
      ├─ NO ────────► Return: User not found
      │
      └─ YES
      │
      ▼
    ┌────────────────────────────┐
    │  2. bcrypt.compare()       │
    │     Compare:               │
    │     - plainPassword        │
    │     - hashedPassword       │
    │     Status: match or fail  │
    └────────────┬───────────────┘
                 │
      ┌──────────┴──────────┐
      │ Password valid?     │
      ├─ NO ───────► Return: Invalid password
      │
      └─ YES
      │
      ▼
    ┌────────────────────────────┐
    │  3. jwt.sign()             │
    │     Payload: id, email     │
    │     Secret: JWT_SECRET     │
    │     Expiry: 1h             │
    └────────────┬───────────────┘
                 │
                 ▼
    ┌────────────────────────────┐
    │  Return to client:         │
    │  {                         │
    │    success: true,          │
    │    email: "user@...",      │
    │    token: "eyJhbGc..."     │
    │  }                         │
    └────────────────────────────┘
```

---

## Database Schema Overview

### users
```sql
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(255),
  email VARCHAR(255) UNIQUE,
  password VARCHAR(255),  -- bcrypt hashed
  registered INT          -- Unix timestamp
);
```

### user_details
```sql
CREATE TABLE user_details (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT FOREIGN KEY,
  birthdate DATE,
  birthtime TIME,           -- "HH:MM:SS" (normalized)
  birth_city VARCHAR(100),
  birth_country VARCHAR(100)
);
```

### user_chart
```sql
CREATE TABLE user_chart (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT FOREIGN KEY,
  planet_name VARCHAR(50),  -- "sun", "moon", "ascendant", etc.
  longitude DECIMAL(10,6),  -- 0-360 degrees
  latitude DECIMAL(10,6),   -- Birth latitude
  sign VARCHAR(20),         -- "Virgo", "Sagittarius", etc.
  house INT,                -- 1-12
  degree INT,               -- 0-29
  minute INT,               -- 0-59
  second INT,               -- 0-59
  planet_type ENUM('planet', 'point', 'asteroid')
);
```

---

## Best Practices for Consistent Data

### ✅ DO

1. **Always normalize input** before storing
   ```typescript
   const normalizedTime = normalizeBirthTime(userInput);
   ```

2. **Validate timezone early** before any calculations
   ```typescript
   const validated = validateGeocodedTimezone(geoData, city);
   if (validated.confidence === 'low') throw new Error(...);
   ```

3. **Use transactions** for multi-step operations
   ```typescript
   await db.beginTransaction();
   // multiple inserts
   await db.commit();
   ```

4. **Log at every step** for debugging
   ```typescript
   console.log(`✓ Step completed: ...`);
   ```

5. **Return specific error messages** (not generic ones)
   ```typescript
   // Bad:
   throw new Error('Error creating user');
   
   // Good:
   throw new Error('Geocoding failed for "Natal": coordinates returned are vague. Please verify spelling.');
   ```

### ❌ DON'T

1. **Don't use calculated timezone if geocoding succeeded**
   ```typescript
   // Bad:
   const offset = timezoneOffset || Math.round(longitude / 15);
   
   // Good:
   enforceGeocodedTimezone(validatedTimezone);
   ```

2. **Don't silently fall back without logging**
   ```typescript
   // Bad:
   const tz = geoData.timezone || 'UTC';
   
   // Good:
   if (!geoData.timezone) {
     console.warn('Timezone missing, using fallback...');
   }
   ```

3. **Don't skip validation to "save time"**
   ```typescript
   // Bad:
   const offset = geoData.timezoneOffset; // No validation
   
   // Good:
   const validated = validateGeocodedTimezone(geoData);
   ```

4. **Don't create user before validating chart inputs**
   ```typescript
   // Bad:
   const userId = await createUser(...);
   await calculateChart(email); // Might fail, leaving orphan user
   
   // Good:
   const userId = await createUserWithChart(...); // Atomic
   ```

5. **Don't return generic HTTP 500 errors**
   ```typescript
   // Bad:
   { success: false, message: 'Server error' }
   
   // Good:
   { success: false, message: 'Birth time parsing failed: expected HH:MM or HH:MM AM/PM' }
   ```

---

## Testing Checklist

- [ ] Signup with correct city name → ascendant is correct
- [ ] Signup with typo in city → rejected with clear error
- [ ] Signup with 12-hour time format → converted correctly
- [ ] Signup with 24-hour time format → accepted as-is
- [ ] Signin with correct email/password → JWT token issued
- [ ] Signin with wrong password → error (not user found)
- [ ] Signin with non-existent email → error (user not found)
- [ ] Check terminal logs for full signup flow
- [ ] Verify timezone offset matches geocoding result
- [ ] Verify ascendant sign matches expected for location/date/time

---

## References

- **Swiss Ephemeris:** https://www.astro.com/swisseph/
- **OpenCage Geocoding:** https://opencagedata.com/
- **JWT Tokens:** https://jwt.io/
- **Bcrypt Hashing:** https://github.com/kelektiv/node.bcrypt.js
- **IANA Timezones:** https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
