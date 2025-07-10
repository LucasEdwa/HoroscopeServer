export interface OracleQuestion {
  id?: number;
  email: string;
  question: string;
  answer: string;
  created_at?: Date;
}

export interface AskOracleInput {
  email: string;
  question: string;
  chart?: any; // Optional chart data for better AI responses
}

export interface FutureTimeframe {
  email: string;
  timeframe: 'week' | 'month' | 'year';
}