export interface IWeeklyHoroscope {
  id: string;
  weekStartDate: Date;
  weekEndDate: Date;
  zodiacSign?: string;
  dailyHoroscopes: IDailyHoroscope[];
  weeklyOverview?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type IWeekdays =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export interface IDailyHoroscope {
  id: string;
  weekday: IWeekdays;
  date: Date;
  zodiacSign: string;
  title: string;
  prediction: string;
  loveLife?: string;
  career?: string;
  health?: string;
  finances?: string;
  luckyNumbers?: number[];
  luckyColors?: string[];
  compatibility?: string[];
  mood: "excellent" | "good" | "neutral" | "challenging" | "difficult";
  energy: "high" | "medium" | "low";
  imageUrl?: string;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}