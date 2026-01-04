
import { GoogleGenAI, Type, Schema, Modality } from "@google/genai";
import { PodcastScript, ScriptLine, Speaker, SourceFile, UpcomingEvent } from "../types";
import { base64ToUint8Array, createWavBlob } from "../utils/audioUtils";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper for delays
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// --- Image Generation (Custom Topics) ---

export const generateCoverImage = async (topicDescription: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { 
            text: `Generate a high-quality, cinematic podcast cover art for a topic described as: "${topicDescription}". 
            
            Style: Modern, sleek, professional.
            Composition: Use a WIDE, atmospheric shot. 
            Constraint: If the description is vague or broad, use an ABSTRACT representation. Better to be too wide/general than specific and wrong. 
            Do NOT include text.` 
          }
        ]
      },
      config: {
        imageConfig: {
            aspectRatio: "1:1"
        }
      }
    });

    // The SDK returns base64 data in the response parts
    // We need to find the part with inlineData
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    
    throw new Error("No image data found in response");
  } catch (e) {
    console.error("Cover Image Generation Failed", e);
    return ""; // Return empty string to fallback to default images
  }
};

// --- RSS Discovery ---

export const discoverRssFeeds = async (topicDescription: string): Promise<string[]> => {
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `Find 20 valid, publicly accessible, and active RSS feed URLs for the following topic: "${topicDescription}". 
    
    CRITICAL STRATEGY:
    1. If the topic is a BROAD CATEGORY (e.g., "Technology", "Finance"), use standard authoritative feeds (e.g., Wired, CNN, BBC).
    2. If the topic is a SPECIFIC PERSON, BRAND, or NICHE EVENT (e.g., "IShowSpeed", "Taylor Swift", "Local Election"), you MUST use a specific Google News RSS query.
       - Format: https://news.google.com/rss/search?q={URL_ENCODED_TERM}&hl=en-US&gl=US&ceid=US:en
    3. Feeds MUST be specific RSS/XML endpoints (often ending in .xml, .rss, or /feed/).
    4. Feeds MUST be publicly accessible.
    
    Return ONLY a raw JSON array of strings (urls). Do not wrap in markdown code blocks.`,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      }
    }
  });

  const text = response.text;
  if (!text) throw new Error("Failed to discover RSS feeds");

  try {
    return JSON.parse(text) as string[];
  } catch (e) {
    console.error("RSS Discovery Parse Error", e);
    return [];
  }
};

// --- Upcoming Events Generation ---

export const generateUpcomingEvents = async (topics: string[]): Promise<UpcomingEvent[]> => {
  const topicList = topics.join(", ");
  // Use ISO string YYYY-MM-DD for unambiguous date reference
  const today = new Date().toISOString().split('T')[0];

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `Based on the following topics: [${topicList}], identify 15-20 major upcoming real-world events scheduled for the next 30 days starting STRICTLY AFTER today's date (${today}).
    
    CRITICAL INSTRUCTIONS:
    1. The 'date' field MUST be in the future relative to ${today}. DO NOT list past events.
    2. The 'topic' field in the output MUST be one of the exact strings provided in the input list. Do not invent new categories.
    3. If no major events are confirmed for a topic, predict likely recurring events (e.g. "Monthly Jobs Report") or significant expected news.
    4. Aim for DENSITY. Provide as many relevant events as possible up to 20.
    
    Examples of events:
    - Earnings calls, economic reports, IPOs (Finance)
    - Rocket launches, astronomical events, mission updates (Space)
    - Major conferences, product launches, elections, legislation votes (Politics/Tech)
    - Championships, major rivalries, draft days (Sports)
    
    Return a JSON array.`,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            date: { type: Type.STRING, description: "Date of event (YYYY-MM-DD)" },
            title: { type: Type.STRING, description: "Name of the event" },
            topic: { type: Type.STRING, description: "Must match one of the input topics exactly" },
            description: { type: Type.STRING, description: "Brief 1-sentence explanation of why it matters" }
          },
          required: ["date", "title", "topic", "description"]
        }
      }
    }
  });

  const text = response.text;
  if (!text) return [];

  try {
    return JSON.parse(text) as UpcomingEvent[];
  } catch (e) {
    console.error("Events Parse Error", e);
    return [];
  }
};

