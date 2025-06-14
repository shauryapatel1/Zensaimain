/*
  # Gamification System Implementation

  1. New Tables
    - `badges`
      - `id` (uuid, primary key)
      - `name` (text, badge name like "First Entry", "7-Day Streak")
      - `description` (text, badge description)
      - `icon` (text, emoji or icon identifier)
      - `category` (text, badge category like "streak", "milestone", "achievement")
      - `criteria` (jsonb, criteria for earning the badge)
      - `rarity` (text, badge rarity: common, rare, epic, legendary)
      - `created_at` (timestamp)
    
    - `user_badges`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles.user_id)
      - `badge_id` (uuid, references badges.id)
      - `earned_at` (timestamp)
      - `progress` (jsonb, optional progress data)

  2. Profile Updates
    - Add `journaling_goal_frequency` (integer, weekly goal, default 3)
    - Add `total_badges_earned` (integer, default 0)

  3. Security
    - Enable RLS on new tables
    - Add policies for users to view badges and their earned badges
    - Only system can insert badges, users can't modify them

  4. Functions
    - Function to check and award badges automatically
    - Function to get user's badge progress
*/

-- Create badges table
CREATE TABLE IF NOT EXISTS public.badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL,
  icon text NOT NULL,
  category text NOT NULL CHECK (category IN ('streak', 'milestone', 'achievement', 'special')),
  criteria jsonb NOT NULL,
  rarity text NOT NULL DEFAULT 'common' CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create user_badges table
CREATE TABLE IF NOT EXISTS public.user_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  badge_id uuid NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  earned_at timestamptz DEFAULT now() NOT NULL,
  progress jsonb DEFAULT '{}',
  UNIQUE(user_id, badge_id)
);

-- Add gamification columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS journaling_goal_frequency integer DEFAULT 3 NOT NULL CHECK (journaling_goal_frequency >= 1 AND journaling_goal_frequency <= 7),
ADD COLUMN IF NOT EXISTS total_badges_earned integer DEFAULT 0 NOT NULL;

-- Enable Row Level Security
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

-- Create policies for badges table (read-only for users)
CREATE POLICY "Anyone can view badges"
  ON public.badges
  FOR SELECT
  TO authenticated
  USING (true);

-- Create policies for user_badges table
CREATE POLICY "Users can view own badges"
  ON public.user_badges
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON public.user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_earned_at ON public.user_badges(earned_at DESC);
CREATE INDEX IF NOT EXISTS idx_badges_category ON public.badges(category);

-- Insert initial badge definitions
INSERT INTO public.badges (name, description, icon, category, criteria, rarity) VALUES
-- Streak badges
('First Steps', 'Complete your very first journal entry', '🌱', 'milestone', '{"type": "first_entry"}', 'common'),
('Daily Habit', 'Maintain a 3-day journaling streak', '🔥', 'streak', '{"type": "streak", "days": 3}', 'common'),
('Week Warrior', 'Maintain a 7-day journaling streak', '⚡', 'streak', '{"type": "streak", "days": 7}', 'rare'),
('Consistency King', 'Maintain a 14-day journaling streak', '👑', 'streak', '{"type": "streak", "days": 14}', 'rare'),
('Mindful Master', 'Maintain a 30-day journaling streak', '🧘', 'streak', '{"type": "streak", "days": 30}', 'epic'),
('Zen Legend', 'Maintain a 100-day journaling streak', '🏆', 'streak', '{"type": "streak", "days": 100}', 'legendary'),

-- Milestone badges
('Prolific Writer', 'Write 10 journal entries', '📝', 'milestone', '{"type": "total_entries", "count": 10}', 'common'),
('Storyteller', 'Write 25 journal entries', '📚', 'milestone', '{"type": "total_entries", "count": 25}', 'rare'),
('Chronicle Keeper', 'Write 50 journal entries', '📖', 'milestone', '{"type": "total_entries", "count": 50}', 'epic'),
('Memory Keeper', 'Write 100 journal entries', '🗂️', 'milestone', '{"type": "total_entries", "count": 100}', 'legendary'),

