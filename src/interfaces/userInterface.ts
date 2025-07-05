export interface ChartPoint {
  name: string;
  longitude: number;
  latitude: number;
  sign: string;
  house: number;
  degree: number;
  minute: number;
  second: number;
  planet_type: 'planet' | 'point' | 'asteroid';
  distance?: number | null; // Optional field
}

export interface User {
  id: string;
  username: string;
  email: string;
  birthdate: string | null;
  birthtime: string | null;
  birth_city: string | null;
  birth_country: string | null;
  chartPoints: ChartPoint[];
}

export interface UserBirthData {
  user_id: number;
  username: string;
  email: string;
  birthdate: string | null;
  birthtime: string | null;
  birth_city: string | null;
  birth_country: string | null;
}
