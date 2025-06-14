/*
  # Add photo attachments to journal entries

  1. Schema Changes
    - Add `photo_url` column to `journal_entries` table
    - Add `photo_filename` column for tracking original filenames
    - Add indexes for better performance

  2. Storage Setup
    - Instructions for creating storage bucket and RLS policies
    - Bucket name: journal-photos
    - File organization: user_id/entry_id_timestamp.ext

  3. Security
    - RLS policies ensure users can only access their own photos
    - File naming prevents conflicts and unauthorized access
*/

-- Add photo columns to journal_entries table
ALTER TABLE public.journal_entries 
ADD COLUMN IF NOT EXISTS photo_url text,
ADD COLUMN IF NOT EXISTS photo_filename text;

-- Add index for photo queries
CREATE INDEX IF NOT EXISTS idx_journal_entries_photo ON public.journal_entries(user_id, photo_url) WHERE photo_url IS NOT NULL;

-- Update the validation function to handle photo fields
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

/*
  MANUAL SETUP REQUIRED IN SUPABASE DASHBOARD:

  1. Create Storage Bucket:
     - Go to Storage in Supabase Dashboard
     - Create new bucket named: journal-photos
     - Make it private (not public)

  2. Create RLS Policies for Storage:
     
     Policy 1 - Allow users to upload their own photos:
     ```sql
     CREATE POLICY "Users can upload own photos" ON storage.objects
     FOR INSERT TO authenticated
     WITH CHECK (bucket_id = 'journal-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
     ```
     
     Policy 2 - Allow users to view their own photos:
     ```sql
     CREATE POLICY "Users can view own photos" ON storage.objects
     FOR SELECT TO authenticated
     USING (bucket_id = 'journal-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
     ```
     
     Policy 3 - Allow users to delete their own photos:
     ```sql
     CREATE POLICY "Users can delete own photos" ON storage.objects
     FOR DELETE TO authenticated
     USING (bucket_id = 'journal-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
     ```

  3. File Structure:
     Photos will be stored as: journal-photos/{user_id}/{entry_id}_{timestamp}.{ext}
*/