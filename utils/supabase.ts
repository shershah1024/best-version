import { createClient } from '@supabase/supabase-js';
import { FoodTrackEntry } from '../app/types/nutrition';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient<{
  Tables: {
    food_track: {
      Row: FoodTrackEntry;
      Insert: Omit<FoodTrackEntry, 'id' | 'created_at'>;
      Update: Partial<FoodTrackEntry>;
    };
  };
}>(supabaseUrl, supabaseKey);

export async function insertFoodEntry(entry: Omit<FoodTrackEntry, 'id' | 'created_at'>) {
  const { data, error } = await supabase
    .from('food_track')
    .insert([entry])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getFoodEntries(userEmail: string) {
  const { data, error } = await supabase
    .from('food_track')
    .select('*')
    .eq('user_email', userEmail)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}