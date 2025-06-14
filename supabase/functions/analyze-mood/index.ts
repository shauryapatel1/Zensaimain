import { corsHeaders } from '../_shared/cors.ts';

const OPENAI_API_KEY = Deno.env.get('OPENAI_KEY');

interface MoodRequest {
  entry: string;
  name?: string;
}

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

interface MoodResponse {
  success: boolean;
  mood: string;
  confidence?: number;
  analysis?: string;
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
          mood: 'neutral',
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

    const requestData: MoodRequest = await req.json();
    const { entry, name } = requestData;

    // Validate input
    if (!entry || typeof entry !== 'string' || entry.trim().length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Journal entry text is required',
          mood: 'neutral',
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
    const truncatedEntry = entry.length > 2000 ? entry.substring(0, 2000) + '...' : entry;

    // Create system prompt for mood analysis
    const systemPrompt = `You are Zeno, a wise and empathetic fox companion who helps people understand their emotions through journaling. Your task is to analyze journal entries and identify the predominant emotional tone.

Guidelines for mood analysis:
- Analyze the overall emotional tone of the entire entry
- Focus on the most prominent emotion expressed
- Consider both explicit emotional words and implicit emotional context
- Be sensitive to nuanced emotions and mixed feelings
- Choose the emotion that best represents the overall feeling

Available mood categories (choose ONE):
- amazing: Extremely positive, joyful, euphoric, ecstatic, thrilled
- good: Happy, content, pleased, satisfied, optimistic, hopeful
- neutral: Calm, balanced, reflective, matter-of-fact, stable
- low: Sad, disappointed, melancholy, down, discouraged
- struggling: Very sad, depressed, overwhelmed, anxious, distressed

${name ? `The user's name is ${name}.` : ''}

Respond with ONLY the mood category (amazing, good, neutral, low, or struggling). Do not include any explanation or additional text.`;

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
            content: `Please analyze the emotional tone of this journal entry: "${truncatedEntry}"`
          }
        ],
        max_tokens: 10,
        temperature: 0.3,
        top_p: 0.8,
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

    const rawMood = openaiData.choices[0].message.content.trim().toLowerCase();
    
    // Validate and normalize the mood response
    const validMoods = ['amazing', 'good', 'neutral', 'low', 'struggling'];
    let finalMood = 'neutral'; // default fallback
    
    // Check if the response matches our valid moods
    for (const mood of validMoods) {
      if (rawMood.includes(mood)) {
        finalMood = mood;
        break;
      }
    }

    // If no valid mood found, try to infer from common emotional words
    if (finalMood === 'neutral' && rawMood) {
      if (rawMood.includes('happy') || rawMood.includes('joy') || rawMood.includes('excited') || rawMood.includes('great')) {
        finalMood = 'good';
      } else if (rawMood.includes('sad') || rawMood.includes('down') || rawMood.includes('disappointed')) {
        finalMood = 'low';
      } else if (rawMood.includes('anxious') || rawMood.includes('stressed') || rawMood.includes('overwhelmed')) {
        finalMood = 'struggling';
      } else if (rawMood.includes('amazing') || rawMood.includes('fantastic') || rawMood.includes('wonderful')) {
        finalMood = 'amazing';
      }
    }

    // Return the mood analysis
    const response: MoodResponse = {
      success: true,
      mood: finalMood,
      confidence: 0.85, // Could be enhanced with actual confidence scoring
      analysis: `Zeno detected a ${finalMood} emotional tone in your entry`,
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
    console.error('Error analyzing mood:', error);

    // Return fallback response on error
    const fallbackResponse: MoodResponse = {
      success: false,
      mood: 'neutral',
      error: 'Mood analysis failed, using neutral as fallback',
      timestamp: new Date().toISOString()
    };

    return new Response(
      JSON.stringify(fallbackResponse),
      {
        status: 200, // Return 200 to avoid breaking the client
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});