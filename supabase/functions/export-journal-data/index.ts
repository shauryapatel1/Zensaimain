import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

interface ExportRequest {
  user_id: string;
}

interface ExportResponse {
  success: boolean;
  data?: any;
  error?: string;
  timestamp: string;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Validate environment variables
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing required environment variables');
    }

    // Parse request body
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Method not allowed. Use POST.',
          timestamp: new Date().toISOString()
        }),
        {
          status: 405,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const requestData: ExportRequest = await req.json();
    const { user_id } = requestData;

    // Validate input
    if (!user_id || typeof user_id !== 'string') {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'User ID is required',
          timestamp: new Date().toISOString()
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Create Supabase client with service role key
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user_id)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to fetch user profile',
          timestamp: new Date().toISOString()
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Get all journal entries for the user
    const { data: entries, error: entriesError } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false });

    if (entriesError) {
      console.error('Error fetching entries:', entriesError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to fetch journal entries',
          timestamp: new Date().toISOString()
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Prepare export data
    const exportData = {
      export_info: {
        exported_at: new Date().toISOString(),
        user_id: user_id,
        total_entries: entries?.length || 0,
        export_version: '1.0'
      },
      profile: {
        name: profile.name,
        current_streak: profile.current_streak,
        best_streak: profile.best_streak,
        last_entry_date: profile.last_entry_date,
        member_since: profile.created_at
      },
      journal_entries: entries?.map(entry => ({
        id: entry.id,
        content: entry.content,
        mood: entry.mood,
        created_at: entry.created_at,
        updated_at: entry.updated_at
      })) || []
    };

    // Return the export data
    const response: ExportResponse = {
      success: true,
      data: exportData,
      timestamp: new Date().toISOString()
    };

    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );

  } catch (error) {
    console.error('Error exporting data:', error);

    // Return error response
    const errorResponse: ExportResponse = {
      success: false,
      error: 'Data export failed. Please try again.',
      timestamp: new Date().toISOString()
    };

    return new Response(
      JSON.stringify(errorResponse),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});