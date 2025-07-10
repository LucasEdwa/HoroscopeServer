export interface OpenAIConfig {
  model: string;
  maxTokens: number;
  temperature: number;
}

export interface ChartPoint {
  name: string;
  longitude?: number;
  latitude?: number;
  sign: string;
  house?: number;
  degree: number;
  minute: number;
  second?: number;
  planet_type: string;
}

export interface PlanetPosition {
  name: string;
  id: number;
}
