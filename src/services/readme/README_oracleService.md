# Oracle Service Documentation

## Overview

The `oracleService.ts` is the core AI-powered oracle system that manages personalized astrological guidance. This service integrates ChatGPT/OpenAI with user astrological charts to provide contextual, personalized responses and maintains a complete Q&A history for each user.

## 🔮 Core Database Functions

### `saveOracleQuestion(data: Omit<OracleQuestion, 'id' | 'created_at'>): Promise<OracleQuestion>`

**Purpose**: Persists oracle questions and AI-generated answers to the database with automatic timestamping.

**Process Flow:**
1. **Data Insertion**: Inserts question, answer, and email with NOW() timestamp
2. **ID Retrieval**: Gets auto-generated primary key from insert
3. **Data Verification**: Fetches complete record to ensure successful save
4. **Return Complete Record**: Returns full OracleQuestion with ID and timestamp

**Parameters:**
```typescript
data: {
  email: string;      // User's email address
  question: string;   // The question asked to the oracle
  answer: string;     // AI-generated astrological response
}
```

**Returns:**
- `OracleQuestion`: Complete database record with generated ID and timestamp

**Database Operation:**
```sql
-- Insert new oracle question with automatic timestamp
INSERT INTO oracle_questions (email, question, answer, created_at)
VALUES (?, ?, ?, NOW())

-- Retrieve complete record for return
SELECT id, email, question, answer, created_at 
FROM oracle_questions WHERE id = ?
```

**Error Handling:**
- Validates successful insertion via `insertId` check
- Verifies record retrieval after insertion
- Logs detailed error information for debugging
- Throws descriptive errors for insert or retrieval failures

**Usage Example:**
```typescript
const savedQuestion = await saveOracleQuestion({
  email: 'user@example.com',
  question: 'What does my Mars in Scorpio mean for my career?',
  answer: 'Your Mars in Scorpio suggests intense focus and transformative power in your career...'
});

console.log(`Saved question with ID: ${savedQuestion.id}`);
console.log(`Created at: ${savedQuestion.created_at}`);
```

### `getOracleQuestionsByEmail(email: string): Promise<OracleQuestion[]>`

**Purpose**: Retrieves complete oracle history for a specific user, ordered chronologically.

**Query Optimization:**
- **Indexed Lookup**: Uses email index for fast retrieval
- **Chronological Order**: `ORDER BY created_at DESC` for newest-first display
- **Complete Data**: Returns all fields for full question context

**Parameters:**
- `email` (string): User's email address for history lookup

**Returns:**
- `OracleQuestion[]`: Array of user's oracle questions in reverse chronological order

**Database Query:**
```sql
SELECT id, email, question, answer, created_at 
FROM oracle_questions 
WHERE email = ? 
ORDER BY created_at DESC
```

**Performance Features:**
- Email field is indexed for O(log n) lookup performance
- `LIMIT` can be added for pagination if needed
- Efficient sorting with indexed timestamp column

**Usage Example:**
```typescript
const userHistory = await getOracleQuestionsByEmail('user@example.com');

console.log(`User has ${userHistory.length} oracle consultations`);
userHistory.forEach((q, index) => {
  console.log(`${index + 1}. ${q.question} (${q.created_at})`);
});

// Display most recent question
if (userHistory.length > 0) {
  const latest = userHistory[0];
  console.log(`Latest question: "${latest.question}"`);
  console.log(`Oracle response: "${latest.answer}"`);
}
```

### `getOracleQuestion(params: { email?: string; id?: number }): Promise<OracleQuestion | OracleQuestion[] | null>`

**Purpose**: Flexible retrieval function supporting both single question lookup and user history queries.

**Function Overloading Logic:**
```typescript
if (params.id) {
  // Single question retrieval by ID
  return Promise<OracleQuestion | null>
} else if (params.email) {
  // All questions for user
  return Promise<OracleQuestion[]>
} else {
  // Invalid parameters
  throw new Error('Either email or id must be provided')
}
```

**Parameters:**
- `params.id` (optional): Specific question ID for single retrieval
- `params.email` (optional): User email for complete history

**Returns:**
- `OracleQuestion | null` when querying by ID
- `OracleQuestion[]` when querying by email
- `null` if single question not found

