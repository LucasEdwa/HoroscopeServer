import * as OracleService from '../../services/oracleService';
import { OracleQuestion, AskOracleInput, FutureTimeframe } from '../../interfaces/oracleInterface';
import { GraphQLError } from 'graphql';
import { askComprehensiveFuture } from '../../utils/ai/ChatOi';
import { Request } from 'express';
import { requireAuth, requireOwnership } from '../../utils/auth/authUtils';

// Import validation functions individually to avoid module resolution issues
import { 
  validateEmail, 
  validateOracleQuestion,
  ErrorMessages 
} from '../../utils/validation/validationUtils';

export const oracleResolvers = {
  Query: {
    getOracleHistory: async (args: any, context: { req: Request }) => {
      try {
        const authenticatedUser = requireAuth(context);
        
        // In Express GraphQL with rootValue, args come directly as the first parameter
        const email = args.email;
        
        if (!email || !email.trim()) {
          throw new GraphQLError('Email is required');
        }
        
        // Validate email format
        const emailValidation = validateEmail(email);
        if (!emailValidation.isValid) {
          throw new GraphQLError(emailValidation.message);
        }
        
        // Ensure user can only access their own oracle history
        requireOwnership(authenticatedUser, email);
        
        return await OracleService.getOracleQuestionsByEmail(email);
      } catch (error) {
        console.error('Error getting oracle history:', error);
        if (error instanceof GraphQLError) throw error;
        throw new GraphQLError('Failed to retrieve oracle history');
      }
    },
    
    getOracleQuestion: async (args: any, context: { req: Request }) => {
      try {
        const authenticatedUser = requireAuth(context);
        
        const id = args.id;
        
        if (!id) {
          throw new GraphQLError('Question ID is required');
        }
        
        const question = await OracleService.getOracleQuestion({ id }) as OracleQuestion | null;
        if (!question) {
          throw new GraphQLError('Oracle question not found');
        }
        
        // Ensure user can only access their own oracle questions
        requireOwnership(authenticatedUser, question.email);
        
        return question;
      } catch (error) {
        console.error('Error getting oracle question:', error);
        if (error instanceof GraphQLError) throw error;
        throw new GraphQLError('Failed to retrieve oracle question');
      }
    },

    getComprehensiveFuture: async (args: any, context: { req: Request }) => {
      try {
        const authenticatedUser = requireAuth(context);
        console.log('Received args for getComprehensiveFuture:', args);
        
        const email = args.email;
        const timeframe = args.timeframe;
        
        if (!email || !email.trim()) {
          throw new GraphQLError('Email is required');
        }

        // Validate email format using validation utilities
        const emailValidation = validateEmail(email);
        if (!emailValidation.isValid) {
          throw new GraphQLError(emailValidation.message);
        }

        // Ensure user can only get their own future predictions
        requireOwnership(authenticatedUser, email);

        const prediction = await askComprehensiveFuture(email, timeframe || 'month');
        
        return {
          email,
          timeframe: timeframe || 'month',
          prediction,
          generated_at: new Date().toISOString()
        };
      } catch (error) {
        console.error('Error generating comprehensive future:', error);
        if (error instanceof GraphQLError) throw error;
        throw new GraphQLError('Failed to generate future prediction');
      }
    },
  },
  
  Mutation: {
    submitOracleQuestion: async (args: any, context: { req: Request }) => {
      try {
        const authenticatedUser = requireAuth(context);
        
        const input = args.input;
        
        if (!input) {
          throw new GraphQLError('Input is required');
        }
        
        // Validate email using validation utilities
        const emailValidation = validateEmail(input.email);
        if (!emailValidation.isValid) {
          throw new GraphQLError(emailValidation.message);
        }
        
        // Ensure user can only submit questions for their own email
        requireOwnership(authenticatedUser, input.email);
        
        // Validate question using validation utilities
        const questionValidation = validateOracleQuestion(input.question);
        if (!questionValidation.isValid) {
          throw new GraphQLError(questionValidation.message);
        }
        
        // Get AI response using the Oracle service
        const result = await OracleService.askOracleQuestion({
          email: input.email,
          question: input.question.trim(),
          chart: input.chart
        });
        
        // Save to database using the Oracle service
        const savedQuestion = await OracleService.saveOracleQuestion({
          email: input.email,
          question: result.question,
          answer: result.answer,
        });
        
        return savedQuestion;
      } catch (error) {
        console.error('Error submitting oracle question:', error);
        if (error instanceof GraphQLError) throw error;
        throw new GraphQLError(ErrorMessages.SERVER_ERROR);
      }
    },
    
    deleteOracleQuestion: async (args: any, context: { req: Request }) => {
      try {
        const authenticatedUser = requireAuth(context);
        
        const id = args.id;
        
        if (!id) {
          throw new GraphQLError('Question ID is required');
        }
        
        // First get the question to check ownership
        const question = await OracleService.getOracleQuestion({ id }) as OracleQuestion | null;
        if (!question) {
          throw new GraphQLError('Oracle question not found');
        }
        
        // Ensure user can only delete their own questions
        requireOwnership(authenticatedUser, question.email);
        
        return await OracleService.deleteOracleQuestion(id);
      } catch (error) {
        console.error('Error deleting oracle question:', error);
        if (error instanceof GraphQLError) throw error;
        throw new GraphQLError('Failed to delete oracle question');
      }
    },
  },
};
