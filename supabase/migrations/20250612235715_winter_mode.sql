/*
  # Mood Tracking System Enhancements

  1. Database Optimizations
    - Add indexes for better query performance
    - Add constraints for data integrity
    - Add triggers for automatic timestamp updates

  2. New Functions
    - Function to calculate mood statistics
    - Function to get mood trends over time
    - Function to validate mood data

  3. Security Enhancements
    - Enhanced RLS policies
    - Data validation constraints
*/

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_journal_entries_mood ON public.journal_entries (mood);
CREATE INDEX IF NOT EXISTS idx_journal_entries_user_mood ON public.journal_entries (user_id, mood);
CREATE INDEX IF NOT EXISTS idx_journal_entries_date_range ON public.journal_entries (user_id, created_at DESC);

-- Add check constraint for mood values
ALTER TABLE public.journal_entries 
ADD CONSTRAINT check_mood_values 
CHECK (mood IN ('struggling', 'low', 'neutral', 'good', 'amazing'));

-- Function to calculate user mood statistics
CREATE OR REPLACE FUNCTION get_user_mood_stats(user_uuid uuid)
RETURNS TABLE (
  mood_level text,
  entry_count bigint,
  percentage numeric
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH mood_counts AS (
    SELECT 
      je.mood,
      COUNT(*) as count
    FROM journal_entries je
    WHERE je.user_id = user_uuid
    GROUP BY je.mood
  ),
  total_count AS (
    SELECT SUM(count) as total FROM mood_counts
  )
  SELECT 
    mc.mood,
    mc.count,
    ROUND((mc.count::numeric / tc.total::numeric) * 100, 1) as percentage
  FROM mood_counts mc
  CROSS JOIN total_count tc
  ORDER BY 
    CASE mc.mood
      WHEN 'struggling' THEN 1
      WHEN 'low' THEN 2
      WHEN 'neutral' THEN 3
      WHEN 'good' THEN 4
      WHEN 'amazing' THEN 5
    END;
END;
$$;

-- Function to get mood trends over time
CREATE OR REPLACE FUNCTION get_mood_trends(user_uuid uuid, days_back integer DEFAULT 30)
RETURNS TABLE (
  date_created date,
  mood_level text,
  entry_count bigint,
  avg_mood_numeric numeric
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    je.created_at::date as date_created,
    je.mood as mood_level,
    COUNT(*) as entry_count,
    AVG(
      CASE je.mood
        WHEN 'struggling' THEN 1
        WHEN 'low' THEN 2
        WHEN 'neutral' THEN 3
        WHEN 'good' THEN 4
        WHEN 'amazing' THEN 5
      END
    ) as avg_mood_numeric
  FROM journal_entries je
  WHERE je.user_id = user_uuid
    AND je.created_at >= CURRENT_DATE - INTERVAL '%s days' % days_back
  GROUP BY je.created_at::date, je.mood
  ORDER BY je.created_at::date DESC;
END;
$$;

-- Enhanced RLS policies for better security
DROP POLICY IF EXISTS "Users can view own journal entries" ON public.journal_entries;
CREATE POLICY "Users can view own journal entries"
  ON public.journal_entries
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own journal entries" ON public.journal_entries;
CREATE POLICY "Users can insert own journal entries"
  ON public.journal_entries
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND content IS NOT NULL AND trim(content) != '');

DROP POLICY IF EXISTS "Users can update own journal entries" ON public.journal_entries;
CREATE POLICY "Users can update own journal entries"
  ON public.journal_entries
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND content IS NOT NULL AND trim(content) != '');

DROP POLICY IF EXISTS "Users can delete own journal entries" ON public.journal_entries;
CREATE POLICY "Users can delete own journal entries"
  ON public.journal_entries
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to validate and clean journal entry content
CREATE OR REPLACE FUNCTION validate_journal_entry()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Trim whitespace and validate content
  NEW.content = trim(NEW.content);
  
  IF NEW.content = '' THEN
    RAISE EXCEPTION 'Journal entry content cannot be empty';
  END IF;
  
  -- Validate mood
  IF NEW.mood NOT IN ('struggling', 'low', 'neutral', 'good', 'amazing') THEN
    RAISE EXCEPTION 'Invalid mood value: %', NEW.mood;
  END IF;
  
  -- Set updated_at timestamp
  NEW.updated_at = now();
  
  RETURN NEW;
END;
$$;

-- Create trigger for journal entry validation
DROP TRIGGER IF EXISTS validate_journal_entry_trigger ON public.journal_entries;
CREATE TRIGGER validate_journal_entry_trigger
  BEFORE INSERT OR UPDATE ON public.journal_entries
  FOR EACH ROW
  EXECUTE FUNCTION validate_journal_entry();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_user_mood_stats(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_mood_trends(uuid, integer) TO authenticated;