**Database Operations:**
```sql
-- Single question by ID
SELECT id, email, question, answer, created_at 
FROM oracle_questions WHERE id = ?

-- All questions by email (delegates to getOracleQuestionsByEmail)
-- Uses the optimized email query with ordering
```

**Usage Examples:**
```typescript
// Get specific question by ID
const specificQuestion = await getOracleQuestion({ id: 123 });
if (specificQuestion) {
  console.log(`Question: ${specificQuestion.question}`);
}

// Get all questions for user (same as getOracleQuestionsByEmail)
const userQuestions = await getOracleQuestion({ 
  email: 'user@example.com' 
}) as OracleQuestion[];

// Error case - invalid parameters
try {
  await getOracleQuestion({}); // Throws error
} catch (error) {
  console.error('Either email or id must be provided');
}
```

### `deleteOracleQuestion(id: number): Promise<OracleQuestion>`

**Purpose**: Safely deletes oracle questions while returning the deleted data for confirmation.

**Safety-First Process:**
1. **Pre-fetch Validation**: Retrieves question data before deletion
2. **Existence Check**: Confirms question exists before attempting deletion
3. **Atomic Deletion**: Performs DELETE operation
4. **Return Original**: Returns pre-deletion data for confirmation

**Parameters:**
- `id` (number): Primary key of question to delete

**Returns:**
- `OracleQuestion`: The deleted question data (captured before deletion)

**Database Operations:**
```sql
-- Step 1: Retrieve question data for return
SELECT id, email, question, answer, created_at 
FROM oracle_questions WHERE id = ?

-- Step 2: Delete the question
DELETE FROM oracle_questions WHERE id = ?
```

**Error Handling:**
- Validates question existence before deletion attempt
- Throws descriptive error if question not found
- Logs deletion errors with context information
- Maintains referential integrity

**Usage Example:**
```typescript
try {
  const deletedQuestion = await deleteOracleQuestion(123);
  console.log(`Successfully deleted question: "${deletedQuestion.question}"`);
  console.log(`Originally asked by: ${deletedQuestion.email}`);
  console.log(`Asked on: ${deletedQuestion.created_at}`);
} catch (error) {
  if (error.message === 'Oracle question not found') {
    console.log('Question was already deleted or never existed');
  } else {
    console.error('Deletion failed:', error.message);
  }
}
```

### `getAllOracleQuestions(limit?: number, offset?: number): Promise<OracleQuestion[]>`

**Purpose**: Administrative function for retrieving all oracle questions with pagination support.

**Pagination Implementation:**
```typescript
// Dynamic query building
let query = 'SELECT id, email, question, answer, created_at FROM oracle_questions ORDER BY created_at DESC';
const params: any[] = [];

if (limit) {
  query += ' LIMIT ?';
  params.push(limit);
  
  if (offset) {
    query += ' OFFSET ?';
    params.push(offset);
  }
}
```

**Parameters:**
- `limit` (optional): Maximum number of records to return
- `offset` (optional): Number of records to skip (for pagination)

**Returns:**
- `OracleQuestion[]`: Paginated array of all oracle questions

**Administrative Use Cases:**
- **Content Moderation**: Review questions and answers for appropriateness
- **System Analytics**: Analyze usage patterns and popular question types
- **Data Export**: Backup or export oracle data
- **Quality Assurance**: Monitor AI response quality

**Usage Examples:**
```typescript
// Get first 50 questions (page 1)
const firstPage = await getAllOracleQuestions(50, 0);

// Get next 50 questions (page 2)
const secondPage = await getAllOracleQuestions(50, 50);

// Get all questions (no pagination - use with caution on large datasets)
const allQuestions = await getAllOracleQuestions();

// Admin analytics
const recentQuestions = await getAllOracleQuestions(100, 0);
const questionTypes = recentQuestions.reduce((acc, q) => {
  const topic = q.question.toLowerCase().includes('love') ? 'love' :
                q.question.toLowerCase().includes('career') ? 'career' :
                q.question.toLowerCase().includes('money') ? 'finance' : 'general';
  acc[topic] = (acc[topic] || 0) + 1;
  return acc;
}, {});
console.log('Question distribution:', questionTypes);
```

## 🤖 AI Integration Functions

