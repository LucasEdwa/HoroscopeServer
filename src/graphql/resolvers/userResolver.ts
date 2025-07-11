/// <reference path="../../../types/express/json.d.ts" />

import { getUserByEmail, createUser, getUserForQuery } from '../../services/userService';
import { calculateAndSaveUserChart } from '../../services/swissephService';
import { User } from '../../interfaces/userInterface';
import jwt from 'jsonwebtoken';
import { Request } from 'express';
import { requireAuth, requireOwnership } from '../../utils/auth/authUtils';



/**
 * GraphQL resolvers for user operations
 */
let bcrypt: any;
try {
  bcrypt = require('bcrypt');
} catch (error) {
  console.warn('bcrypt not available, password hashing will be disabled');
}

export const userResolvers = {
  Query: {
    // Get current user profile (authenticated)
    async me(args: any, context: { req: Request }): Promise<User | null> {
      
      const authenticatedUser = requireAuth(context);
      
      const user = await getUserForQuery(authenticatedUser.email);
      
      if (user && user.chartPoints) {
        user.chartPoints = user.chartPoints.map(point => {
          const distance = calculatePlanetDistance(point.name);
          
          const mappedPoint = {
            user_id: point.user_id,
            name: point.name,
            longitude: parseFloat(point.longitude.toString()),
            latitude: parseFloat(point.latitude.toString()),
            sign: point.sign,
            house: point.house,
            degree: point.degree,
            minute: point.minute,
            second: point.second,
            planet_type: point.planet_type,
            distance: distance,
          };
          return mappedPoint;
        });
      }
      
      return user;
    },

    // Get user by email (admin or same user only)
    async user(args: { email: string }, context: { req: Request }): Promise<User | null> {
      
      const { email } = args;
      if (!email) {
        console.error('Debug: Email argument is missing or undefined');
        throw new Error('Email argument is required');
      }

      const authenticatedUser = requireAuth(context);
      requireOwnership(authenticatedUser, email);

      const user = await getUserForQuery(email);
      
      // Ensure all fields are properly mapped and typed
      if (user && user.chartPoints) {
        user.chartPoints = user.chartPoints.map(point => {
          const distance = calculatePlanetDistance(point.name);
          
          const mappedPoint = {
            user_id: point.user_id,
            name: point.name,
            longitude: parseFloat(point.longitude.toString()),
            latitude: parseFloat(point.latitude.toString()),
            sign: point.sign,
            house: point.house,
            degree: point.degree,
            minute: point.minute,
            second: point.second,
            planet_type: point.planet_type,
            distance: distance,
          };
          return mappedPoint;
        });
        
      }
      
      return user;
    },

    // Validate token and return user info
    async validateToken(args: any, context: { req: Request }) {
      try {
        const authenticatedUser = requireAuth(context);
        const user = await getUserForQuery(authenticatedUser.email);
        
        return {
          valid: true,
          user: user,
          message: 'Token is valid'
        };
      } catch (error: any) {
        return {
          valid: false,
          user: null,
          message: error.message || 'Invalid token'
        };
      }
    },
  },

  Mutation: {
    async signup({
      name,
      email,
      password,
      dateOfBirth,
      timeOfBirth,
      city,
      country
    }: {
      name: string;
      email: string;
      password: string;
      dateOfBirth: string;
      timeOfBirth: string;
      city: string;
      country: string;
    }) {
      try {
        // Create user and save birth details
        const userId = await createUser(name, email, password, dateOfBirth, timeOfBirth, city, country);

        // Calculate and save user's astrological chart
        await calculateAndSaveUserChart(email);

        return {
          success: true,
          message: 'User created successfully'
        };
      } catch (error: any) {
        console.error('Signup error:', error.message || error);
        return {
          success: false,
          message: error.message || 'Error creating user'
        };
      }
    },

    async signin({
      email,
      password
    }: {
      email: string;
      password: string;
    }) {
      try {

        const user = await getUserByEmail(email);
        if (!user) {
          console.warn('Debug: User not found for email:', email);
          return {
            success: false,
            message: 'User not found',
            email: null,
            token: null
          };
        }


        let isValidPassword = false;
        if (bcrypt && user.password) {
          isValidPassword = await bcrypt.compare(password, user.password);
        }

        if (!isValidPassword) {
          console.warn('Debug: Invalid password for email:', email);
          return {
            success: false,
            message: 'Invalid password',
            email: null,
            token: null
          };
        }

        if (!process.env.JWT_SECRET) {
          throw new Error('JWT_SECRET is not set');
        }
        const token = jwt.sign(
          { id: user.id, email: user.email },
          process.env.JWT_SECRET,
          { expiresIn: '1h' }
        );

        return {
          success: true,
          message: 'Login successful',
          email: user.email,
          token
        };
      } catch (error) {
        console.error('Debug: Signin error:', error);
        return {
          success: false,
          message: 'Error signing in',
          email: null,
          token: null
        };
      }
    }
  }
};

// Helper function to calculate approximate distances (in AU - Astronomical Units)
function calculatePlanetDistance(planetName: string): number | null {
  const distances: { [key: string]: number | null } = {
    'sun': 1.0,           
    'moon': 0.00257,      
    'mercury': 0.39,      
    'venus': 0.72,
    'mars': 1.52,
    'jupiter': 5.20,
    'saturn': 9.58,
    'uranus': 19.18,
    'neptune': 30.07,
    'pluto': 39.48,
    'chiron': 13.7,       
    'northnode': null,    // Changed from 'northNode' to match your data
    'ascendant': null,    
    'midheaven': null,    
  };

  const key = planetName.toLowerCase();
  
  return distances[key] !== undefined ? distances[key] : null;
}