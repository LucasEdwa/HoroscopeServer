#!/bin/bash

# Test script for authentication
SERVER_URL="http://localhost:3001/graphql"

echo "Testing authentication with curl..."
echo ""

# First, let's test signin to get a fresh token
echo "1. Testing signin..."
SIGNIN_RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { signin(email: \"max@example.com\", password: \"securepassword\") { success message email token } }"
  }' \
  $SERVER_URL)

echo "Signin response: $SIGNIN_RESPONSE"
echo ""

# Extract token from response (basic parsing)
TOKEN=$(echo $SIGNIN_RESPONSE | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "Failed to get token from signin"
  exit 1
fi

echo "2. Extracted token: $TOKEN"
echo ""

# Test the me query with authentication
echo "3. Testing 'me' query with token..."
ME_RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "query": "query { me { id username email birthdate } }"
  }' \
  $SERVER_URL)

echo "Me query response: $ME_RESPONSE"
echo ""

# Test the user query with authentication
echo "4. Testing 'user' query with token..."
USER_RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "query": "query { user(email: \"max@example.com\") { id username email birthdate } }"
  }' \
  $SERVER_URL)

echo "User query response: $USER_RESPONSE"
echo ""

# Test without authorization header
echo "5. Testing without authorization (should fail)..."
NO_AUTH_RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query { me { id username email } }"
  }' \
  $SERVER_URL)

echo "No auth response: $NO_AUTH_RESPONSE"
echo ""

echo "Test completed!"
