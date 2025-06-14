import { corsHeaders } from '../_shared/cors.ts';

const OPENAI_API_KEY = Deno.env.get('OPENAI_KEY');

interface AffirmationRequest {
  entry: string;
  mood: string;
  name?: string;
}

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

interface AffirmationResponse {
  success: boolean;
  affirmation: string;
  generated_by: 'ai' | 'fallback';
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
    // Validate API key
    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    // Parse request body
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Method not allowed. Use POST.',
          affirmation: 'You are worthy of love and kindness, especially from yourself.',
          generated_by: 'fallback',
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

    const requestData: AffirmationRequest = await req.json();
    const { entry, mood, name } = requestData;

    // Validate input
    if (!entry || typeof entry !== 'string' || entry.trim().length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Journal entry text is required',
          affirmation: 'You took time to reflect today, and that shows your commitment to growth.',
          generated_by: 'fallback',
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

    if (!mood || typeof mood !== 'string') {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Mood is required',
          affirmation: 'Your feelings are valid, and you have the strength to navigate whatever comes your way.',
          generated_by: 'fallback',
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

    // Truncate very long entries to avoid token limits
    const truncatedEntry = entry.length > 1500 ? entry.substring(0, 1500) + '...' : entry;

    // Create system prompt for affirmation generation
    const systemPrompt = `You are Zeno, a wise, compassionate, and encouraging fox companion who provides personalized affirmations to support people's mental wellness journey. Your role is to create short, heartfelt affirmations that acknowledge the user's current emotional state while offering hope, strength, and gentle encouragement.

Guidelines for affirmations:
- Keep it to 1-2 sentences maximum (under 100 words)
- Use a warm, caring, and supportive tone as if speaking to a dear friend
- Acknowledge their current feelings without dismissing them
- Offer gentle encouragement and remind them of their inner strength
- Be specific to their mood and journal content when possible
- Avoid toxic positivity - don't tell them to "just be happy"
- Focus on self-compassion, resilience, and hope
- Use "you" statements to make it personal and direct

Mood-specific guidance:
- Struggling/Low: Acknowledge their pain, remind them of their strength, offer hope
- Neutral: Encourage continued reflection and growth
- Good/Amazing: Celebrate their positive energy and encourage them to savor it

${name ? `The user's name is ${name}, so you can personalize the affirmation if appropriate.` : ''}

Current mood: ${mood}

Respond with ONLY the affirmation text. Do not include quotation marks, prefixes, or explanations.`;

    // Call OpenAI API
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: `Based on this journal entry and the detected mood of "${mood}", please create a personalized affirmation: "${truncatedEntry}"`
          }
        ],
        max_tokens: 100,
        temperature: 0.7,
        top_p: 0.9,
      }),
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.text();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${openaiResponse.status}`);
    }

    const openaiData: OpenAIResponse = await openaiResponse.json();
    
    if (!openaiData.choices || openaiData.choices.length === 0) {
      throw new Error('No response from OpenAI');
    }

    const generatedAffirmation = openaiData.choices[0].message.content.trim();

    // Clean up the affirmation (remove quotes if present)
    const cleanAffirmation = generatedAffirmation.replace(/^["']|["']$/g, '');

    // Return the affirmation
    const response: AffirmationResponse = {
      success: true,
      affirmation: cleanAffirmation,
      generated_by: 'ai',
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
    console.error('Error generating affirmation:', error);

    // Return mood-specific fallback affirmations
    const fallbackAffirmations = {
      struggling: [
        "Your courage to face difficult emotions shows incredible strength. You are not alone in this journey.",
        "Even in your darkest moments, you have a light within you that cannot be extinguished.",
        "It's okay to not be okay right now. Your feelings are valid, and you have the resilience to get through this."
      ],
      low: [
        "Your willingness to acknowledge your feelings shows wisdom and self-awareness.",
        "Tomorrow brings new possibilities, and you have the strength to embrace them.",
        "You are worthy of compassion, especially from yourself."
      ],
      neutral: [
        "Your commitment to reflection and growth is something to be proud of.",
        "Every moment of mindfulness is a step toward greater self-understanding.",
        "You are exactly where you need to be in your journey right now."
      ],
      good: [
        "Your positive energy is a gift to yourself and those around you.",
        "You have the power to create more moments like this in your life.",
        "Your joy is valid and deserves to be celebrated."
      ],
      amazing: [
        "Your radiant energy lights up the world around you. Savor this beautiful moment.",
        "You are living proof that happiness and joy are always possible.",
        "Your enthusiasm for life is inspiring and contagious."
      ]
    };

    // Get fallback based on mood, default to neutral
    const moodKey = req.method === 'POST' ? 
      (await req.json().catch(() => ({ mood: 'neutral' }))).mood?.toLowerCase() || 'neutral' : 
      'neutral';
    
    const affirmations = fallbackAffirmations[moodKey as keyof typeof fallbackAffirmations] || fallbackAffirmations.neutral;
    const fallbackAffirmation = affirmations[Math.floor(Math.random() * affirmations.length)];

    const fallbackResponse: AffirmationResponse = {
      success: true,
      affirmation: fallbackAffirmation,
      generated_by: 'fallback',
      error: 'AI generation failed, using fallback affirmation',
      timestamp: new Date().toISOString()
    };

    return new Response(
      JSON.stringify(fallbackResponse),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});