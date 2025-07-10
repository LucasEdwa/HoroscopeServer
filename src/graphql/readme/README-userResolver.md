# User Resolver

This resolver handles user authentication, registration, and user data retrieval including astrological chart information.

## Queries

### `user`
Retrieves user information including astrological chart data.

**Arguments:**
- `email` (String, required): User's email address

**Returns:** User object with chart points or null

**Example:**
```graphql
query {
  user(email: "user@example.com") {
    id
    name
    email
    dateOfBirth
    timeOfBirth
    city
    country
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

## Mutations

### `signup`
Creates a new user account and generates their astrological chart.

**Arguments:**
- `name` (String, required): User's full name
- `email` (String, required): User's email address
- `password` (String, required): User's password
- `dateOfBirth` (String, required): Birth date
- `timeOfBirth` (String, required): Birth time
- `city` (String, required): Birth city
- `country` (String, required): Birth country

**Returns:** Signup response with success status and message

**Example:**
```graphql
mutation {
  signup(
    name: "John Doe"
    email: "john@example.com"
    password: "securepassword"
    dateOfBirth: "1990-01-01"
    timeOfBirth: "12:00"
    city: "New York"
    country: "USA"
  ) {
    success
    message
  }
}
```

### `signin`
Authenticates a user and returns a JWT token.

**Arguments:**
- `email` (String, required): User's email address
- `password` (String, required): User's password

**Returns:** Signin response with token and user info

**Example:**
```graphql
mutation {
  signin(
    email: "john@example.com"
    password: "securepassword"
  ) {
    success
    message
    email
    token
  }
}
```

## Features

### Astrological Chart Calculation
- Automatically calculates and saves user's astrological chart upon signup
- Includes planetary positions, signs, houses, and distances
- Supports major planets, asteroids, and chart points

### Password Security
- Uses bcrypt for password hashing
- Secure password comparison during authentication

### JWT Authentication
- Generates JWT tokens for authenticated sessions
- Configurable token expiration (default: 1 hour)

## Planet Distance Calculation

The resolver includes a helper function that calculates approximate distances for celestial bodies:

- **Inner Planets**: Sun, Moon, Mercury, Venus, Mars
- **Outer Planets**: Jupiter, Saturn, Uranus, Neptune, Pluto
- **Special Points**: Chiron, North Node, Ascendant, Midheaven

## Error Handling

Comprehensive error handling includes:
- Input validation
- Database operation errors
- Authentication failures
- Missing environment variables

## Dependencies

- `userService`: Core user management operations
- `swissephService`: Astrological chart calculations
- `bcrypt`: Password hashing and comparison
- `jsonwebtoken`: JWT token generation
- `auth`: Authentication middleware

## Environment Variables

Required environment variables:
- `JWT_SECRET`: Secret key for JWT token signing

## Security Notes

- Passwords are hashed using bcrypt before storage
- JWT tokens expire after 1 hour
- Email validation is performed on all operations
- Sensitive data is not logged in production
