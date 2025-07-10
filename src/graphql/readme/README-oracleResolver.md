# Oracle Resolver

This resolver handles all Oracle-related GraphQL operations including asking questions, retrieving history, and generating comprehensive future predictions.

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
- `id` (String, required): Question ID

**Returns:** OracleQuestion object or null

**Example:**
```graphql
query {
  getOracleQuestion(id: "question-id") {
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
- `id` (String, required): Question ID to delete

**Returns:** Boolean indicating success

**Example:**
```graphql
mutation {
  deleteOracleQuestion(id: "question-id")
}
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
