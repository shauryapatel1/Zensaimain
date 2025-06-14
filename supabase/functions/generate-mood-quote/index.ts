import { corsHeaders } from '../_shared/cors.ts';

const OPENAI_API_KEY = Deno.env.get('OPENAI_KEY');

interface MoodQuoteRequest {
  mood: string;
  entry?: string;
  name?: string;
  previousQuotes?: string[];
}

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

interface MoodQuoteResponse {
  success: boolean;
  quote: string;
  attribution?: string;
  generated_by: 'ai' | 'fallback';
  error?: string;
  timestamp: string;
}

// Fallback quotes organized by mood
const fallbackQuotes = {
  struggling: [
    { quote: "The wound is the place where the Light enters you.", attribution: "Rumi" },
    { quote: "You are braver than you believe, stronger than you seem, and more loved than you know.", attribution: "A.A. Milne" },
    { quote: "This too shall pass. It might pass like a kidney stone, but it will pass.", attribution: "Unknown" }
  ],
  low: [
    { quote: "Every sunset brings the promise of a new dawn.", attribution: "Ralph Waldo Emerson" },
    { quote: "You have been assigned this mountain to show others it can be moved.", attribution: "Mel Robbins" },
    { quote: "The darkest nights produce the brightest stars.", attribution: "John Green" }
  ],
  neutral: [
    { quote: "The present moment is the only time over which we have dominion.", attribution: "Thích Nhất Hạnh" },
    { quote: "Peace comes from within. Do not seek it without.", attribution: "Buddha" },
    { quote: "In the middle of difficulty lies opportunity.", attribution: "Albert Einstein" }
  ],
  good: [
    { quote: "Happiness is not something ready made. It comes from your own actions.", attribution: "Dalai Lama" },
    { quote: "The best way to take care of the future is to take care of the present moment.", attribution: "Thích Nhất Hạnh" },
    { quote: "Joy is not in things; it is in us.", attribution: "Richard Wagner" }
  ],
  amazing: [
    { quote: "Life is either a daring adventure or nothing at all.", attribution: "Helen Keller" },
    { quote: "The purpose of life is to live it, to taste experience to the utmost.", attribution: "Eleanor Roosevelt" },
    { quote: "Today is a good day to have a good day.", attribution: "Zeno" }
  ]
};

function getFallbackQuote(mood: string): { quote: string; attribution: string } {
  const moodKey = mood?.toLowerCase() || 'neutral';
  const quotes = fallbackQuotes[moodKey as keyof typeof fallbackQuotes] || fallbackQuotes.neutral;
  return quotes[Math.floor(Math.random() * quotes.length)];
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
    // Parse request body
    if (req.method !== 'POST') {
      const fallbackQuote = getFallbackQuote('neutral');
      return new Response(
        JSON.stringify({
          success: true,
          quote: fallbackQuote.quote,
          attribution: fallbackQuote.attribution,
          generated_by: 'fallback',
          error: 'Method not allowed. Use POST.',
          timestamp: new Date().toISOString()
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const requestData: MoodQuoteRequest = await req.json();
    const { mood, entry, name, previousQuotes = [] } = requestData;

    // Validate input
    if (!mood || typeof mood !== 'string') {
      const fallbackQuote = getFallbackQuote('neutral');
      return new Response(
        JSON.stringify({
          success: true,
          quote: fallbackQuote.quote,
          attribution: fallbackQuote.attribution,
          generated_by: 'fallback',
          error: 'Mood is required',
          timestamp: new Date().toISOString()
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // If no OpenAI API key, return fallback immediately
    if (!OPENAI_API_KEY) {
      console.log('OpenAI API key not configured, using fallback quote');
      const fallbackQuote = getFallbackQuote(mood);
      return new Response(
        JSON.stringify({
          success: true,
          quote: fallbackQuote.quote,
          attribution: fallbackQuote.attribution,
          generated_by: 'fallback',
          error: 'OpenAI API key not configured',
          timestamp: new Date().toISOString()
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Try to generate AI quote
    try {
      // Create system prompt for mood quote generation
      const systemPrompt = `You are Zeno, a wise and compassionate fox companion who provides thoughtful quotes and wisdom to support people's mental wellness journey. Your role is to generate or curate meaningful quotes that resonate with the user's current emotional state.

Guidelines for mood quotes:
- Provide short, impactful quotes (1-2 sentences maximum)
- Choose quotes that acknowledge the user's current mood while offering gentle wisdom
- Include proper attribution when using existing quotes from philosophers, authors, or thinkers
- If creating original wisdom, attribute it to "Zeno" or leave unattributed
- Focus on mindfulness, self-compassion, resilience, and hope
- Avoid toxic positivity - don't dismiss difficult emotions
- Make quotes feel personal and relevant to their current state

Mood-specific guidance:
- Struggling/Low: Offer comfort, acknowledge pain, provide hope for healing
- Neutral: Encourage reflection, growth, and mindful awareness
- Good/Amazing: Celebrate positive energy, encourage gratitude and presence

${name ? `The user's name is ${name}.` : ''}
${previousQuotes.length > 0 ? `Avoid repeating these recent quotes: ${previousQuotes.join(', ')}` : ''}

Current mood: ${mood}
${entry ? `Journal context: "${entry.substring(0, 200)}..."` : ''}

Respond with a JSON object containing:
- "quote": the quote text
- "attribution": the author/source (or "Zeno" for original wisdom, or null if unattributed)

Example format:
{"quote": "The wound is the place where the Light enters you.", "attribution": "Rumi"}`;

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
              content: `Generate a thoughtful quote for someone feeling "${mood}".`
            }
          ],
          max_tokens: 150,
          temperature: 0.8,
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

      const responseContent = openaiData.choices[0].message.content.trim();
      
      // Try to parse JSON response
      let quoteData;
      try {
        quoteData = JSON.parse(responseContent);
      } catch {
        // If not JSON, treat as plain quote
        quoteData = { quote: responseContent, attribution: null };
      }

      // Return the AI-generated mood quote
      const response: MoodQuoteResponse = {
        success: true,
        quote: quoteData.quote || responseContent,
        attribution: quoteData.attribution || undefined,
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

    } catch (aiError) {
      console.error('AI generation failed, using fallback:', aiError);
      
      // Return fallback quote when AI fails
      const fallbackQuote = getFallbackQuote(mood);
      const fallbackResponse: MoodQuoteResponse = {
        success: true,
        quote: fallbackQuote.quote,
        attribution: fallbackQuote.attribution,
        generated_by: 'fallback',
        error: 'AI generation failed, using fallback quote',
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

  } catch (error) {
    console.error('Error in mood quote function:', error);

    // Always return a fallback quote, never throw an error
    const fallbackQuote = getFallbackQuote('neutral');
    const fallbackResponse: MoodQuoteResponse = {
      success: true,
      quote: fallbackQuote.quote,
      attribution: fallbackQuote.attribution,
      generated_by: 'fallback',
      error: 'Unexpected error occurred, using fallback quote',
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