# Oracle Resolver

This resolver handles all Oracle-related GraphQL operations including asking questions, retrieving history, and generating comprehensive future predictions.

## Authentication (Required)

All Oracle queries and mutations require authentication.

Send one of the headers below:
- Authorization: Bearer <JWT_TOKEN>
- x-access-token: <JWT_TOKEN>

Get the token first with signin:

```graphql
mutation {
  signin(email: "user@example.com", password: "your-password") {
    success
    token
  }
}
```

Then include the token in requests.

Playground HTTP Headers:

```json
{
  "Authorization": "Bearer YOUR_TOKEN_HERE"
}
```

## Queries

### `getOracleHistory`
Retrieves the Oracle question history for a specific user.

**Arguments:**
- `email` (String, required): User's email address

**Returns:** Array of OracleQuestion objects

**Example:**
```graphql
query {
  getOracleHistory(email: "user@example.com") {
    id
    question
    answer
    created_at
  }
}
```

### `getOracleQuestion`
Retrieves a specific Oracle question by ID.

**Arguments:**
- `id` (Int, required): Question ID

**Returns:** OracleQuestion object or null

**Example:**
```graphql
query {
  getOracleQuestion(id: 1) {
    id
    question
    answer
    email
    created_at
  }
}
```

### `getComprehensiveFuture`
Generates a comprehensive future prediction for a user.

**Arguments:**
- `email` (String, required): User's email address
- `timeframe` (String, optional): Prediction timeframe (default: "month")

**Returns:** ComprehensiveFuture object

**Example:**
```graphql
query {
  getComprehensiveFuture(email: "user@example.com", timeframe: "year") {
    email
    timeframe
    prediction
    generated_at
  }
}
```

## Mutations

### `submitOracleQuestion`
Submits a new Oracle question and receives an AI-generated answer.

**Arguments:**
- `input` (AskOracleInput, required): Contains email, question, and optional chart data

**Returns:** OracleQuestion object with the generated answer

**Example:**
```graphql
mutation {
  submitOracleQuestion(input: {
    email: "user@example.com"
    question: "What does my future hold?"
    chart: { /* chart data */ }
  }) {
    id
    question
    answer
    created_at
  }
}
```

### `deleteOracleQuestion`
Deletes a specific Oracle question.

**Arguments:**
- `id` (Int, required): Question ID to delete

**Returns:** Deleted OracleQuestion object

**Example:**
```graphql
mutation {
  deleteOracleQuestion(id: 1) {
    id
    question
    answer
    created_at
  }
}
```

## Common Auth Error

If you see:
- Authentication required
- No valid Authorization header found

The request was sent without token header.

Use curl like this:

```bash
curl -X POST http://localhost:3001/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{"query":"mutation { submitOracleQuestion(input: {email: \"user@example.com\", question: \"What does my future hold?\"}) { id question answer created_at } }"}'
```

## Validation

The resolver includes validation for:
- Email format validation
- Question content validation
- Required field checks

## Error Handling

All resolvers include comprehensive error handling with:
- GraphQL error responses
- Detailed error logging
- User-friendly error messages

## Dependencies

- `OracleService`: Core business logic for Oracle operations
- `ChatOi`: AI service for generating predictions
- `validationUtils`: Email and question validation utilities
