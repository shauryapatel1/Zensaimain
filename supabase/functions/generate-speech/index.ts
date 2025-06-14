import { corsHeaders } from '../_shared/cors.ts';

const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
const VOICE_ID = 'pNInz6obpgDQGcFmaJgB'; // Adam voice - warm, friendly male voice

interface SpeechRequest {
  text: string;
  voice_settings?: {
    stability: number;
    similarity_boost: number;
    style: number;
    use_speaker_boost: boolean;
  };
}

interface SpeechResponse {
  success: boolean;
  audio_url?: string;
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
    if (!ELEVENLABS_API_KEY) {
      throw new Error('ElevenLabs API key not configured');
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

    const requestData: SpeechRequest = await req.json();
    const { text, voice_settings } = requestData;

    // Validate input
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Text is required for speech generation',
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

    // Limit text length to prevent abuse
    const maxLength = 1000;
    const truncatedText = text.length > maxLength ? text.substring(0, maxLength) + '...' : text;

    // Default voice settings optimized for Zeno's character
    const defaultVoiceSettings = {
      stability: 0.75,
      similarity_boost: 0.85,
      style: 0.2,
      use_speaker_boost: true
    };

    const finalVoiceSettings = { ...defaultVoiceSettings, ...voice_settings };

    // Call ElevenLabs API
    const elevenlabsResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY,
      },
      body: JSON.stringify({
        text: truncatedText,
        model_id: 'eleven_monolingual_v1',
        voice_settings: finalVoiceSettings
      }),
    });

    if (!elevenlabsResponse.ok) {
      const errorData = await elevenlabsResponse.text();
      console.error('ElevenLabs API error:', errorData);
      throw new Error(`ElevenLabs API error: ${elevenlabsResponse.status}`);
    }

    // Get the audio data
    const audioBuffer = await elevenlabsResponse.arrayBuffer();
    
    // Convert to base64 for transmission
    const audioBase64 = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)));
    const audioDataUrl = `data:audio/mpeg;base64,${audioBase64}`;

    // Return the audio data URL
    const response: SpeechResponse = {
      success: true,
      audio_url: audioDataUrl,
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
    console.error('Error generating speech:', error);

    // Return error response
    const errorResponse: SpeechResponse = {
      success: false,
      error: 'Speech generation failed. Please try again.',
      timestamp: new Date().toISOString()
    };

    return new Response(
      JSON.stringify(errorResponse),
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