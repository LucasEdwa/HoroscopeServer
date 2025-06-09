import { Router } from 'express';
import { graphqlHTTP } from 'express-graphql';
import { buildSchema } from 'graphql';
import { connection } from '../database/connection';
// Zodiac sign date ranges
const zodiacSigns = [
  { sign: 'Capricorn', start: '01-01', end: '01-19' },
  { sign: 'Aquarius', start: '01-20', end: '02-18' },
  { sign: 'Pisces', start: '02-19', end: '03-20' },
  { sign: 'Aries', start: '03-21', end: '04-19' },
  { sign: 'Taurus', start: '04-20', end: '05-20' },
  { sign: 'Gemini', start: '05-21', end: '06-20' },
  { sign: 'Cancer', start: '06-21', end: '07-22' },
  { sign: 'Leo', start: '07-23', end: '08-22' },
  { sign: 'Virgo', start: '08-23', end: '09-22' },
  { sign: 'Libra', start: '09-23', end: '10-22' },
  { sign: 'Scorpio', start: '10-23', end: '11-21' },
  { sign: 'Sagittarius', start: '11-22', end: '12-21' },
  { sign: 'Capricorn', start: '12-22', end: '12-31' },
];

function getZodiacSign(dateString: string) {
  if (typeof dateString !== 'string') return 'Unknown';
  let year, month, day;
  // Try YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    [year, month, day] = dateString.split('-').map(Number);
  } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
    // Try DD/MM/YYYY
    [day, month, year] = dateString.split('/').map(Number);
  } else if (/^\d{2}-\d{2}-\d{4}$/.test(dateString)) {
    // Try DD-MM-YYYY
    [day, month, year] = dateString.split('-').map(Number);
  } else {
    console.warn('Unrecognized dateOfBirth format:', dateString);
    return 'Unknown';
  }
  if (isNaN(month) || isNaN(day)) {
    console.warn('Invalid dateOfBirth format:', dateString);
    return 'Unknown';
  }
  const mmdd = `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  for (const z of zodiacSigns) {
    if (mmdd >= z.start && mmdd <= z.end) {
      return z.sign;
    }
  }
  return 'Unknown';
}

const schema = buildSchema(`
  type ZodiacChart {
    sunSign: String
    dateOfBirth: String
    timeOfBirth: String
    city: String
    country: String
  }

  type Query {
    zodiacChart(email: String!): ZodiacChart
  }
`);

const root = {
  zodiacChart: async ({ email }: { email: string }) => {
    

    const [rows] = await connection.execute(
      'SELECT dateOfBirth, timeOfBirth, city, country FROM users WHERE email = ?',
      [email]
    );
    await connection.end();

    if (Array.isArray(rows) && rows.length > 0) {
      const user = rows[0] as any;
      console.log('Fetched user for zodiacChart:', user);
      if (!user.dateOfBirth) {
        console.warn('No dateOfBirth for user:', email);
        return null;
      }
      // Convert dateOfBirth to YYYY-MM-DD string if it's a Date object
      let dateOfBirthStr = user.dateOfBirth;
      if (user.dateOfBirth instanceof Date) {
        dateOfBirthStr = user.dateOfBirth.toISOString().slice(0, 10);
      }
      const sunSign = getZodiacSign(dateOfBirthStr);
      console.log('dateOfBirth:', dateOfBirthStr, 'sunSign:', sunSign);
      return {
        sunSign,
        dateOfBirth: dateOfBirthStr,
        timeOfBirth: user.timeOfBirth,
        city: user.city,
        country: user.country,
      };
    }
    return null;
  },
};

const router = Router();
router.use(
  '/',
  graphqlHTTP({
    schema,
    rootValue: root,
    graphiql: true,
  })
);

export default router;
