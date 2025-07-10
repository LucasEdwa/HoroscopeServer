# Horoscope Server Services

This document provides an overview of all services in the Horoscope Server application.

## 🏗️ Architecture Overview

The application follows a modular service-oriented architecture where each service handles specific domain logic:

- **userService**: User management and authentication
- **swissephService**: Astrological chart calculations
- **oracleService**: AI-powered oracle questions and answers
- **dailyNewsService**: Daily astrological news and advice
- **geocodingService**: Location-based geocoding for birth charts

## 📋 Services Documentation

### 🧑‍💼 User Service (`userService.ts`)

Handles user management, authentication, and user data operations.

#### Key Functions:

- **`getUserBirthData(email: string)`**
  - Retrieves user birth information from database
  - Returns: `UserBirthData | null`

- **`getUserForQuery(email: string)`**
  - Main function for GraphQL queries
  - Auto-calculates chart if missing
  - Returns complete user data with chart points
  - Returns: `User | null`

- **`getUserByEmail(email: string)`**
  - Case-insensitive email lookup
  - Returns: Raw user database record

- **`createUser(...)`**
  - Creates new user with hashed password
  - Inserts user details including birth data
  - Returns: User ID

- **`getUserChart(userId: number)`**
  - Retrieves chart points for specific user
  - Returns: `ChartPoint[]`

### 🌟 Swiss Ephemeris Service (`swissephService.ts`)

Handles astrological chart calculations using Swiss Ephemeris library.

#### Key Functions:

- **`calculateAndSaveUserChart(email: string)`**
  - Calculates complete astrological chart
  - Determines house positions for all planets
  - Saves chart data to database
  - Returns: `boolean`

- **`getUserChartPoints(email: string)`**
  - Optimized for GraphQL queries
  - Auto-calculates chart if missing
  - Returns cached chart data when available
  - Returns: `UserChartPoint[]`

#### Chart Data Includes:
- 🪐 **Planets**: Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto
- 📍 **Points**: Ascendant, Midheaven, North Node
- 🏠 **Houses**: 12 astrological houses
- ♈ **Signs**: Zodiac sign positions
- 📐 **Coordinates**: Longitude, latitude, degrees, minutes, seconds

### 🔮 Oracle Service (`oracleService.ts`)

Manages AI-powered oracle questions and responses.

#### Key Functions:

- **`saveOracleQuestion(data)`**
  - Saves oracle Q&A to database
  - Returns: `OracleQuestion`

- **`getOracleQuestionsByEmail(email: string)`**
  - Retrieves all questions for user
  - Ordered by creation date (newest first)
  - Returns: `OracleQuestion[]`

- **`getOracleQuestion(params)`**
  - Flexible getter by ID or email
  - Returns: `OracleQuestion | OracleQuestion[] | null`

- **`deleteOracleQuestion(id: number)`**
  - Removes question from database
  - Returns deleted question data

- **`getAllOracleQuestions(limit?, offset?)`**
  - Admin function with pagination
  - Returns: `OracleQuestion[]`

- **`askOracleQuestion(input)`**
  - Generates AI responses using user's chart data
  - Integrates with ChatGPT/AI service
  - Fallback response on AI failure
  - Returns: `{ question: string; answer: string }`

### 📰 Daily News Service (`dailyNewsService.ts`)

Manages daily astrological news and personalized advice.

#### Key Functions:

- **`getDailyNewsByUserId(userId: number)`**
  - Gets today's news for specific user
  - Filters by current date
  - Returns: `DailyNews[]`

- **`getAllDailyNews(limit?, offset?)`**
  - Admin function with pagination
  - Returns all daily news entries
  - Returns: `DailyNews[]`

- **`createDailyNews(data)`**
  - Creates new daily news entry
  - Returns: `DailyNews`

- **`generateAndSaveDailyAstroAdvice(email, userId)`**
  - Generates personalized daily advice using AI
  - Uses user's chart data for personalization
  - Prevents duplicate advice for same day
  - Returns: `DailyNews`

