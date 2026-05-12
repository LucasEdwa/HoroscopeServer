import jwt from 'jsonwebtoken';
import { Request } from 'express';

// Interface for authenticated user from JWT
export interface AuthenticatedUser {
  id: string;
  email: string;
}

function getHeaderValue(value: string | string[] | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  return Array.isArray(value) ? value[0] : value;
}

function buildBearerHeader(tokenHeader: string | undefined): string | undefined {
  if (!tokenHeader) {
    return undefined;
  }

  return tokenHeader.startsWith('Bearer ') ? tokenHeader : `Bearer ${tokenHeader}`;
}

/**
 * Extract and verify user from JWT token
 * @param authHeader Authorization header from request
 * @returns Authenticated user or null if invalid
 */
export function getUserFromToken(authHeader: string | undefined): AuthenticatedUser | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.split(' ')[1];
  
  try {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not set');
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as AuthenticatedUser;
    return decoded;
  } catch (error) {
    console.error('Token verification failed:', error);
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
  const authorizationHeader = getHeaderValue(context.req.headers.authorization);
  const xAccessToken = getHeaderValue(context.req.headers['x-access-token']);
  const authHeader = authorizationHeader || buildBearerHeader(xAccessToken);

  const authenticatedUser = getUserFromToken(authHeader);
  if (!authenticatedUser) {
    throw new Error('Authentication required. Send Authorization: Bearer <token> header.');
  }

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
