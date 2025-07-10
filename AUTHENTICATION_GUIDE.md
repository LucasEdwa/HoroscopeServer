# Authentication Implementation Guide

This guide shows how to implement token-based authentication in your GraphQL horoscope server.

## Overview

The authentication system uses JWT tokens to track logged-in users. Users receive a token when they sign in, and this token must be included in the Authorization header for protected queries and mutations.

## Authentication Flow

### 1. User Registration (signup)
```graphql
mutation Signup {
  signup(
    name: "John Doe"
    email: "john@example.com"
    password: "securepassword123"
    dateOfBirth: "1990-05-15"
    timeOfBirth: "14:30"
    city: "New York"
    country: "USA"
  ) {
    success
    message
  }
}
```

### 2. User Login (signin)
```graphql
mutation Signin {
  signin(
    email: "john@example.com"
    password: "securepassword123"
  ) {
    success
    message
    email
    token
  }
}
```

The token returned from signin should be stored on the client side and included in subsequent requests.

### 3. Making Authenticated Requests

For all protected endpoints, include the JWT token in the Authorization header:

```javascript
// Example with fetch
fetch('/graphql', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_JWT_TOKEN_HERE'
  },
  body: JSON.stringify({
    query: `
      query Me {
        me {
          id
          username
          email
          birthdate
          chartPoints {
            name
            longitude
            latitude
            sign
            house
          }
        }
      }
    `
  })
})
```

## Protected Queries

### Get Current User Profile
```graphql
query Me {
  me {
    id
    username
    email
    birthdate
    birthtime
    birth_city
    birth_country
    chartPoints {
      name
      longitude
      latitude
      sign
      house
      degree
      minute
      second
      planet_type
      distance
    }
  }
}
```

### Get User by Email (own profile only)
```graphql
query GetUser {
  user(email: "john@example.com") {
    id
    username
    email
    chartPoints {
      name
      sign
      house
    }
  }
}
```

### Validate Token
```graphql
query ValidateToken {
  validateToken {
    valid
    message
    user {
      id
      email
      username
    }
  }
}
```

### Get Oracle History (own history only)
```graphql
query GetOracleHistory {
  getOracleHistory(email: "john@example.com") {
    id
    question
    answer
    created_at
    email
  }
}
```

### Get Oracle Question (own questions only)
```graphql
query GetOracleQuestion {
  getOracleQuestion(id: 123) {
    id
    question
    answer
    email
    created_at
  }
}
```

### Get Comprehensive Future (own future only)
```graphql
query GetComprehensiveFuture {
  getComprehensiveFuture(
    email: "john@example.com"
    timeframe: "month"
  ) {
    email
    timeframe
    prediction
    generated_at
  }
}
```

## Protected Mutations

### Submit Oracle Question (own email only)
```graphql
mutation SubmitOracleQuestion {
  submitOracleQuestion(
    input: {
      email: "john@example.com"
      question: "What does my chart say about my career prospects?"
      chart: "optional chart data"
    }
  ) {
    id
    question
    answer
    email
    created_at
  }
}
```

### Delete Oracle Question (own questions only)
```graphql
mutation DeleteOracleQuestion {
  deleteOracleQuestion(id: 123) {
    id
    question
    email
  }
}
```

## Security Features

1. **JWT Token Validation**: All protected endpoints verify the JWT token
2. **User Ownership**: Users can only access their own data
3. **Automatic Expiration**: Tokens expire after 1 hour
4. **Error Handling**: Clear error messages for authentication failures

## Error Responses

### Authentication Required
```json
{
  "errors": [
    {
      "message": "Authentication required"
    }
  ]
}
```

### Unauthorized Access
```json
{
  "errors": [
    {
      "message": "Unauthorized: You can only access your own resources"
    }
  ]
}
```

### Invalid Token
```json
{
  "errors": [
    {
      "message": "Invalid token"
    }
  ]
}
```

## Client-Side Implementation Example

```javascript
class HoroscopeAPI {
  constructor() {
    this.token = localStorage.getItem('horoscope_token');
    this.baseURL = 'http://localhost:3001/graphql';
  }

  async signin(email, password) {
    const response = await this.query(`
      mutation Signin($email: String!, $password: String!) {
        signin(email: $email, password: $password) {
          success
          message
          email
          token
        }
      }
    `, { email, password });

    if (response.data.signin.success) {
      this.token = response.data.signin.token;
      localStorage.setItem('horoscope_token', this.token);
    }

    return response.data.signin;
  }

  async getMe() {
    return this.query(`
      query Me {
        me {
          id
          username
          email
          chartPoints {
            name
            sign
            house
          }
        }
      }
    `);
  }

  async getOracleHistory() {
    const user = await this.getMe();
    if (!user.data.me) throw new Error('Not authenticated');

    return this.query(`
      query GetOracleHistory($email: String!) {
        getOracleHistory(email: $email) {
          id
          question
          answer
          created_at
        }
      }
    `, { email: user.data.me.email });
  }

  async query(query, variables = {}) {
    const headers = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(this.baseURL, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query, variables })
    });

    return response.json();
  }

  logout() {
    this.token = null;
    localStorage.removeItem('horoscope_token');
  }
}

// Usage
const api = new HoroscopeAPI();

// Sign in
await api.signin('john@example.com', 'password123');

// Get current user
const user = await api.getMe();

// Get oracle history
const history = await api.getOracleHistory();
```

## Testing Authentication

You can test the authentication using GraphQL Playground or similar tools:

1. First, sign in to get a token
2. Copy the token from the response
3. For subsequent queries, add to the HTTP headers:
   ```json
   {
     "Authorization": "Bearer YOUR_TOKEN_HERE"
   }
   ```

## Environment Variables

Make sure you have a JWT_SECRET set in your environment:

```bash
JWT_SECRET=your_super_secure_secret_key_here
```

The JWT_SECRET should be a strong, random string that's kept secure and not shared.
