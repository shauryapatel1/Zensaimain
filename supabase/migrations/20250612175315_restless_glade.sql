/*
  # Create profiles and journal entries tables

  1. New Tables
    - `profiles`
      - `user_id` (uuid, primary key, references auth.users)
      - `name` (text, optional display name)
      - `current_streak` (integer, default 0)
      - `best_streak` (integer, default 0)
      - `last_entry_date` (date, tracks last journal entry date)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `journal_entries`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles.user_id)
      - `content` (text, the journal entry)
      - `mood` (text, the emotion category or sentiment)
      - `created_at` (timestamp with default now())
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for users to only access their own data
    - Add policies for authenticated users to insert their own data

  3. Relationships
    - journal_entries.user_id references profiles.user_id (many-to-one)
    - profiles.user_id references auth.users.id (one-to-one)
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text,
  current_streak integer DEFAULT 0 NOT NULL,
  best_streak integer DEFAULT 0 NOT NULL,
  last_entry_date date,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create journal_entries table
CREATE TABLE IF NOT EXISTS journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  content text NOT NULL,
  mood text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles table
CREATE POLICY "Users can view own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create policies for journal_entries table
CREATE POLICY "Users can view own journal entries"
  ON journal_entries
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own journal entries"
  ON journal_entries
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own journal entries"
  ON journal_entries
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own journal entries"
  ON journal_entries
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_journal_entries_user_id ON journal_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_created_at ON journal_entries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_last_entry_date ON profiles(last_entry_date);

-- Create function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER handle_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_journal_entries_updated_at
  BEFORE UPDATE ON journal_entries
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Create function to update streak when journal entry is added
CREATE OR REPLACE FUNCTION public.update_streak_on_entry()
RETURNS trigger AS $$
DECLARE
  entry_date date;
  last_date date;
  current_streak_val integer;
  best_streak_val integer;
BEGIN
  -- Get the date of the new entry
  entry_date := NEW.created_at::date;
  
  -- Get current profile data
  SELECT last_entry_date, current_streak, best_streak
  INTO last_date, current_streak_val, best_streak_val
  FROM profiles
  WHERE user_id = NEW.user_id;
  
  -- Calculate new streak
  IF last_date IS NULL THEN
    -- First entry
    current_streak_val := 1;
  ELSIF entry_date = last_date THEN
    -- Same day, no change to streak
    RETURN NEW;
  ELSIF entry_date = last_date + INTERVAL '1 day' THEN
    -- Consecutive day
    current_streak_val := current_streak_val + 1;
  ELSE
    -- Gap in entries, reset streak
    current_streak_val := 1;
  END IF;
  
  -- Update best streak if current is higher
  IF current_streak_val > best_streak_val THEN
    best_streak_val := current_streak_val;
  END IF;
  
  -- Update profile
  UPDATE profiles
  SET 
    current_streak = current_streak_val,
    best_streak = best_streak_val,
    last_entry_date = entry_date
  WHERE user_id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to update streak on new journal entry
CREATE TRIGGER update_streak_on_journal_entry
  AFTER INSERT ON journal_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_streak_on_entry();