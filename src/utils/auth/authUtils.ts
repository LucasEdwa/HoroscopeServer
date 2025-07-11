import jwt from 'jsonwebtoken';
import { Request } from 'express';

// Interface for authenticated user from JWT
export interface AuthenticatedUser {
  id: string;
  email: string;
}

/**
 * Extract and verify user from JWT token
 * @param authHeader Authorization header from request
 * @returns Authenticated user or null if invalid
 */
export function getUserFromToken(authHeader: string | undefined): AuthenticatedUser | null {
  console.log('Debug: getUserFromToken called with authHeader:', authHeader);
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('Debug: No valid Authorization header found');
    return null;
  }

  const token = authHeader.split(' ')[1];
  console.log('Debug: Extracted token:', token);
  
  try {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not set');
    }
    console.log('Debug: JWT_SECRET exists, verifying token...');
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as AuthenticatedUser;
    console.log('Debug: Token verified successfully, decoded:', decoded);
    return decoded;
  } catch (error) {
    console.error('Debug: Token verification failed:', error);
    return null;
  }
}

/**
 * Middleware function to require authentication
 * @param context GraphQL context with request
 * @returns Authenticated user
 * @throws Error if not authenticated
 */
export function requireAuth(context: { req: Request }): AuthenticatedUser {
  console.log('Debug: requireAuth called with context:', context);
  console.log('Debug: Request headers:', context.req.headers);
  
  const authenticatedUser = getUserFromToken(context.req.headers.authorization);
  if (!authenticatedUser) {
    console.log('Debug: Authentication failed - no valid user found');
    throw new Error('Authentication required');
  }
  console.log('Debug: Authentication successful for user:', authenticatedUser);
  return authenticatedUser;
}

/**
 * Check if user can access resource (same user or admin)
 * @param authenticatedUser Current authenticated user
 * @param targetEmail Email of the target resource
 * @param allowAdmin Whether to allow admin access (default: false)
 * @returns true if authorized
 * @throws Error if not authorized
 */
export function requireOwnership(
  authenticatedUser: AuthenticatedUser, 
  targetEmail: string, 
  allowAdmin: boolean = false
): boolean {
  if (authenticatedUser.email !== targetEmail) {
    throw new Error('Unauthorized: You can only access your own resources');
  }
  return true;
}
