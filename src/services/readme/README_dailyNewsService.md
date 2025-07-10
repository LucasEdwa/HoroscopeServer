# Daily News Service Documentation

## Overview

The `dailyNewsService.ts` manages daily astrological news and personalized advice. This service generates AI-powered daily insights based on user charts and manages news content with date-based filtering.

## 📰 Key Functions

### `getDailyNewsByUserId(userId: number): Promise<DailyNews[]>`

Retrieves today's daily news for a specific user.

**Parameters:**
- `userId` (number): User's database ID

**Returns:**
- `DailyNews[]`: Today's news entries for the user

**Database Query:**
```sql
SELECT id, user_id, title, content, created_at 
FROM daily_news 
WHERE user_id = ? AND DATE(created_at) = CURDATE()
ORDER BY created_at DESC
```

**Features:**
- **Date Filtering**: Only returns today's news
- **User-Specific**: Filtered by user ID
- **Ordered**: Newest first

**Usage:**
```typescript
const todaysNews = await getDailyNewsByUserId(123);
console.log(`User has ${todaysNews.length} news items today`);
```

### `getAllDailyNews(limit?: number, offset?: number): Promise<DailyNews[]>`

Admin function to retrieve all daily news with pagination.

**Parameters:**
- `limit` (optional): Maximum number of records
- `offset` (optional): Number of records to skip

**Returns:**
- `DailyNews[]`: Paginated list of all daily news

**Usage:**
```typescript
// Get latest 50 news items
const recentNews = await getAllDailyNews(50, 0);

// Get next page
const nextPage = await getAllDailyNews(50, 50);
```

### `createDailyNews(data: Omit<DailyNews, 'id' | 'created_at'>): Promise<DailyNews>`

Creates a new daily news entry.

**Parameters:**
- `data.user_id` (number): Target user ID
- `data.title` (string): News headline
- `data.content` (string): News content

**Returns:**
- `DailyNews`: Complete saved record with ID and timestamp

**Database Operation:**
```sql
INSERT INTO daily_news (user_id, title, content, created_at)
VALUES (?, ?, ?, NOW())
```

**Usage:**
```typescript
const news = await createDailyNews({
  user_id: 123,
  title: 'Mercury Retrograde Alert',
  content: 'Communication challenges ahead...'
});
```

### `generateAndSaveDailyAstroAdvice(email: string, userId: number): Promise<DailyNews>`

Generates personalized daily astrological advice using AI.

**Parameters:**
- `email` (string): User's email for chart lookup
- `userId` (number): User's database ID

**Returns:**
- `DailyNews`: Generated advice record

**Smart Features:**
- **Duplicate Prevention**: Returns existing advice if already generated today
- **Chart Integration**: Uses user's complete astrological chart
- **AI Generation**: Personalized advice via `askDailyAstroAdvice()`

**Process Flow:**
1. Check for existing daily advice
2. Return existing if found
3. Fetch user's chart data
4. Generate AI advice
5. Save and return new advice

**Usage:**
```typescript
const advice = await generateAndSaveDailyAstroAdvice('user@example.com', 123);
console.log(`Generated advice: ${advice.title}`);
```

### `deleteDailyNews(id: number): Promise<DailyNews>`

Deletes a daily news entry and returns the deleted data.

**Parameters:**
- `id` (number): News entry ID to delete

**Returns:**
- `DailyNews`: The deleted news data

**Process:**
1. Fetches existing news to return
2. Validates news exists
3. Deletes from database
4. Returns original data

**Usage:**
```typescript
try {
  const deleted = await deleteDailyNews(456);
  console.log(`Deleted: "${deleted.title}"`);
} catch (error) {
  console.error('News not found or deletion failed');
}
```

## 🗄️ Database Schema

