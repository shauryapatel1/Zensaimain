import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.38.4';
import Stripe from 'npm:stripe@12.18.0';

// Environment variables
const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY');
const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

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
    if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET) {
      throw new Error('Missing Stripe credentials');
    }
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing Supabase credentials');
    }

    // Only allow POST requests
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

    // Get the signature from the headers
    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing Stripe signature',
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

    // Get the raw body
    const body = await req.text();

    // Verify the webhook signature
    let event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Webhook signature verification failed',
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

    // Initialize Supabase client with service role key
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        
        // Get the subscription
        if (session.subscription && session.customer) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
          const customerId = session.customer as string;
          const userId = session.metadata?.userId;
          
          if (!userId) {
            console.error('No userId found in session metadata');
            break;
          }
          
          // Determine subscription tier based on the price
          const priceId = subscription.items.data[0].price.id;
          const isMonthly = priceId === Deno.env.get('STRIPE_PRICE_ID_MONTHLY');
          const tier = isMonthly ? 'premium' : 'premium_plus';
          
          // Update the user's profile with subscription info
          const { error: updateError } = await supabase
            .from('profiles')
            .update({
              subscription_status: 'premium',
              subscription_tier: tier,
              subscription_expires_at: new Date(subscription.current_period_end * 1000).toISOString(),
              revenuecat_user_id: customerId,
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', userId);
          
          if (updateError) {
            console.error('Error updating user profile with subscription info:', updateError);
          }
        }
        break;
      }
      
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        
        // Find the user with this customer ID
        const { data: profiles, error: profileError } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('revenuecat_user_id', customerId);
        
        if (profileError || !profiles || profiles.length === 0) {
          console.error('Error finding user with customer ID:', profileError || 'No user found');
          break;
        }
        
        const userId = profiles[0].user_id;
        
        // Determine subscription status and tier
        let status = 'premium';
        if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
          status = 'cancelled';
        } else if (subscription.cancel_at_period_end) {
          status = 'cancelled'; // Will be cancelled at the end of the period
        }
        
        // Determine subscription tier based on the price
        const priceId = subscription.items.data[0].price.id;
        const isMonthly = priceId === Deno.env.get('STRIPE_PRICE_ID_MONTHLY');
        const tier = isMonthly ? 'premium' : 'premium_plus';
        
        // Update the user's profile with subscription info
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            subscription_status: status,
            subscription_tier: tier,
            subscription_expires_at: new Date(subscription.current_period_end * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId);
        
        if (updateError) {
          console.error('Error updating user profile with subscription info:', updateError);
        }
        break;
      }
      
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        
        // Find the user with this customer ID
        const { data: profiles, error: profileError } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('revenuecat_user_id', customerId);
        
        if (profileError || !profiles || profiles.length === 0) {
          console.error('Error finding user with customer ID:', profileError || 'No user found');
          break;
        }
        
        const userId = profiles[0].user_id;
        
        // Update the user's profile to reflect the cancelled subscription
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            subscription_status: 'expired',
            subscription_tier: 'free',
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId);
        
        if (updateError) {
          console.error('Error updating user profile after subscription deletion:', updateError);
        }
        break;
      }
    }

    // Return a success response
    return new Response(
      JSON.stringify({ success: true, received: true }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error handling webhook:', error);
    
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