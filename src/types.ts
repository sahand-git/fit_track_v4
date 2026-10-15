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
  includeWorkoutsInCalorieBudget?: boolean; // off by default: workout burn is tracked without inflating food budget
  stepGoal?: number;
}

export type ExerciseCategory = 'strength' | 'cardio' | 'hiit' | 'sports' | 'flexibility';

export interface ExerciseSet {
  setNum: number;
  weightKg?: number;
  reps?: number;
  completed?: boolean;
}

export interface WorkoutEntry {
  id: string;
  name: string;
  category: ExerciseCategory;
  durationMinutes: number;
  caloriesBurned: number;
  sets?: ExerciseSet[];
  loggedAt: string;
  calorieSource?: 'user_entered' | 'met_estimate';
  note?: string;
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
  imageUrl?: string;
  source?: 'verified_database' | 'usda_sr28' | 'custom' | 'open_food_facts' | 'ai_estimated';
  fiber?: number;
  sugar?: number; // Canonical sugar content in grams
  sugars?: number; // Maintained for database schema compatibility
  nutriScore?: string;
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
  barcode?: string;
  source?: 'verified_database' | 'usda_sr28' | 'custom' | 'open_food_facts' | 'ai_estimated';
  timestamp: string; // ISO string
}

export interface DailyLog {
  date: string; // YYYY-MM-DD
  meals: LoggedMeal[];
  waterGlasses: number;
  steps: number;
  supplements?: SupplementCheck[];
  dailySupplements?: LoggedDailySupplement[];
  workouts?: WorkoutEntry[];
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

export interface FitTrackBackup {
  version: '4.0';
  exportedAt: string;
  profile: UserProfile;
  dailyLogs: Record<string, DailyLog>;
  supplementRoutine: SupplementRoutineItem[];
  weightHistory: WeightEntry[];
  reminderSettings?: ReminderSettings;
  recentFoods?: FoodItem[];
  favoriteFoods?: FoodItem[];
  customFoods?: FoodItem[];
  barcodeCache?: FoodItem[];
}

export interface BackupSummary {
  daysCount: number;
  mealsCount: number;
  workoutsCount: number;
  weightsCount: number;
  routineItemsCount: number;
  hasProfile: boolean;
  hasReminders: boolean;
}