### `askOracleQuestion(input: { email: string; question: string; chart?: any }): Promise<{ question: string; answer: string }>`

**Purpose**: Core AI orchestration function that generates personalized astrological responses using complete user context.

**AI Enhancement Process:**
1. **User Context Building**: Fetches complete astrological profile
2. **Chart Integration**: Includes natal chart positions and aspects
3. **AI Prompt Construction**: Creates comprehensive astrological context
4. **Response Generation**: Calls ChatOi AI service with enhanced prompt
5. **Fallback Handling**: Provides graceful degradation on AI service failures

**Parameters:**
```typescript
input: {
  email: string;     // User email for chart lookup and personalization
  question: string;  // User's question to the oracle
  chart?: any;       // Optional pre-loaded chart data (optimization)
}
```

**Returns:**
```typescript
{
  question: string;  // Echo of the original question
  answer: string;    // AI-generated astrological response
}
```

**AI Context Enhancement:**
```typescript
// Fetches complete user data for AI context
const userData = await getUserForQuery(input.email);

// AI receives comprehensive astrological context:
// - Full birth chart with planetary positions
// - Birth date, time, and location
// - House placements and zodiacal positions
// - Planetary aspects and patterns
```

**Fallback Safety System:**
```typescript
try {
  const aiAnswer = await askOracle(input.question, input.chart || {}, input.email);
  return { question: input.question, answer: aiAnswer };
} catch (error) {
  console.error('Error asking oracle question with AI:', error);
  // Graceful fallback response
  return {
    question: input.question,
    answer: "The oracle is temporarily unavailable due to cosmic interference. Please try again later."
  };
}
```

**AI Integration Features:**
- **Personalized Responses**: Uses complete natal chart for specific advice
- **Contextual Awareness**: Integrates birth data and current transits
- **Astrological Accuracy**: Leverages precise planetary positions
- **Error Resilience**: Maintains service availability during AI outages
- **Response Quality**: Enhanced by comprehensive astrological context

**Usage Example:**
```typescript
// Basic oracle consultation
const response = await askOracleQuestion({
  email: 'user@example.com',
  question: 'What does my Saturn return mean for my career?'
});

console.log(`Q: ${response.question}`);
console.log(`A: ${response.answer}`);

// Enhanced consultation with pre-loaded chart
const userChart = await getUserChartPoints('user@example.com');
const enhancedResponse = await askOracleQuestion({
  email: 'user@example.com',
  question: 'How will the upcoming Venus retrograde affect my relationships?',
  chart: userChart // Optimization to avoid re-fetching chart
});
```

**AI Response Enhancement Examples:**

**Without Chart Context** (Basic AI):
```
"Venus retrograde generally affects relationships by bringing past issues to the surface..."
```

**With Complete Chart Context** (Enhanced AI):
```
"With your Venus in Libra in the 7th house conjunct your Descendant, this upcoming Venus retrograde will be particularly significant for your partnerships. Your natal Venus placement suggests you deeply value harmony in relationships, and the retrograde may bring unresolved balance issues with your current partner to the forefront. Given that Venus rules your 7th house of committed partnerships, expect significant developments in your primary relationship during this period..."
```

## 🗄️ Database Schema & Optimization

### Oracle Questions Table Structure:
```sql
CREATE TABLE oracle_questions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Performance indexes
  INDEX idx_email (email),
  INDEX idx_created_at (created_at),
  INDEX idx_email_created (email, created_at)
);
```

### Index Strategy:
- **Primary Index**: `id` for direct question lookups
- **Email Index**: Fast user history queries
- **Timestamp Index**: Efficient chronological ordering
- **Composite Index**: Optimized email + date queries

### Query Performance:
```sql
-- Optimized user history query (uses idx_email_created)
SELECT * FROM oracle_questions 
WHERE email = 'user@example.com' 
ORDER BY created_at DESC;

-- Fast existence check
SELECT COUNT(*) FROM oracle_questions WHERE email = ?;

-- Efficient pagination
SELECT * FROM oracle_questions 
ORDER BY created_at DESC 
LIMIT 50 OFFSET 100;
```

## 🔄 Service Integration Architecture

### ChatOi AI Service Integration:
```typescript
import { askOracle } from '../utils/ChatOi';

// Enhanced AI calls with complete user context
const aiAnswer = await askOracle(
  input.question,           // User's question
  input.chart || {},        // Chart data for context
  input.email              // Email for user data lookup
);
```

