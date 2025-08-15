// src/supabaseClient.ts

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Supabase credentials not found in .env file");
}

// Create and export the Supabase client
export const supabase = createClient(supabaseUrl, supabaseKey);