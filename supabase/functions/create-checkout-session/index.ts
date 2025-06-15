import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.38.4';
import Stripe from 'npm:stripe@12.18.0';

// Environment variables
const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const APP_URL = Deno.env.get('APP_URL') || 'http://localhost:5173';

// Price IDs for subscription plans
const PRICE_IDS = {
  MONTHLY: Deno.env.get('STRIPE_PRICE_ID_MONTHLY'),
  YEARLY: Deno.env.get('STRIPE_PRICE_ID_YEARLY'),
};

interface CheckoutRequest {
  priceId: string;
  userId: string;
  email: string;
  name?: string;
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
    if (!STRIPE_SECRET_KEY) {
      throw new Error('Missing Stripe secret key');
    }
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing Supabase credentials');
    }
    if (!PRICE_IDS.MONTHLY || !PRICE_IDS.YEARLY) {
      throw new Error('Missing Stripe price IDs');
    }

    // Parse request body
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Method not allowed. Use POST.',
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

    const requestData: CheckoutRequest = await req.json();
    const { priceId, userId, email, name } = requestData;

    // Validate input
    if (!priceId || !userId || !email) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required fields: priceId, userId, and email are required',
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

    // Validate price ID
    if (priceId !== PRICE_IDS.MONTHLY && priceId !== PRICE_IDS.YEARLY) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid price ID',
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

    // Initialize Stripe
    const stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
    });

    // Initialize Supabase client with service role key
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Check if user already has a Stripe customer ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('revenuecat_user_id')
      .eq('user_id', userId)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('Error fetching user profile:', profileError);
      throw new Error('Failed to fetch user profile');
    }

    let customerId = profile?.revenuecat_user_id;

    // Create a new customer if one doesn't exist
    if (!customerId) {
      const customer = await stripe.customers.create({
        email,
        name: name || email.split('@')[0],
        metadata: {
          userId,
        },
      });
      
      customerId = customer.id;
      
      // Update the user's profile with the Stripe customer ID
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ revenuecat_user_id: customerId })
        .eq('user_id', userId);
      
      if (updateError) {
        console.error('Error updating user profile with Stripe customer ID:', updateError);
        // Continue anyway, as the checkout can still work
      }
    }

    // Create a checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      subscription_data: {
        trial_period_days: 7,
        metadata: {
          userId,
        },
      },
      success_url: `${APP_URL}/home?subscription=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${APP_URL}/home?subscription=canceled`,
      metadata: {
        userId,
      },
    });

    // Return the checkout session URL
    return new Response(
      JSON.stringify({
        success: true,
        url: session.url,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error creating checkout session:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
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
});