-- Achievement badges
('Mood Explorer', 'Experience all 5 different moods in your entries', '🎭', 'achievement', '{"type": "mood_variety", "moods": ["struggling", "low", "neutral", "good", "amazing"]}', 'rare'),
('Weekly Goal Crusher', 'Meet your weekly journaling goal', '🎯', 'achievement', '{"type": "weekly_goal"}', 'common'),
('Reflection Master', 'Write an entry longer than 500 characters', '💭', 'achievement', '{"type": "long_entry", "min_length": 500}', 'common'),
('Photo Journalist', 'Add your first photo to a journal entry', '📸', 'achievement', '{"type": "first_photo"}', 'common'),

-- Special badges
('Early Bird', 'Journal before 8 AM', '🌅', 'special', '{"type": "time_based", "before": "08:00"}', 'rare'),
('Night Owl', 'Journal after 10 PM', '🌙', 'special', '{"type": "time_based", "after": "22:00"}', 'rare'),
('Weekend Warrior', 'Journal on both Saturday and Sunday in the same week', '🏖️', 'special', '{"type": "weekend_journaling"}', 'rare')
ON CONFLICT DO NOTHING;

-- Function to check and award badges
CREATE OR REPLACE FUNCTION public.check_and_award_badges(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_profile RECORD;
  badge_record RECORD;
  entry_count INTEGER;
  unique_moods TEXT[];
  has_photo_entry BOOLEAN;
  current_streak INTEGER;
  total_entries INTEGER;
BEGIN
  -- Get user profile
  SELECT * INTO user_profile FROM public.profiles WHERE user_id = target_user_id;
  
  IF user_profile IS NULL THEN
    RETURN;
  END IF;

  -- Get user stats
  SELECT COUNT(*) INTO total_entries 
  FROM public.journal_entries 
  WHERE user_id = target_user_id;

  current_streak := user_profile.current_streak;

  -- Check for photo entries
  SELECT EXISTS(
    SELECT 1 FROM public.journal_entries 
    WHERE user_id = target_user_id AND photo_url IS NOT NULL
  ) INTO has_photo_entry;

  -- Get unique moods
  SELECT ARRAY_AGG(DISTINCT mood) INTO unique_moods
  FROM public.journal_entries 
  WHERE user_id = target_user_id;

  -- Loop through all badges and check criteria
  FOR badge_record IN SELECT * FROM public.badges LOOP
    -- Skip if user already has this badge
    IF EXISTS(SELECT 1 FROM public.user_badges WHERE user_id = target_user_id AND badge_id = badge_record.id) THEN
      CONTINUE;
    END IF;

    -- Check badge criteria
    CASE 
      -- First entry
      WHEN badge_record.criteria->>'type' = 'first_entry' AND total_entries >= 1 THEN
        INSERT INTO public.user_badges (user_id, badge_id) VALUES (target_user_id, badge_record.id);
      
      -- Streak badges
      WHEN badge_record.criteria->>'type' = 'streak' AND current_streak >= (badge_record.criteria->>'days')::integer THEN
        INSERT INTO public.user_badges (user_id, badge_id) VALUES (target_user_id, badge_record.id);
      
      -- Total entries milestones
      WHEN badge_record.criteria->>'type' = 'total_entries' AND total_entries >= (badge_record.criteria->>'count')::integer THEN
        INSERT INTO public.user_badges (user_id, badge_id) VALUES (target_user_id, badge_record.id);
      
      -- Mood variety
      WHEN badge_record.criteria->>'type' = 'mood_variety' AND 
           unique_moods @> ARRAY['struggling', 'low', 'neutral', 'good', 'amazing'] THEN
        INSERT INTO public.user_badges (user_id, badge_id) VALUES (target_user_id, badge_record.id);
      
      -- First photo
      WHEN badge_record.criteria->>'type' = 'first_photo' AND has_photo_entry THEN
        INSERT INTO public.user_badges (user_id, badge_id) VALUES (target_user_id, badge_record.id);
      
      -- Long entry (check most recent entries for performance)
      WHEN badge_record.criteria->>'type' = 'long_entry' AND 
           EXISTS(
             SELECT 1 FROM public.journal_entries 
             WHERE user_id = target_user_id 
             AND LENGTH(content) >= (badge_record.criteria->>'min_length')::integer
           ) THEN
        INSERT INTO public.user_badges (user_id, badge_id) VALUES (target_user_id, badge_record.id);
      
      ELSE
        -- Skip other complex criteria for now (time-based, weekly goals, etc.)
        CONTINUE;
    END CASE;
  END LOOP;

  -- Update total badges count
  UPDATE public.profiles 
  SET total_badges_earned = (
    SELECT COUNT(*) FROM public.user_badges WHERE user_id = target_user_id
  )
  WHERE user_id = target_user_id;
END;
$$;

-- Function to get user badge progress
CREATE OR REPLACE FUNCTION public.get_user_badge_progress(target_user_id uuid)
RETURNS TABLE (
  badge_id uuid,
  badge_name text,
  badge_description text,
  badge_icon text,
  badge_category text,
  badge_rarity text,
  earned boolean,
  earned_at timestamptz,
  progress_current integer,
  progress_target integer,
  progress_percentage integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_profile RECORD;
  current_streak INTEGER;
  total_entries INTEGER;
  unique_mood_count INTEGER;
BEGIN
  -- Get user profile and stats
  SELECT * INTO user_profile FROM public.profiles WHERE user_id = target_user_id;
  
  IF user_profile IS NULL THEN
    RETURN;
  END IF;

  SELECT COUNT(*) INTO total_entries FROM public.journal_entries WHERE user_id = target_user_id;
  current_streak := user_profile.current_streak;
  
  SELECT COUNT(DISTINCT mood) INTO unique_mood_count 
  FROM public.journal_entries 
  WHERE user_id = target_user_id;

  -- Return badge progress for all badges
  RETURN QUERY
  SELECT 
    b.id,
    b.name,
    b.description,
    b.icon,
    b.category,
    b.rarity,
    (ub.badge_id IS NOT NULL) as earned,
    ub.earned_at,
    CASE 
      WHEN b.criteria->>'type' = 'streak' THEN current_streak
      WHEN b.criteria->>'type' = 'total_entries' THEN total_entries
      WHEN b.criteria->>'type' = 'mood_variety' THEN unique_mood_count
      ELSE 0
    END as progress_current,
    CASE 
      WHEN b.criteria->>'type' = 'streak' THEN (b.criteria->>'days')::integer
      WHEN b.criteria->>'type' = 'total_entries' THEN (b.criteria->>'count')::integer
      WHEN b.criteria->>'type' = 'mood_variety' THEN 5
      ELSE 1
    END as progress_target,
    CASE 
      WHEN b.criteria->>'type' = 'streak' THEN 
        LEAST(100, (current_streak * 100 / (b.criteria->>'days')::integer))
      WHEN b.criteria->>'type' = 'total_entries' THEN 
        LEAST(100, (total_entries * 100 / (b.criteria->>'count')::integer))
      WHEN b.criteria->>'type' = 'mood_variety' THEN 
        LEAST(100, (unique_mood_count * 100 / 5))
      ELSE 
        CASE WHEN ub.badge_id IS NOT NULL THEN 100 ELSE 0 END
    END as progress_percentage
  FROM public.badges b
  LEFT JOIN public.user_badges ub ON b.id = ub.badge_id AND ub.user_id = target_user_id
  ORDER BY 
    CASE b.rarity 
      WHEN 'common' THEN 1 
      WHEN 'rare' THEN 2 
      WHEN 'epic' THEN 3 
      WHEN 'legendary' THEN 4 
    END,
    b.created_at;
END;
$$;

-- Enhanced trigger function to award badges automatically
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
  
  -- Check and award badges
  PERFORM public.check_and_award_badges(NEW.user_id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.check_and_award_badges(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_badge_progress(uuid) TO authenticated;

-- Create trigger for automatic badge checking on profile updates
CREATE OR REPLACE FUNCTION public.check_badges_on_profile_update()
RETURNS trigger AS $$
BEGIN
  -- Check badges when profile is updated (e.g., goal changes)
  PERFORM public.check_and_award_badges(NEW.user_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER check_badges_on_profile_update
  AFTER UPDATE ON public.profiles
  FOR EACH ROW 
  WHEN (OLD.journaling_goal_frequency IS DISTINCT FROM NEW.journaling_goal_frequency)
  EXECUTE FUNCTION public.check_badges_on_profile_update();