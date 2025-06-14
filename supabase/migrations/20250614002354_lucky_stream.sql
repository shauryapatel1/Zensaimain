/*
  # Enhanced Badge System with Weekly Goal Tracking

  1. Updates
    - Fix weekly goal badge checking logic
    - Improve badge criteria evaluation
    - Add proper weekly goal frequency checking

  2. Functions
    - Update check_and_award_badges function with corrected weekly goal logic
    - Ensure proper badge awarding for weekly goals based on user's goal frequency
*/

-- Update the check_and_award_badges function with corrected weekly goal logic
CREATE OR REPLACE FUNCTION public.check_and_award_badges(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  badge_record RECORD;
  user_profile RECORD;
  entry_count INTEGER;
  streak_count INTEGER;
  total_entries INTEGER;
  days_since_start INTEGER;
BEGIN
  -- Get user profile data
  SELECT * INTO user_profile FROM public.profiles WHERE user_id = target_user_id;
  
  IF user_profile IS NULL THEN
    RETURN;
  END IF;

  -- Get user statistics
  SELECT COUNT(*) INTO total_entries 
  FROM public.journal_entries 
  WHERE user_id = target_user_id;

  streak_count := user_profile.current_streak;
  
  -- Calculate days since user joined
  days_since_start := EXTRACT(DAY FROM (CURRENT_DATE - user_profile.created_at::date));

  -- Loop through all badges and check criteria
  FOR badge_record IN 
    SELECT b.* FROM public.badges b
    WHERE b.id NOT IN (
      SELECT badge_id FROM public.user_badges WHERE user_id = target_user_id
    )
  LOOP
    -- Check badge criteria and award if met
    CASE 
      -- Streak badges
      WHEN badge_record.criteria->>'type' = 'streak' AND 
           streak_count >= (badge_record.criteria->>'target')::integer THEN
        INSERT INTO public.user_badges (user_id, badge_id) VALUES (target_user_id, badge_record.id);
      
      -- Milestone badges (total entries)
      WHEN badge_record.criteria->>'type' = 'milestone' AND 
           total_entries >= (badge_record.criteria->>'target')::integer THEN
        INSERT INTO public.user_badges (user_id, badge_id) VALUES (target_user_id, badge_record.id);
      
      -- Achievement badges (various criteria)
      WHEN badge_record.criteria->>'type' = 'achievement' AND 
           badge_record.criteria->>'subtype' = 'first_entry' AND 
           total_entries >= 1 THEN
        INSERT INTO public.user_badges (user_id, badge_id) VALUES (target_user_id, badge_record.id);
      
      WHEN badge_record.criteria->>'type' = 'achievement' AND 
           badge_record.criteria->>'subtype' = 'long_entry' AND 
           EXISTS(
             SELECT 1 FROM public.journal_entries 
             WHERE user_id = target_user_id 
             AND LENGTH(content) >= (badge_record.criteria->>'min_length')::integer
           ) THEN
        INSERT INTO public.user_badges (user_id, badge_id) VALUES (target_user_id, badge_record.id);
      
      WHEN badge_record.criteria->>'type' = 'achievement' AND 
           badge_record.criteria->>'subtype' = 'mood_variety' AND 
           (SELECT COUNT(DISTINCT mood) FROM public.journal_entries WHERE user_id = target_user_id) >= 
           (badge_record.criteria->>'min_moods')::integer THEN
        INSERT INTO public.user_badges (user_id, badge_id) VALUES (target_user_id, badge_record.id);
      
      -- Weekly goal
      WHEN badge_record.criteria->>'type' = 'weekly_goal' AND 
           EXISTS(
             -- Check if user has journaled on enough days this week to meet their goal
             WITH week_entries AS (
               SELECT DISTINCT DATE(created_at) as entry_date
               FROM public.journal_entries 
               WHERE user_id = target_user_id 
               AND created_at >= DATE_TRUNC('week', CURRENT_DATE)
               AND created_at < DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '1 week'
             )
             SELECT 1 WHERE (SELECT COUNT(*) FROM week_entries) >= user_profile.journaling_goal_frequency
           ) THEN
        INSERT INTO public.user_badges (user_id, badge_id) VALUES (target_user_id, badge_record.id);
      
      ELSE
        -- Skip other complex criteria for now (time-based, etc.)
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