// --- News Fallback (AI Generation) ---

export const generateNewsFallback = async (topicName: string, description: string): Promise<string> => {
  const today = new Date().toISOString().split('T')[0];
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `The user wants a news update about "${topicName}" (${description}), but we could not fetch real-time RSS feeds.
    
    Act as a news aggregator. Generate 5-7 realistic, high-quality, and plausible news headlines and summaries relevant to this topic based on current general knowledge and trends.
    
    CRITICAL OUTPUT FORMAT:
    You must return a raw string where each line follows this exact format:
    [YYYY-MM-DD] Title: Summary
    
    Example:
    [${today}] New Breakthrough in AI: Researchers announce a new model capable of...
    [${today}] Market Shift: Stocks take a turn as...
    
    Use the date "${today}" for all items.
    `,
    config: {
      temperature: 0.7,
    }
  });

  return response.text || "";
};

// --- Script Generation ---

const scriptSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: "Podcast title" },
    topic: { type: Type.STRING, description: "Main topic" },
    summary: { type: Type.STRING, description: "1 sentence summary." },
    digest: { 
      type: Type.STRING, 
      description: "Educational article summarizing key news/insights. Use standard Markdown formatting (# for headers, - for lists). Strictly NO HTML tags." 
    },
    lines: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          speaker: { type: Type.STRING, enum: [Speaker.Host1, Speaker.Host2] },
          text: { type: Type.STRING, description: "Dialogue" }
        },
        required: ["speaker", "text"]
      }
    }
  },
  required: ["title", "topic", "summary", "digest", "lines"]
};

export interface GenerationOptions {
    duration: number;
    expertise: number;
    format: string;
    language: string;
    tone: string;
}

