import { getUserChartByEmail } from './astronomiaController';
import { askOracle } from '../utils/ChatOi';

// GraphQL resolver for oracle question
export const askOracleQuestion = async ({ email, question }: { email: string; question: string }) => {
  if (!email || !question) {
    throw new Error('Email and question are required.');
  }
  const chart = await getUserChartByEmail(email);
  const answer = await askOracle(question, chart);
  return { question, answer };
};


