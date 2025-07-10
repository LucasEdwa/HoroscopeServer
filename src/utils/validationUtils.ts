export interface ValidationResult {
  isValid: boolean;
  message: string;
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Email validation
export function validateEmail(email: string): ValidationResult {
  if (!email || !email.trim()) {
    return {
      isValid: false,
      message: "Email address is required."
    };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return {
      isValid: false,
      message: "Please provide a valid email address."
    };
  }

  return {
    isValid: true,
    message: ""
  };
}

// Password validation
export function validatePassword(password: string): ValidationResult {
  if (!password || password.length < 6) {
    return {
      isValid: false,
      message: "Password must be at least 6 characters long."
    };
  }

  return {
    isValid: true,
    message: ""
  };
}

// Question validation for Oracle
export function validateOracleQuestion(question: string): ValidationResult {
  if (!question || !question.trim()) {
    return {
      isValid: false,
      message: "Please enter your question for the oracle."
    };
  }

  if (question.length > 500) {
    return {
      isValid: false,
      message: "Question is too long. Please keep it under 500 characters."
    };
  }

  return {
    isValid: true,
    message: ""
  };
}

// Birth data validation
export function validateBirthData(dateOfBirth: string, timeOfBirth: string, city: string, country: string): ValidationResult {
  if (!dateOfBirth) {
    return {
      isValid: false,
      message: "Birth date is required for accurate astrological calculations."
    };
  }

  if (!timeOfBirth) {
    return {
      isValid: false,
      message: "Birth time is required for precise chart calculations."
    };
  }

  if (!city || !country) {
    return {
      isValid: false,
      message: "Birth location (city and country) is required for accurate charts."
    };
  }

  return {
    isValid: true,
    message: ""
  };
}

// Database error handler
export function handleDatabaseError(error: any): string {
  const errorMessage = error.message || error.toString();

  if (errorMessage.includes("Duplicate entry")) {
    if (errorMessage.includes("email")) {
      return "This email address is already registered. Please try signing in or use a different email.";
    }
    return "This information is already in use. Please try different details.";
  }

  if (errorMessage.includes("foreign key constraint")) {
    return "There was an issue with your account data. Please contact support.";
  }

  if (errorMessage.includes("connection") || errorMessage.includes("timeout")) {
    return "We're experiencing connection issues. Please try again in a moment.";
  }

  // Generic fallback
  return "Something went wrong. Please try again or contact support if the problem persists.";
}

// Success messages
export const SuccessMessages = {
  SIGNUP: "Account created successfully! Welcome to the cosmic community.",
  SIGNIN: "Welcome back! You've been successfully signed in.",
  ORACLE_QUESTION: "Your question has been answered by the cosmic oracle.",
  ORACLE_DELETE: "Oracle question has been removed from your history.",
  FUTURE_PREDICTION: "Your cosmic forecast has been generated successfully."
};

// Error messages
export const ErrorMessages = {
  UNAUTHORIZED: "You don't have permission to access this information.",
  NOT_FOUND: "The requested information could not be found.",
  SERVER_ERROR: "Our servers are experiencing issues. Please try again later.",
  ORACLE_UNAVAILABLE: "The oracle is temporarily unavailable due to cosmic interference. Please try again later.",
  INVALID_TOKEN: "Your session has expired. Please sign in again.",
  RATE_LIMIT: "You're making requests too quickly. Please wait a moment before trying again.",
  AUTH_REQUIRED: "Please sign in to access your profile. Your session may have expired.",
  INVALID_CREDENTIALS: "Invalid email or password. Please check your credentials and try again."
};

// Authentication helper
export function getAuthErrorMessage(error: any): string {
  const errorMessage = error.message || error.toString();
  
  if (errorMessage.includes('Authentication required') || 
      errorMessage.includes('Invalid token') ||
      errorMessage.includes('No authorization header') ||
      errorMessage.includes('Please sign in first')) {
    return "Authentication required. Please include the Authorization header in the correct format:\n\nHeaders: {\n  \"Authorization\": \"Bearer YOUR_JWT_TOKEN_HERE\"\n}\n\nMake sure to include 'Bearer ' before your token!";
  }
  
  if (errorMessage.includes('Missing Authorization header')) {
    return "Missing Authorization header. Please add:\n\nHeaders: {\n  \"Authorization\": \"Bearer YOUR_JWT_TOKEN_HERE\"\n}";
  }
  
  if (errorMessage.includes('Invalid Authorization header format')) {
    return "Invalid header format. Correct format:\n\nHeaders: {\n  \"Authorization\": \"Bearer YOUR_JWT_TOKEN_HERE\"\n}\n\nNote: 'Bearer ' prefix is required!";
  }
  
  if (errorMessage.includes('Unauthorized')) {
    return ErrorMessages.UNAUTHORIZED;
  }
  
  if (errorMessage.includes('expired')) {
    return ErrorMessages.INVALID_TOKEN;
  }
  
  if (errorMessage.includes('malformed') || errorMessage.includes('invalid')) {
    return "Invalid authentication token. Please sign in again to get a new token.";
  }
  
  return ErrorMessages.SERVER_ERROR;
}

// Add a helper function for authentication instructions
export function getAuthInstructions(): string {
  return `
To access protected resources:

1. First, sign in to get your JWT token:
   mutation SignIn {
     signin(email: "your@email.com", password: "your_password") {
       success
       message
       token
       authorizationHeader
       email
     }
   }

2. Copy the token from the response and use it in your headers:
   Headers: {
     "Authorization": "Bearer YOUR_JWT_TOKEN_HERE"
   }

3. Example protected query:
   query GetUser {
     user(email: "your@email.com") {
       id
       username
       email
       chartPoints { ... }
     }
   }
`;
}

// GraphQL context debugging helper - safe from circular references
export function debugGraphQLContext(context: any): string {
  const safeContext = {
    contextType: typeof context,
    contextKeys: Object.keys(context),
    hasReq: !!context.req,
    reqKeys: context.req ? Object.keys(context.req).filter(key => 
      !['socket', 'connection', 'client'].includes(key)) : [],
    hasHeaders: !!context.req?.headers,
    headerKeys: context.req?.headers ? Object.keys(context.req.headers) : [],
    authVariations: {
      'req.headers.authorization': !!context.req?.headers?.authorization,
      'req.headers.Authorization': !!context.req?.headers?.Authorization,
      'context.authorization': !!context.authorization,
      'context.Authorization': !!context.Authorization,
    }
  };
  
  return JSON.stringify(safeContext, null, 2);
}

// Token formatting helper
export function formatTokenResponse(token: string, email: string): string {
  return `
🔐 Authentication Successful!

Email: ${email}
Token: ${token}

📋 Copy this for your Authorization header:
Bearer ${token}

⏰ Token expires in 24 hours
`;
}

// GraphQL server configuration checker
export function checkGraphQLServerConfig(context: any): string {
  const issues = [];
  
  if (Object.keys(context).length === 0) {
    issues.push("❌ Context is completely empty");
  }
  
  if (!context.req) {
    issues.push("❌ Missing 'req' object in context");
  }
  
  if (!context.req?.headers) {
    issues.push("❌ Missing 'headers' in request object");
  }
  
  if (issues.length > 0) {
    return `
🚨 GraphQL Server Configuration Issues Detected:

${issues.join('\n')}

🔧 Fix Required:
Your GraphQL server needs to be configured to pass request data to resolvers.

For Apollo Server 4:
\`\`\`typescript
const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: async ({ req }) => {
    return {
      req,
      headers: req.headers,
      user: null // Add user after authentication
    };
  }
});
\`\`\`

For Express GraphQL:
\`\`\`typescript
app.use('/graphql', graphqlHTTP((req, res) => ({
  schema,
  rootValue: resolvers,
  context: { req, res },
  graphiql: true
})));
\`\`\`

Please update your GraphQL server configuration file.
`;
  }
  
  return "✅ GraphQL server configuration looks correct";
}

// GraphQL server configuration templates
export function getGraphQLConfigTemplates(): string {
  return `
🔧 GRAPHQL SERVER CONFIGURATION FIX

Choose the configuration that matches your setup:

📦 APOLLO SERVER 4 (Recommended):
\`\`\`typescript
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

const { url } = await startStandaloneServer(server, {
  listen: { port: 4000 },
  context: async ({ req }) => {
    return {
      req,
      headers: req.headers,
      // Add any other context data you need
    };
  },
});
\`\`\`

📦 APOLLO SERVER WITH EXPRESS:
\`\`\`typescript
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import express from 'express';

const app = express();
const server = new ApolloServer({
  typeDefs,
  resolvers,
});

await server.start();

app.use('/graphql', 
  express.json(),
  expressMiddleware(server, {
    context: async ({ req }) => ({
      req,
      headers: req.headers,
    }),
  })
);
\`\`\`

📦 EXPRESS-GRAPHQL:
\`\`\`typescript
import { graphqlHTTP } from 'express-graphql';

app.use('/graphql', graphqlHTTP((req, res) => ({
  schema,
  rootValue: resolvers,
  context: { 
    req, 
    res,
    headers: req.headers 
  },
  graphiql: true,
})));
\`\`\`

📦 GRAPHQL-YOGA:
\`\`\`typescript
import { createYoga } from 'graphql-yoga';

const yoga = createYoga({
  schema,
  context: ({ request }) => ({
    req: request,
    headers: request.headers,
  }),
});
\`\`\`

🎯 NEXT STEPS:
1. Find your GraphQL server setup file (usually app.js, server.js, or index.js)
2. Update the context configuration as shown above
3. Restart your server
4. Test authentication with the JWT token

Your Oracle dependencies are optimized and ready to work once the server configuration is fixed!
`;
}