### User Service Integration:
```typescript
// Automatic user data fetching for AI enhancement
const userData = await getUserForQuery(input.email);
// Provides: natal chart, birth data, calculated positions
```

### Swiss Ephemeris Integration:
```typescript
// Chart data used for AI personalization
const chartPoints = await getUserChartPoints(input.email);
// Provides: planetary positions, house placements, aspects
```

### GraphQL Resolver Integration:
```typescript
// Primary functions exposed to GraphQL API
export const oracleResolvers = {
  Query: {
    getOracleHistory: () => getOracleQuestionsByEmail(email),
    getOracleQuestion: () => getOracleQuestion({ id })
  },
  Mutation: {
    submitOracleQuestion: () => askOracleQuestion({ email, question }),
    deleteOracleQuestion: () => deleteOracleQuestion(id)
  }
};
```

## 📊 Data Flow & Business Logic

### Complete Oracle Session Flow:
```typescript
// 1. User asks question via GraphQL
const question = "What career path should I pursue?";

// 2. AI service generates enhanced response
const response = await askOracleQuestion({
  email: 'user@example.com',
  question: question
});

// 3. Response saved to database
const saved = await saveOracleQuestion({
  email: 'user@example.com',
  question: response.question,
  answer: response.answer
});

// 4. User can retrieve history
const history = await getOracleQuestionsByEmail('user@example.com');
```

### AI Enhancement Pipeline:
```
1. Question Input → 2. User Chart Lookup → 3. Context Building → 
4. AI Prompt Construction → 5. ChatGPT API Call → 6. Response Processing → 
7. Database Storage → 8. Response Return
```

### Error Recovery Flow:
```
AI Service Down → Fallback Response → User Notification → 
Service Restoration → Normal Operation Resume
```

## 🛡️ Security & Data Protection

### SQL Injection Prevention:
```typescript
// All queries use parameterized statements
const [rows] = await connection.execute(
  'SELECT * FROM oracle_questions WHERE email = ? ORDER BY created_at DESC',
  [email]  // Parameterized to prevent injection
);
```

### Input Validation:
- **Email Format**: Validated via GraphQL resolvers
- **Question Length**: Enforced limits prevent abuse
- **SQL Parameters**: All user input properly escaped
- **Error Sanitization**: No sensitive data in error messages

### Access Control:
- **User Isolation**: Users can only access their own oracle history
- **Admin Functions**: `getAllOracleQuestions` restricted to admin roles
- **Rate Limiting**: Can be implemented at GraphQL layer
- **Content Filtering**: AI responses can be monitored for appropriateness

## 📈 Performance & Scalability

### Database Optimizations:
- **Connection Pooling**: Efficient database resource management
- **Prepared Statements**: Query plan caching and security
- **Index Strategy**: Optimized for common query patterns
- **Pagination**: Large result set handling

### AI Service Optimizations:
- **Chart Caching**: Avoid redundant chart calculations
- **Async Processing**: Non-blocking AI API calls
- **Response Caching**: Cache common question responses
- **Timeout Handling**: Prevent hanging AI requests

### Memory Management:
- **Efficient Queries**: Select only needed columns
- **Result Streaming**: Handle large datasets efficiently
- **Object Pooling**: Reuse database connection objects
- **Garbage Collection**: Proper cleanup of temporary objects

## 🔧 Configuration & Environment

### Required Environment Variables:
- **Database Connection**: Handled by connection module
- **AI API Keys**: Managed by ChatOi service
- **Service Timeouts**: Configurable AI response timeouts

### Dependencies:
```typescript
import { connection } from '../database/connection';  // Database access
import { askOracle } from '../utils/ChatOi';         // AI integration
import { OracleQuestion } from '../interfaces/oracleInterface'; // Type definitions
```

### Service Health Monitoring:
```typescript
// Monitor AI service availability
const healthCheck = async () => {
  try {
    await askOracleQuestion({
      email: 'healthcheck@system.com',
      question: 'Health check question'
    });
    return { status: 'healthy', ai: 'available' };
  } catch (error) {
    return { status: 'degraded', ai: 'fallback_mode' };
  }
};
```