- **`deleteDailyNews(id: number)`**
  - Removes daily news entry
  - Returns deleted entry data

#### Features:
- 🌅 **Daily Personalized Advice**: AI-generated based on user's chart
- 🗞️ **News Management**: Create, read, delete daily content
- 📅 **Date Filtering**: Automatic filtering by current date
- 🔄 **Duplicate Prevention**: One advice per user per day

### 🌍 Geocoding Service (`geocodingService.ts`)

Converts city/country names to latitude/longitude coordinates for chart calculations.

#### Key Functions:

- **`geocodeLocation(city: string, country: string)`**
  - Converts location names to coordinates
  - Required for accurate astrological calculations
  - Returns: `{ latitude: number; longitude: number }`

## 🔄 Service Interactions

```
User Registration Flow:
userService.createUser() → swissephService.calculateAndSaveUserChart()

GraphQL Query Flow:
userService.getUserForQuery() → swissephService.getUserChartPoints()

Oracle Question Flow:
oracleService.askOracleQuestion() → userService.getUserBirthData() → AI Processing

Daily News Flow:
dailyNewsService.generateAndSaveDailyAstroAdvice() → swissephService.getUserChartPoints() → AI Processing
```

## 🗄️ Database Tables

### Users Tables:
- `users`: Basic user info (id, username, email, password)
- `user_details`: Birth information (birthdate, birthtime, location)
- `user_chart`: Calculated astrological chart points

### Content Tables:
- `oracle_questions`: AI-generated Q&A history
- `daily_news`: Daily astrological news and advice

## 📊 GraphQL API

### Queries:
- `getUserByEmail(email)`: Get complete user data with chart
- `getOracleQuestionsByEmail(email)`: Get user's oracle history
- `getDailyNewsByUserId(userId)`: Get today's news for user
- `getAllDailyNews(limit?, offset?)`: Admin - get all news

### Mutations:
- `createUser(...)`: Register new user
- `askOracleQuestion(email, question)`: Get AI oracle response
- `saveOracleQuestion(...)`: Save oracle Q&A
- `generateDailyAstroAdvice(email, userId)`: Generate daily advice
- `createDailyNews(...)`: Create news entry
- `deleteDailyNews(id)`: Remove news entry
- `deleteOracleQuestion(id)`: Remove oracle question

## 🛠️ Technical Stack

- **Language**: TypeScript
- **Database**: MySQL with mysql2 driver
- **Astrology**: Swiss Ephemeris calculations
- **AI**: ChatGPT integration for oracle responses and daily advice
- **Architecture**: Functional modules with exported functions
- **GraphQL**: Apollo Server with custom resolvers

## 🚀 Usage Examples

```typescript
// Get complete user data for GraphQL
const user = await getUserForQuery('user@example.com');

// Calculate new chart
await calculateAndSaveUserChart('user@example.com');

// Ask oracle question
const response = await askOracleQuestion({
  email: 'user@example.com',
  question: 'What does my chart say about love?',
  chart: userChartData
});

// Generate daily advice
const advice = await generateAndSaveDailyAstroAdvice('user@example.com', 123);

// Get user's chart points
const chartPoints = await getUserChartPoints('user@example.com');
```

## 🔧 Configuration

Each service connects to the database via the shared `connection` object from `../database/connection`.

Geocoding and AI services may require external API configurations (check respective service files for requirements).

## 🌟 Key Features

- **Automatic Chart Calculation**: Charts are calculated and cached automatically
- **AI Integration**: Personalized responses based on astrological data  
- **Date-based Filtering**: Daily news filtered by current date
- **Duplicate Prevention**: Prevents multiple daily advice entries
- **GraphQL Ready**: All services optimized for GraphQL queries
- **Error Handling**: Comprehensive error handling and logging
- **Modular Design**: Clean separation of concerns