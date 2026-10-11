import AsyncStorage from '@react-native-async-storage/async-storage';
import { FoodItem } from '../types';

const GEMINI_API_KEY_STORAGE = '@fittrack_gemini_api_key';

export interface PlateAnalysisItem {
  name: string;
  portionEstimate: string;
  grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  confidence: 'high' | 'medium' | 'low';
}

export interface PlateAnalysisResult {
  mealName: string;
  items: PlateAnalysisItem[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  disclaimer: string;
}

export async function getStoredGeminiApiKey(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(GEMINI_API_KEY_STORAGE);
  } catch {
    return null;
  }
}

export async function setStoredGeminiApiKey(key: string): Promise<void> {
  await AsyncStorage.setItem(GEMINI_API_KEY_STORAGE, key.trim());
}

export async function analyzeMealImage(base64Image: string): Promise<PlateAnalysisResult> {
  const apiKey = await getStoredGeminiApiKey();

  if (!apiKey) {
    throw new Error(
      'API Key Required: AI Meal Photo Analysis uses Google Gemini Vision to estimate foods on your plate. Enter a free Gemini API key to activate this feature, or log food manually.'
    );
  }

  const prompt = `Analyze this food or meal photo. Identify each food item, estimate the portion in grams, and calculate nutritional values (calories, protein in g, carbs in g, fat in g).
Respond ONLY with a JSON object in this exact schema, without markdown backticks or commentary:
{
  "mealName": "Descriptive name of the plate",
  "items": [
    {
      "name": "Food item name",
      "portionEstimate": "e.g. 1 medium breast or 1 cup",
      "grams": 150,
      "calories": 240,
      "protein": 35,
      "carbs": 0,
      "fat": 5,
      "confidence": "high"
    }
  ],
  "disclaimer": "Estimates are visual approximations and may vary based on exact cooking oil and preparation."
}`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: 'image/jpeg',
                  data: base64Image,
                },
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      }),
    });
  } catch {
    throw new Error('Network error connecting to Gemini API. Check your internet connection.');
  }

  if (res.status === 400 || res.status === 403) {
    throw new Error('Invalid Gemini API Key. Please verify your API key in settings.');
  }

  if (!res.ok) {
    throw new Error(`AI service returned code ${res.status}. Please try again shortly.`);
  }

  const json = await res.json();
  const rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!rawText) {
    throw new Error('The AI could not recognize food in this image. Try a clearer angle with good lighting.');
  }

  try {
    const cleaned = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    const items: PlateAnalysisItem[] = (parsed.items || []).map((it: any) => ({
      name: it.name || 'Unspecified Food',
      portionEstimate: it.portionEstimate || '1 serving',
      grams: Number(it.grams) || 100,
      calories: Number(it.calories) || 0,
      protein: Math.round(Number(it.protein) * 10) / 10 || 0,
      carbs: Math.round(Number(it.carbs) * 10) / 10 || 0,
      fat: Math.round(Number(it.fat) * 10) / 10 || 0,
      confidence: (it.confidence === 'high' || it.confidence === 'low') ? it.confidence : 'medium',
    }));

    const totalCalories = items.reduce((s, i) => s + i.calories, 0);
    const totalProtein = Math.round(items.reduce((s, i) => s + i.protein, 0) * 10) / 10;
    const totalCarbs = Math.round(items.reduce((s, i) => s + i.carbs, 0) * 10) / 10;
    const totalFat = Math.round(items.reduce((s, i) => s + i.fat, 0) * 10) / 10;

    return {
      mealName: parsed.mealName || 'Analyzed Meal Plate',
      items,
      totalCalories,
      totalProtein,
      totalCarbs,
      totalFat,
      disclaimer: parsed.disclaimer || 'Visual estimates are approximations.',
    };
  } catch {
    throw new Error('Could not parse nutrition data from the photo. Try searching for this food manually.');
  }
}
