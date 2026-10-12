export type Gender = 'male' | 'female' | 'other';

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'very_active' | 'athlete';

export type FitnessGoal =
  | 'fat_loss_aggressive'
  | 'fat_loss_moderate'
  | 'maintenance'
  | 'lean_bulk'
  | 'muscle_gain';

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type AppLanguage = 'en' | 'ar' | 'ckb';
export type SupplementCategory = 'vitamin' | 'mineral' | 'supplement' | 'other';
export type SupplementTime = 'morning' | 'afternoon' | 'evening' | 'bedtime';

export interface SupplementRoutineItem {
  id: string;
  name: string;
  category?: SupplementCategory;
  amount?: number;
  unit?: string;
  dose?: string; // legacy or free-text dose
  note?: string;
  time: SupplementTime;
}

export interface SupplementCheck {
  itemId: string;
  taken: boolean;
  takenAt?: string;
}

export interface LoggedDailySupplement {
  id: string;
  routineItemId?: string;
  name: string;
  category?: SupplementCategory;
  amount?: number;
  unit?: string;
  dose?: string;
  note?: string;
  time: SupplementTime;
  taken: boolean;
  takenAt?: string;
}

export interface UserProfile {
  name: string;
  age: number;
  gender: Gender;
  weightKg: number;
  heightCm: number;
  activityLevel: ActivityLevel;
  goal: FitnessGoal;
  bmr: number;
  tdee: number;
  targetCalories: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
  waterTargetGlasses: number;
  language?: AppLanguage;
  isOnboarded?: boolean;
}

export interface FoodItem {
  id: string;
  name: string;
  brand?: string;
  servingSize: string;
  servingGrams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  category?: string;
  barcode?: string;
  fiber?: number;
  sugar?: number;
  sodium?: number; // mg
  potassium?: number; // mg
  calcium?: number; // mg
  iron?: number; // mg
  vitaminC?: number; // mg
}

export interface WeightEntry {
  id: string;
  date: string; // YYYY-MM-DD
  weightKg: number;
  note?: string;
  timestamp: string;
}

export interface LoggedMeal {
  id: string;
  foodId: string;
  name: string;
  brand?: string;
  category?: string;
  mealType: MealType;
  servings: number;
  servingSize: string;
  servingGrams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  potassium?: number;
  calcium?: number;
  iron?: number;
  vitaminC?: number;
  timestamp: string; // ISO string
}

export interface DailyLog {
  date: string; // YYYY-MM-DD
  meals: LoggedMeal[];
  waterGlasses: number;
  steps: number;
  supplements?: SupplementCheck[];
  dailySupplements?: LoggedDailySupplement[];
}

export interface TimeSetting {
  hour: number;
  minute: number;
  enabled: boolean;
}

export interface WaterReminderSetting {
  enabled: boolean;
  intervalHours: number;
  startHour: number;
  endHour: number;
}

export interface ReminderSettings {
  supplementsEnabled: boolean;
  supplementTimes: Record<SupplementTime, TimeSetting>;
  water: WaterReminderSetting;
  meals: Record<MealType, TimeSetting>;
}
