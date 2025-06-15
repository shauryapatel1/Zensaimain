/*
  # Add title column to journal entries

  1. Schema Changes
    - Add `title` column to `journal_entries` table
    - Make it nullable to support existing entries
    - Update validation function to handle title field

  2. Purpose
    - Allow users to add titles to their journal entries
    - Improve organization and searchability of entries
    - Enhance the journal experience for all users (free and premium)
*/

-- Add title column to journal_entries table
ALTER TABLE public.journal_entries 
ADD COLUMN IF NOT EXISTS title text;

-- Update the validation function to handle the title field
CREATE OR REPLACE FUNCTION public.validate_journal_entry()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Trim whitespace and validate content
  NEW.content = trim(NEW.content);
  
  IF NEW.content = '' THEN
    RAISE EXCEPTION 'Journal entry content cannot be empty';
  END IF;
  
  -- Trim title if provided
  IF NEW.title IS NOT NULL THEN
    NEW.title = trim(NEW.title);
    
    -- If title is empty after trimming, set to NULL
    IF NEW.title = '' THEN
      NEW.title = NULL;
    END IF;
  END IF;
  
  -- Validate mood
  IF NEW.mood NOT IN ('struggling', 'low', 'neutral', 'good', 'amazing') THEN
    RAISE EXCEPTION 'Invalid mood value: %', NEW.mood;
  END IF;
  
  -- Validate photo_url format if provided
  IF NEW.photo_url IS NOT NULL AND NEW.photo_url != '' THEN
    -- Basic URL validation - should start with expected Supabase storage URL pattern
    IF NEW.photo_url !~ '^https?://.*' THEN
      RAISE EXCEPTION 'Invalid photo URL format';
    END IF;
  END IF;
  
  -- Set updated_at timestamp
  NEW.updated_at = now();
  
  RETURN NEW;
END;
$$;

-- Create index for title search
CREATE INDEX IF NOT EXISTS idx_journal_entries_title ON public.journal_entries USING gin (to_tsvector('english', COALESCE(title, '')));