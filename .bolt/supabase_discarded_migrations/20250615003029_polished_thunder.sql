/*
  # Add Subscription Fields to Profiles Table

  1. Schema Changes
    - Add `subscription_status` column to track subscription status (free, premium, cancelled, expired)
    - Add `subscription_tier` column to track subscription tier (free, premium, premium_plus)
    - Add `subscription_expires_at` column to track when the subscription expires
    - Add `revenuecat_user_id` column to store the Stripe customer ID

  2. Indexes
    - Add index for `subscription_status` for faster queries
    - Add index for `revenuecat_user_id` for faster lookups

  3. Constraints
    - Add check constraint for `subscription_status` to ensure valid values
    - Add check constraint for `subscription_tier` to ensure valid values
*/

-- Add subscription fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'free'::text,
ADD COLUMN IF NOT EXISTS subscription_tier text DEFAULT 'free'::text,
ADD COLUMN IF NOT EXISTS subscription_expires_at timestamptz,
ADD COLUMN IF NOT EXISTS revenuecat_user_id text;

-- Add check constraints for subscription fields
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_subscription_status_check 
CHECK (subscription_status = ANY (ARRAY['free'::text, 'premium'::text, 'cancelled'::text, 'expired'::text]));

ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_subscription_tier_check 
CHECK (subscription_tier = ANY (ARRAY['free'::text, 'premium'::text, 'premium_plus'::text]));

-- Add indexes for subscription fields
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_status ON public.profiles(subscription_status);
CREATE INDEX IF NOT EXISTS idx_profiles_revenuecat_user_id ON public.profiles(revenuecat_user_id);

-- Add premium badges
INSERT INTO public.badges (name, description, icon, category, criteria, rarity) VALUES
('Premium Member', 'Subscribed to Zensai Premium', '👑', 'special', '{"type": "subscription", "tier": "premium"}', 'rare'),
('Premium Plus', 'Subscribed to Zensai Premium Yearly Plan', '✨', 'special', '{"type": "subscription", "tier": "premium_plus"}', 'epic'),
('Early Supporter', 'One of the first premium subscribers', '🏆', 'special', '{"type": "early_supporter"}', 'legendary')
ON CONFLICT DO NOTHING;

-- Update check_and_award_badges function to check for subscription badges
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
  weekly_days_count INTEGER;
  subscription_status TEXT;
  subscription_tier TEXT;
BEGIN
  -- Get user profile for reference
  SELECT * INTO user_profile FROM public.profiles WHERE user_id = target_user_id;
  
  IF user_profile IS NULL THEN
    RETURN;
  END IF;

  -- Get subscription status and tier
  subscription_status := user_profile.subscription_status;
  subscription_tier := user_profile.subscription_tier;

  -- Loop through all badges to check criteria
  FOR badge_record IN SELECT * FROM public.badges LOOP
    -- Skip if user already has this badge
    IF EXISTS(SELECT 1 FROM public.user_badges WHERE user_id = target_user_id AND badge_id = badge_record.id) THEN
      CONTINUE;
    END IF;

    -- Check badge criteria based on type
    CASE 
      -- First entry milestone
      WHEN badge_record.criteria->>'type' = 'first_entry' THEN
        IF EXISTS(SELECT 1 FROM public.journal_entries WHERE user_id = target_user_id LIMIT 1) THEN
          INSERT INTO public.user_badges (user_id, badge_id) VALUES (target_user_id, badge_record.id);
        END IF;

      -- Entry count milestones
      WHEN badge_record.criteria->>'type' = 'entry_count' THEN
        SELECT COUNT(*) INTO entry_count FROM public.journal_entries WHERE user_id = target_user_id;
        IF entry_count >= (badge_record.criteria->>'target')::integer THEN
          INSERT INTO public.user_badges (user_id, badge_id) VALUES (target_user_id, badge_record.id);
        END IF;

      -- Streak milestones
      WHEN badge_record.criteria->>'type' = 'streak' THEN
        IF user_profile.current_streak >= (badge_record.criteria->>'target')::integer THEN
          INSERT INTO public.user_badges (user_id, badge_id) VALUES (target_user_id, badge_record.id);
        END IF;

      -- Weekly goal achievement
      WHEN badge_record.criteria->>'type' = 'weekly_goal' THEN
        -- Count unique days journaled this week
        WITH week_entries AS (
          SELECT DISTINCT DATE(created_at) as entry_date
          FROM public.journal_entries 
          WHERE user_id = target_user_id 
          AND created_at >= DATE_TRUNC('week', CURRENT_DATE)
          AND created_at < DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '1 week'
        )
        SELECT COUNT(*) INTO weekly_days_count FROM week_entries;
        
        -- Award badge if weekly goal is met
        IF weekly_days_count >= user_profile.journaling_goal_frequency THEN
          INSERT INTO public.user_badges (user_id, badge_id) VALUES (target_user_id, badge_record.id);
        END IF;

      -- Long entry achievement
      WHEN badge_record.criteria->>'type' = 'long_entry' THEN
        IF EXISTS(
          SELECT 1 FROM public.journal_entries 
          WHERE user_id = target_user_id 
          AND LENGTH(content) >= (badge_record.criteria->>'min_length')::integer
        ) THEN
          INSERT INTO public.user_badges (user_id, badge_id) VALUES (target_user_id, badge_record.id);
        END IF;

      -- Mood diversity achievement
      WHEN badge_record.criteria->>'type' = 'mood_diversity' THEN
        IF (
          SELECT COUNT(DISTINCT mood) 
          FROM public.journal_entries 
          WHERE user_id = target_user_id
        ) >= (badge_record.criteria->>'target')::integer THEN
          INSERT INTO public.user_badges (user_id, badge_id) VALUES (target_user_id, badge_record.id);
        END IF;

      -- Subscription badges
      WHEN badge_record.criteria->>'type' = 'subscription' THEN
        IF subscription_status = 'premium' AND (
          (badge_record.criteria->>'tier')::text = subscription_tier OR
          (badge_record.criteria->>'tier')::text = 'premium' AND subscription_tier IN ('premium', 'premium_plus')
        ) THEN
          INSERT INTO public.user_badges (user_id, badge_id) VALUES (target_user_id, badge_record.id);
        END IF;

      ELSE
        -- Skip other complex criteria for now
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

-- Create trigger to check badges when subscription status changes
CREATE OR REPLACE FUNCTION public.check_badges_on_subscription_update()
RETURNS trigger AS $$
BEGIN
  -- Check badges when subscription status or tier changes
  PERFORM public.check_and_award_badges(NEW.user_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER check_badges_on_subscription_update
  AFTER UPDATE ON public.profiles
  FOR EACH ROW 
  WHEN (
    OLD.subscription_status IS DISTINCT FROM NEW.subscription_status OR 
    OLD.subscription_tier IS DISTINCT FROM NEW.subscription_tier
  )
  EXECUTE FUNCTION public.check_badges_on_subscription_update();