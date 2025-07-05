/// <reference path="../../../types/express/json.d.ts" />

import { getUserByEmail, createUser, getUserForQuery } from '../../services/userService';
import { calculateAndSaveUserChart } from '../../services/swissephService';
import { authenticate } from '../../middleware/auth';
import { User } from '../../interfaces/userInterface';
import jwt from 'jsonwebtoken';

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
    async user(args: { email: string }): Promise<User | null> {
      console.log('Debug: Received args:', args);
      const { email } = args;
      if (!email) {
        console.error('Debug: Email argument is missing or undefined');
        throw new Error('Email argument is required');
      }
      console.log('Debug: Fetching user with email:', email);

      const user = await getUserForQuery(email);
      console.log('Debug: Fetched user with chart points:', user);
      
      // Ensure all fields are properly mapped and typed
      if (user && user.chartPoints) {
        user.chartPoints = user.chartPoints.map(point => {
          const distance = calculatePlanetDistance(point.name);
          console.log(`Debug: Planet '${point.name}' -> distance: ${distance}`);
          
          const mappedPoint = {
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
        
        console.log('Debug: Mapped chart points sample:', JSON.stringify(user.chartPoints[0], null, 2));
        console.log('Debug: Total chart points:', user.chartPoints.length);
      }
      
      return user;
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
        console.log('Debug: Signin attempt for email:', email);

        const user = await getUserByEmail(email);
        console.log('Debug: Fetched user for signin:', user);
        if (!user) {
          console.warn('Debug: User not found for email:', email);
          return {
            success: false,
            message: 'User not found',
            email: null,
            token: null
          };
        }

        console.log('Debug: Stored password hash:', user.password);

        let isValidPassword = false;
        if (bcrypt && user.password) {
          isValidPassword = await bcrypt.compare(password, user.password);
        }
        console.log('Debug: Password comparison result:', isValidPassword);

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
        console.log('Debug: Generated token:', token);

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
  console.log(`Debug: Looking up '${key}' in distances object. Available keys:`, Object.keys(distances));
  
  return distances[key] !== undefined ? distances[key] : null;
}