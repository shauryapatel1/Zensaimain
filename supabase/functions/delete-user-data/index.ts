import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

interface DeleteRequest {
  user_id: string;
}

interface DeleteResponse {
  success: boolean;
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

    const requestData: DeleteRequest = await req.json();
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

    // Delete journal entries first (due to foreign key constraints)
    const { error: entriesError } = await supabase
      .from('journal_entries')
      .delete()
      .eq('user_id', user_id);

    if (entriesError) {
      console.error('Error deleting journal entries:', entriesError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to delete journal entries',
          timestamp: new Date().toISOString()
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Delete user profile
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('user_id', user_id);

    if (profileError) {
      console.error('Error deleting profile:', profileError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to delete user profile',
          timestamp: new Date().toISOString()
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Delete user from auth.users table
    const { error: authError } = await supabase.auth.admin.deleteUser(user_id);

    if (authError) {
      console.error('Error deleting auth user:', authError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to delete user account',
          timestamp: new Date().toISOString()
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Return success response
    const response: DeleteResponse = {
      success: true,
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
    console.error('Error deleting user data:', error);

    // Return error response
    const errorResponse: DeleteResponse = {
      success: false,
      error: 'Account deletion failed. Please try again.',
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