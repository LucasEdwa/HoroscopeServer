import { OracleService, OracleQuestion } from '../../services/oracleService';
import { GraphQLError } from 'graphql';
import { askComprehensiveFuture } from '../../utils/ChatOi';

interface AskOracleInput {
  email: string;
  question: string;
  chart?: any; // Optional chart data for better AI responses
}

interface FutureTimeframe {
  email: string;
  timeframe: 'week' | 'month' | 'year';
}

export const oracleResolvers = {
  Query: {
    getOracleHistory: async ( args: any) => {
      try {
        console.log('Received args for getOracleHistory:', args); // Debug log
        
        const { email } = args;
        if (!email || !email.trim()) {
          throw new GraphQLError('Email is required');
        }
        
        return await OracleService.getOracleQuestionsByEmail(email);
      } catch (error) {
        console.error('Error getting oracle history:', error);
        if (error instanceof GraphQLError) throw error;
        throw new GraphQLError('Failed to retrieve oracle history');
      }
    },
    
    getOracleQuestion: async (_: any, { id }: { id: number }) => {
      try {
        if (!id) {
          throw new GraphQLError('Question ID is required');
        }
        
        const question = await OracleService.getOracleQuestion({ id }) as OracleQuestion | null;
        if (!question) {
          throw new GraphQLError('Oracle question not found');
        }
        
        return question;
      } catch (error) {
        console.error('Error getting oracle question:', error);
        if (error instanceof GraphQLError) throw error;
        throw new GraphQLError('Failed to retrieve oracle question');
      }
    },

    getComprehensiveFuture: async (_: any, { email, timeframe }: FutureTimeframe) => {
      try {
        if (!email || !email.trim()) {
          throw new GraphQLError('Email is required');
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          throw new GraphQLError('Invalid email format');
        }

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
    submitOracleQuestion: async (args: any) => {
      try {
        console.log('Received args:', args); // Debug log
        
        const { input } = args;
        if (!input) {
          throw new GraphQLError('Input is required');
        }
        
        // Input validation
        if (!input.email || !input.email.trim()) {
          throw new GraphQLError('Email is required');
        }
        
        if (!input.question || !input.question.trim()) {
          throw new GraphQLError('Question is required');
        }
        
        if (input.question.length > 500) {
          throw new GraphQLError('Question too long (max 500 characters)');
        }
        
        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(input.email)) {
          throw new GraphQLError('Invalid email format');
        }
        
        // Get AI response
        const result = await OracleService.askOracleQuestion({
          email: input.email,
          question: input.question.trim(),
          chart: input.chart
        });
        
        // Save to database
        const savedQuestion = await OracleService.saveOracleQuestion({
          email: input.email,
          question: result.question,
          answer: result.answer,
        });
        
        return savedQuestion;
      } catch (error) {
        console.error('Error submitting oracle question:', error);
        if (error instanceof GraphQLError) throw error;
        throw new GraphQLError('Failed to submit oracle question');
      }
    },
    
    deleteOracleQuestion: async (_: any, { id }: { id: number }) => {
      try {
        if (!id) {
          throw new GraphQLError('Question ID is required');
        }
        
        return await OracleService.deleteOracleQuestion(id);
      } catch (error) {
        console.error('Error deleting oracle question:', error);
        if (error instanceof GraphQLError) throw error;
        throw new GraphQLError('Failed to delete oracle question');
      }
    },
  },
};
