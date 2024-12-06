import { createClient } from '@supabase/supabase-js';
import logger from './logger';
import { FoodTrackEntry } from '../app/types/nutrition';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  logger.error('Missing Supabase environment variables', {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseAnonKey
  });
  throw new Error('Missing required Supabase configuration');
}

logger.info('Initializing Supabase client', { url: supabaseUrl });

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Add initialization check
supabase.auth.getSession().then(() => {
  logger.info('Supabase client initialized successfully');
}).catch((error) => {
  logger.error('Failed to initialize Supabase client', error);
});

export async function insertFoodEntry(entry: Omit<FoodTrackEntry, 'id' | 'created_at'>) {
  logger.info('Preparing food entry for insertion', { entry });

  // Ensure macro_nutrients is properly formatted
  const formattedEntry = {
    ...entry,
    macro_nutrients: {
      calories: entry.macro_nutrients.calories || 0,
      protein: entry.macro_nutrients.protein || { grams: 0 },
      carbohydrates: entry.macro_nutrients.carbohydrates || { total: 0 },
      fats: entry.macro_nutrients.fats || { total: 0 }
    }
  };

  logger.info('Formatted food entry', { formattedEntry });

  try {
    const { data, error } = await supabase
      .from('food_track')
      .insert([formattedEntry])
      .select()
      .single();

    if (error) {
      logger.error('Failed to insert food entry', { error, entry: formattedEntry });
      throw error;
    }

    logger.info('Food entry inserted successfully', { data });
    return data;
  } catch (error) {
    logger.error('Error in insertFoodEntry', error);
    throw error;
  }
}