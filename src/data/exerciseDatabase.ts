import { ExerciseCategory } from '../types';

export interface ExercisePreset {
  id: string;
  name: string;
  category: ExerciseCategory;
  metValue: number; // Metabolic Equivalent of Task
  defaultMinutes: number;
  description: string;
}

export const EXERCISE_DATABASE: ExercisePreset[] = [
  { id: 'ex_weightlifting_mod', name: 'Weightlifting (Hypertrophy / Machines)', category: 'strength', metValue: 5.0, defaultMinutes: 45, description: 'Moderate resistance training with rest intervals' },
  { id: 'ex_weightlifting_heavy', name: 'Heavy Powerlifting / Barbell Compound', category: 'strength', metValue: 6.0, defaultMinutes: 60, description: 'Squat, Bench, Deadlift compound lifts' },
  { id: 'ex_bodyweight_calisthenics', name: 'Calisthenics & Bodyweight Training', category: 'strength', metValue: 4.8, defaultMinutes: 30, description: 'Pull-ups, dips, push-ups, core' },
  { id: 'ex_running_moderate', name: 'Outdoor Running (8 km/h / 5 mph)', category: 'cardio', metValue: 8.3, defaultMinutes: 30, description: 'Moderate steady pace jogging' },
  { id: 'ex_running_fast', name: 'Running / Sprinting (10.8 km/h / 6.7 mph)', category: 'cardio', metValue: 11.0, defaultMinutes: 20, description: 'Fast pace interval running' },
  { id: 'ex_treadmill_incline', name: 'Incline Treadmill Zone 2 Walk (12-3-30)', category: 'cardio', metValue: 6.5, defaultMinutes: 30, description: '12% incline, 3 mph brisk fat burn walk' },
  { id: 'ex_cycling_outdoor', name: 'Outdoor Cycling (Moderate)', category: 'cardio', metValue: 7.5, defaultMinutes: 45, description: 'Road or trail bicycle riding' },
  { id: 'ex_stationary_bike', name: 'Stationary Spin Bike', category: 'cardio', metValue: 6.8, defaultMinutes: 30, description: 'Indoor cycling class or steady resistance' },
  { id: 'ex_jump_rope', name: 'Jump Rope / Skipping', category: 'hiit', metValue: 11.8, defaultMinutes: 15, description: 'High intensity skipping rope' },
  { id: 'ex_hiit_circuit', name: 'HIIT Circuit / Tabata', category: 'hiit', metValue: 8.0, defaultMinutes: 25, description: 'High intensity interval training with bursts' },
  { id: 'ex_swimming_freestyle', name: 'Swimming (Freestyle Laps)', category: 'cardio', metValue: 7.0, defaultMinutes: 30, description: 'Continuous pool swimming' },
  { id: 'ex_boxing', name: 'Boxing / Heavy Bag / Kickboxing', category: 'sports', metValue: 9.0, defaultMinutes: 40, description: 'Punching combinations & footwork' },
  { id: 'ex_basketball', name: 'Basketball / Football / Soccer', category: 'sports', metValue: 8.0, defaultMinutes: 60, description: 'Competitive active sports play' },
  { id: 'ex_yoga_vinyasa', name: 'Vinyasa / Power Yoga', category: 'flexibility', metValue: 3.5, defaultMinutes: 45, description: 'Dynamic flow and body holds' },
  { id: 'ex_stretching_mobility', name: 'Stretching & Joint Mobility', category: 'flexibility', metValue: 2.3, defaultMinutes: 20, description: 'Cooldown flexibility and foam rolling' }
];

/**
 * Calculates estimated calorie burn based on MET, duration, and body weight:
 * Calories = MET * 3.5 * weightKg / 200 * durationMinutes
 */
export function estimateWorkoutCalories(metValue: number, durationMinutes: number, weightKg: number): number {
  if (durationMinutes <= 0 || weightKg <= 0) return 0;
  const burn = (metValue * 3.5 * weightKg * durationMinutes) / 200;
  return Math.round(burn);
}