export const generateScript = async (
  input: string | SourceFile, 
  scriptType: 'standard' | 'news' = 'standard',
  options?: GenerationOptions
): Promise<PodcastScript> => {
  const isFile = typeof input !== 'string';
  
  // Parse options with defaults
  const duration = options?.duration ?? 50;
  const expertise = options?.expertise ?? 50;
  const format = options?.format ?? 'conversational';
  const language = options?.language ?? 'English';
  const tone = options?.tone ?? 'relaxed';

  // --- 1. Duration Logic ---
  let lengthInstruction = "";
  if (duration < 33) {
    lengthInstruction = "LENGTH: VERY CONCISE. Focus only on the most critical high-level points (approx 300 words).";
  } else if (duration > 66) {
    lengthInstruction = "LENGTH: DETAILED DEEP DIVE. Explore nuances, examples, and edge cases (approx 1200 words).";
  } else {
    lengthInstruction = "LENGTH: STANDARD. Balance breadth and depth (approx 600-800 words).";
  }

  // --- 2. Expertise/Audience Logic ---
  let expertiseInstruction = "";
  if (expertise < 33) {
    expertiseInstruction = "AUDIENCE: BEGINNER. Use simple analogies, avoid technical jargon. Assume listener knows nothing.";
  } else if (expertise > 66) {
    expertiseInstruction = "AUDIENCE: EXPERT. Use industry terminology. Skip definitions. Focus on advanced implications.";
  } else {
    expertiseInstruction = "AUDIENCE: GENERAL. Accessible but intelligent.";
  }

  // --- 3. Format Logic ---
  let formatInstruction = "";
  switch (format) {
      case 'debate':
          formatInstruction = `FORMAT: DEBATE. 
          - ${Speaker.Host1}: Takes a strong SUPPORTIVE/OPTIMISTIC stance.
          - ${Speaker.Host2}: Takes a strong OPPOSING/SKEPTICAL stance.
          - They should politely but firmly disagree and challenge each other's points.`;
          break;
      case 'interview':
          formatInstruction = `FORMAT: INTERVIEW. 
          - ${Speaker.Host1}: The curious Interviewer asks questions.
          - ${Speaker.Host2}: The Subject Matter Expert provides deep answers.`;
          break;
      case 'storytelling':
          formatInstruction = `FORMAT: STORYTELLING. 
          - Focus on narrative, history, and the "human element". 
          - Use dramatic pacing. Tell it like a campfire story.`;
          break;
      default: // conversational
          formatInstruction = `FORMAT: CONVERSATIONAL. 
          - Two friends discussing the topic casually. 
          - High energy, back-and-forth banter.`;
          break;
  }

  // --- 4. Tone Logic ---
  let toneInstruction = `TONE: ${tone.toUpperCase()}. `;
  if (tone === 'humorous') toneInstruction += "Include jokes, puns, and witty banter. Keep it lighthearted.";
  if (tone === 'serious') toneInstruction += "Professional, academic, and objective. No jokes.";
  if (tone === 'dramatic') toneInstruction += "Emotional, intense, and captivating.";

  // --- 5. Language Logic ---
  const languageInstruction = `LANGUAGE: STRICTLY GENERATE THE OUTPUT IN ${language}. Ensure cultural nuances match the language.`;

  // Assemble System Prompt
  let systemInstruction = `
    You are an expert podcast producer. 
    
    ROLES:
    - ${Speaker.Host1} (Voice: Kore)
    - ${Speaker.Host2} (Voice: Fenrir)
    
    TASKS:
    1. Create an engaging script following the settings below.
    2. Create a 'digest' article summarizing the content in Markdown (NO HTML).
    
    SETTINGS:
    ${languageInstruction}
    ${lengthInstruction}
    ${expertiseInstruction}
    ${formatInstruction}
    ${toneInstruction}

    STRICTLY use the provided JSON schema.
  `;

  if (scriptType === 'news') {
    systemInstruction += `
      - Format: "Weekly Roundup". 
      - Source: News articles from last 7 days.
      - FILTERING: Only select stories matching the specific focus provided in input.
    `;
  }

  let contentPart;
  if (isFile) {
    const file = input as SourceFile;
    contentPart = [
      { text: "Create a podcast script and digest based on this document." },
      { 
        inlineData: {
          mimeType: file.mimeType,
          data: file.data
        }
      }
    ];
  } else {
    // OPTIMIZATION: Truncate input text to ~40k chars to prevent excessive token usage
    let textInput = input as string;
    if (textInput.length > 40000) {
        textInput = textInput.slice(0, 40000) + "...[TRUNCATED]";
    }
    contentPart = `Source:\n"${textInput}"`;
  }

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: contentPart,
    config: {
      systemInstruction: systemInstruction,
      responseMimeType: 'application/json',
      responseSchema: scriptSchema,
      temperature: 0.7,
    }
  });

  const text = response.text;
  if (!text) throw new Error("No response from AI");

  try {
    return JSON.parse(text) as PodcastScript;
  } catch (e) {
    console.error("JSON Parse Error", e);
    throw new Error("Failed to parse script JSON");
  }
};

// --- Audio Generation ---

export const generateAudio = async (script: PodcastScript): Promise<string> => {
  // Format the script into a single prompt string for the multi-speaker TTS model
  const conversationText = script.lines.map(line => `${line.speaker}: ${line.text}`).join('\n');
  
  const prompt = `
    Generate audio.
    Script:
    ${conversationText}
  `;

  // Retry logic with exponential backoff for robustness
  let lastError;
  const maxRetries = 3;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-tts',
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            multiSpeakerVoiceConfig: {
              speakerVoiceConfigs: [
                {
                  speaker: Speaker.Host1,
                  // 'Kore' is typically softer/female-sounding, providing good contrast to Fenrir
                  voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } 
                },
                {
                  speaker: Speaker.Host2,
                  // 'Fenrir' is deep/authoritative
                  voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Fenrir' } } 
                }
              ]
            }
          }
        }
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      
      if (!base64Audio) {
        throw new Error("No audio data generated");
      }

      const pcmData = base64ToUint8Array(base64Audio);
      // Gemini TTS typically returns 24kHz audio
      const wavBlob = createWavBlob(pcmData, 24000);
      
      return URL.createObjectURL(wavBlob);

    } catch (e) {
      console.warn(`Audio generation attempt ${attempt + 1} failed:`, e);
      lastError = e;
      if (attempt < maxRetries) {
        // Wait 1s, 2s, 4s...
        await delay(1000 * Math.pow(2, attempt));
      }
    }
  }

  throw lastError || new Error("Failed to generate audio after retries");
};
