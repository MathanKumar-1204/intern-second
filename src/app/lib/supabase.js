import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://nbqmcophatpytixxtlzk.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5icW1jb3BoYXRweXRpeHh0bHprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzODk1MDgsImV4cCI6MjA3Njk2NTUwOH0.GkMRNqquCZYXlVmGD24qczJKUN9rAD7ihYAd-F0Fyik";

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
