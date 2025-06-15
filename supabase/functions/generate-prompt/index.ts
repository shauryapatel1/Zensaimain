import { corsHeaders } from '../_shared/cors.ts';

const OPENAI_API_KEY = Deno.env.get('OPENAI_KEY');

interface PromptRequest {
  name?: string;
  mood?: string;
  previousPrompts?: string[];
}

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
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
    // Validate API key - check for existence and non-empty string
    if (!OPENAI_API_KEY || OPENAI_API_KEY.trim() === '') {
      throw new Error('OpenAI API key not configured or empty');
    }

    // Parse request body (optional)
    let requestData: PromptRequest = {};
    if (req.method === 'POST') {
      try {
        requestData = await req.json();
      } catch {
        // If no body or invalid JSON, use defaults
        requestData = {};
      }
    }

    const { name, mood, previousPrompts = [] } = requestData;

    // Create personalized system prompt
    const systemPrompt = `You are Zeno, a wise and caring fox companion who helps people with their mental wellness through journaling. Your role is to generate thoughtful, encouraging daily journaling prompts that help users reflect on their experiences, emotions, and growth.

Guidelines for prompts:
- Keep prompts concise (1-2 sentences max)
- Use a warm, supportive, and encouraging tone
- Focus on positive reflection, gratitude, self-discovery, or gentle introspection
- Avoid overly complex or heavy topics
- Make prompts accessible and relatable to daily life
- Encourage mindfulness and self-compassion
- Vary the themes: gratitude, growth, relationships, achievements, feelings, future hopes, etc.

${name ? `The user's name is ${name}, so you can personalize the prompt if appropriate.` : ''}
${mood ? `The user's current mood is: ${mood}. Consider this when crafting the prompt.` : ''}
${previousPrompts.length > 0 ? `Avoid repeating these recent prompts: ${previousPrompts.join(', ')}` : ''}

Generate ONE journaling prompt that would be perfect for today. Return only the prompt text, nothing else.`;

    // Call OpenAI API with trimmed API key
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY.trim()}`,
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
            content: 'Generate a thoughtful journaling prompt for today.'
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

    const generatedPrompt = openaiData.choices[0].message.content.trim();

    // Fallback prompts in case of API issues
    const fallbackPrompts = [
      "What's one small moment from today that brought you joy or made you smile?",
      "If you could give your past self one piece of encouragement, what would it be?",
      "What are three things you're grateful for right now, and why do they matter to you?",
      "How did you show kindness to yourself or others today?",
      "What's something you learned about yourself recently that surprised you?",
      "Describe a moment today when you felt most like yourself.",
      "What's one thing you're looking forward to, and what excites you about it?",
      "How are you feeling right now, and what might be contributing to that feeling?",
      "What would you like to let go of today to make space for something better?",
      "What's one small accomplishment from today that you're proud of?"
    ];

    // Use generated prompt or fallback
    const finalPrompt = generatedPrompt || fallbackPrompts[Math.floor(Math.random() * fallbackPrompts.length)];

    // Return the prompt
    return new Response(
      JSON.stringify({
        success: true,
        prompt: finalPrompt,
        generated_by: generatedPrompt ? 'ai' : 'fallback',
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

  } catch (error) {
    console.error('Error generating prompt:', error);

    // Return fallback prompt on error
    const fallbackPrompts = [
      "What's one thing you're grateful for today, and how has it impacted your day?",
      "How are you feeling right now, and what small step could make you feel even better?",
      "What's something kind you did for yourself or someone else recently?",
      "If today had a color, what would it be and why?",
      "What's one lesson you've learned recently that you'd like to remember?"
    ];

    const fallbackPrompt = fallbackPrompts[Math.floor(Math.random() * fallbackPrompts.length)];

    return new Response(
      JSON.stringify({
        success: true,
        prompt: fallbackPrompt,
        generated_by: 'fallback',
        error: 'AI generation failed, using fallback prompt',
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
});