### `daily_news` Table:
```sql
CREATE TABLE daily_news (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### Indexes:
- Primary key on `id`
- Index on `user_id` for user queries
- Index on `created_at` for date filtering
- Composite index on `(user_id, created_at)` for daily queries

## 🤖 AI Integration

### Daily Advice Generation:
```typescript
const advice = await askDailyAstroAdvice(chartPoints);
```

### AI Features:
- **Personalized Content**: Based on user's chart
- **Daily Themes**: Current planetary influences
- **Practical Advice**: Actionable recommendations
- **Astrological Accuracy**: Uses real chart data

### Chart Data Used:
- Planetary positions
- House placements
- Current transits
- Aspect patterns
- Sign placements

## 📅 Date-Based Features

### Daily Filtering:
- Uses `CURDATE()` for today's news
- Prevents duplicate daily advice
- Automatic date-based organization

### Duplicate Prevention Logic:
```typescript
const existingNews = await getDailyNewsByUserId(userId);
if (existingNews.length > 0) {
  return existingNews[0]; // Return existing advice
}
```

## 🔄 Service Integration

### With Swiss Ephemeris Service:
```typescript
// Gets chart data for AI generation
const chartPoints = await getUserChartPoints(email);
```

### With AI Service:
```typescript
// Generates personalized advice
const advice = await askDailyAstroAdvice(chartPoints);
```

### With GraphQL Resolvers:
```typescript
// Primary functions for daily news operations
const news = await getDailyNewsByUserId(userId);
const advice = await generateAndSaveDailyAstroAdvice(email, userId);
```

## 📊 Data Structure

### DailyNews Interface:
```typescript
interface DailyNews {
  id: number;
  user_id: number;
  title: string;
  content: string;
  created_at: string;
}
```

### Content Types:
- **Daily Astro Advice**: Personalized AI-generated guidance
- **Custom News**: Manual news entries
- **Announcements**: System notifications
- **Forecasts**: Astrological predictions

## 🎯 Content Categories

### Daily Astro Advice Includes:
- **Energy Overview**: General day's energy
- **Love & Relationships**: Romantic guidance
- **Career & Finance**: Professional insights
- **Health & Wellness**: Wellbeing recommendations
- **Timing**: Best times for activities

### Standard Title:
```
"Your Daily Astro Advice"
```

## 📈 Performance Optimizations

### Efficient Queries:
- Date-based filtering at database level
- User-specific indexes
- Limited result sets
- Proper ORDER BY usage

### Caching Strategy:
- Chart data reused from previous calculations
- AI responses cached per user per day
- Database connection pooling

### Duplicate Prevention:
- Quick existence checks before generation
- Early returns for existing content
- Minimal database writes

## 🛡️ Error Handling

### Database Errors:
- Transaction rollbacks on failures
- Detailed error logging
- Graceful degradation

### AI Service Errors:
- Fallback content when AI unavailable
- Error logging for debugging
- Service continuity

### Validation:
- Required field validation
- User existence checks
- Content length limits

## 🔒 Security Features

- **User Isolation**: Content filtered by user_id
- **SQL Injection Protection**: Parameterized queries
- **Access Control**: User-specific data only
- **Input Validation**: Content sanitization

## 🎯 Usage Examples

### Daily Advice Workflow:
```typescript
// Generate today's advice
const advice = await generateAndSaveDailyAstroAdvice(
  'user@example.com', 
  123
);

// Check if user already has advice (returns existing)
const existing = await generateAndSaveDailyAstroAdvice(
  'user@example.com', 
  123
);
// Returns same advice, doesn't duplicate
```

### News Management:
```typescript
// Create custom news
const news = await createDailyNews({
  user_id: 123,
  title: 'Full Moon in Scorpio',
  content: 'Intense emotions and transformations...'
});

// Get user's today news
const todaysNews = await getDailyNewsByUserId(123);

// Admin: Get all news
const allNews = await getAllDailyNews(100, 0);
```

### Content Cleanup:
```typescript
// Delete old or inappropriate content
await deleteDailyNews(newsId);
```

## 📱 GraphQL Integration

### Query Examples:
```graphql
query GetTodaysNews($userId: Int!) {
  getDailyNewsByUserId(userId: $userId) {
    id
    title
    content
    created_at
  }
}
```

### Mutation Examples:
```graphql
mutation GenerateAdvice($email: String!, $userId: Int!) {
  generateDailyAstroAdvice(email: $email, userId: $userId) {
    id
    title
    content
    created_at
  }
}
```

## 🔧 Configuration

- Database: `../database/connection`
- AI Service: `../utils/ChatOi`
- Chart Service: `./swissephService`
- No external APIs required

## 📊 Analytics Potential

### Metrics to Track:
- Daily advice generation rates
- User engagement with content
- Popular content themes
- AI response quality
- User retention patterns

### Database Queries for Analytics:
```sql
-- Daily advice generation stats
SELECT DATE(created_at), COUNT(*) 
FROM daily_news 
GROUP BY DATE(created_at);

-- Most active users
SELECT user_id, COUNT(*) as advice_count
FROM daily_news 
GROUP BY user_id 
ORDER BY advice_count DESC;
```
