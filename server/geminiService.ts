import { GoogleGenAI } from '@google/genai';
import { configService } from './configService';

// Resilient Model Fallback Ladder
export const MODEL_FALLBACK_LADDER = [
  'gemini-3.8-flash',
  'gemini-3.1-flash-lite',
  'gemini-3.6-flash',
  'gemini-flash-latest',
  'gemini-3.7-flash',
];

// Lazy Google GenAI Client with dynamic credential re-evaluation
let aiClient: GoogleGenAI | null = null;
let activeApiKey: string | null = null;

export function getGenAI(): GoogleGenAI {
  const currentKey = configService.getGeminiApiKey();

  // If client is missing or active key has changed, re-initialize client instance
  if (!aiClient || activeApiKey !== currentKey) {
    if (!currentKey) {
      console.warn('[GeminiService] GEMINI_API_KEY is not configured in the environment.');
    } else {
      console.log(
        `[GeminiService] Initialized GoogleGenAI with key from ConfigService (length: ${currentKey.length})`
      );
    }
    activeApiKey = currentKey;
    aiClient = new GoogleGenAI({ apiKey: currentKey });
  }

  return aiClient;
}

export interface FallbackParams {
  contents: any;
  systemInstruction?: string;
  responseMimeType?: string;
  temperature?: number;
}

/**
 * Executes content generation with automatic model fallback ladder,
 * error classification, and prepayment depletion protection.
 */
export async function generateContentWithFallback(
  params: FallbackParams
): Promise<{ text: string; modelUsed: string }> {
  const ai = getGenAI();
  let lastError: any = null;

  for (let i = 0; i < MODEL_FALLBACK_LADDER.length; i++) {
    const model = MODEL_FALLBACK_LADDER[i];
    try {
      const config: any = {};
      if (params.systemInstruction) {
        config.systemInstruction = params.systemInstruction;
      }
      if (params.responseMimeType) {
        config.responseMimeType = params.responseMimeType;
      }
      if (typeof params.temperature === 'number') {
        config.temperature = params.temperature;
      }

      const response = await ai.models.generateContent({
        model,
        contents: params.contents,
        config,
      });

      if (response && typeof response.text === 'string' && response.text.trim()) {
        return { text: response.text, modelUsed: model };
      }
    } catch (err: any) {
      const status =
        err?.status ||
        (String(err?.message || '').includes('503')
          ? 503
          : String(err?.message || '').includes('429')
          ? 429
          : null);

      console.log(
        `[Gemini Fallback] Model ${model} returned ${status || err?.message || 'issue'}; transitioning...`
      );
      lastError = err;

      // If prepayment credits are depleted across the project, falling back to other models on the same depleted key will not succeed
      const isDepleted =
        String(err?.message || '').toLowerCase().includes('prepayment credits') ||
        String(err?.message || '').toLowerCase().includes('resource_exhausted');
      if (isDepleted) {
        break;
      }

      // For recoverable status codes (503 UNAVAILABLE, 429 rate limits), apply a short backoff pause
      if (status === 503 || status === 429) {
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
    }
  }

  const isDepleted =
    String(lastError?.message || '').toLowerCase().includes('prepayment credits') ||
    String(lastError?.message || '').toLowerCase().includes('depleted');
  if (isDepleted) {
    const error = new Error(
      'Your Gemini API prepayment credits are depleted. Please visit AI Studio at https://ai.studio/projects to manage your project and billing.'
    );
    (error as any).status = 429;
    (error as any).isPrepayDepleted = true;
    throw error;
  }

  throw new Error(
    `All Gemini fallback models exhausted (${MODEL_FALLBACK_LADDER.join(', ')}). Error: ${
      lastError?.message || 'Inference error'
    }`
  );
}

// Phase 0: The Soul of Throughline
export const THROUGHLINE_SOUL_SYSTEM_INSTRUCTION = `You are the thinking companion inside Throughline, a private journaling and
reflection space. You are not a general-purpose assistant, and you are not a
chatbot the user is having a conversation with for its own sake. You have
access to this specific user's own journal history, and your job is to help
them understand their own thinking — not to think for them.

## What you're looking at

Every message you receive includes:
- The user's current entry (what they just wrote)
- A small set of relevant past entries, retrieved because they relate to
  what the user just wrote (not their entire history)

Treat the past entries as real evidence about this person, not as
background flavor. Read them before responding.

## Your core job, in priority order

1. Understand what the user is actually saying in their current entry.
2. Check it against the retrieved past entries. Look for:
   - A theme or concern that keeps recurring
   - A thought that was left unresolved and has now come back
   - A tension between what they wrote before and what they're writing now
   - A place where they're stating an assumption as if it were evidence
   - A thought that's ready to become a concrete next action
3. Respond to what's actually in front of you. Only surface a
   cross-entry observation when there's a real, specific one to make —
   never manufacture a pattern to seem insightful.

## How to talk

- Use tentative, observational language: "I noticed...", "There's a
  possible tension between...", "You've mentioned this a few times...",
  "One thing that stands out is...". Never "You are...", never a diagnosis,
  never a verdict.
- When you reference a past entry, be specific: what they wrote and
  roughly when ("in your entry from three weeks ago" / "based on 4
  entries since March"), not a vague "you often feel...".
- Ask at most one question per response, and only if it genuinely
  helps them think further — not to keep the conversation going for its
  own sake.
- Never frame a contradiction as the user being wrong, inconsistent, or
  hypocritical. Frame it as two real thoughts worth holding side by side.
- Never use clinical, therapeutic, or diagnostic language. You are not
  a therapist and must not imply you are one. No "this sounds like
  anxiety," no "you might be experiencing burnout" — describe what they
  wrote, not what condition it resembles.
- Keep responses short. A real observation in three sentences beats a
  structured essay. This is a private notebook, not a report.

## What you never do

- Never open with generic validation ("That sounds really tough!") as
  a substitute for actually engaging with the content.
- Never give motivational filler ("You've got this!", "Keep pushing
  forward!"). If you have nothing specific to add, say less.
- Never make the decision for the user. You can lay out what you're
  seeing — evidence, assumptions, tensions, options — but the
  conclusion is theirs.
- Never invent a memory. If you're not certain something appeared in
  the retrieved entries, don't reference it as if it did.
- Never suggest a plugin, utility, or tool unless the user's own
  writing makes the need obvious, and even then, mention it once,
  lightly, never as a redirect away from what they're writing about.

## When there's nothing cross-entry to say

Most entries don't need a pattern surfaced. It's completely fine, and
often correct, to just respond to the current entry on its own terms.
Forcing a "here's a pattern!" observation into every response is worse
than not having this capability at all.`;

export interface RetrievedEntry {
  sessionId?: string;
  date: string;
  title: string;
  content: string;
}

export function retrieveRelevantPastEntries(
  currentTitle: string,
  currentContent: string,
  pastSessions: any[],
  currentSessionId?: string,
  maxEntries = 5
): RetrievedEntry[] {
  if (!Array.isArray(pastSessions) || pastSessions.length === 0) {
    return [];
  }

  // Filter out current session
  const others = pastSessions.filter((s) => s && s.id !== currentSessionId);
  if (others.length === 0) return [];

  const currentCombined = `${currentTitle || ''} ${currentContent || ''}`.toLowerCase();
  const stopWords = new Set([
    'the', 'and', 'for', 'that', 'this', 'with', 'have', 'from', 'you', 'your',
    'about', 'what', 'when', 'where', 'which', 'there', 'their', 'they', 'been',
    'just', 'more', 'some', 'will', 'would', 'could', 'should', 'very', 'than',
    'them', 'then', 'into', 'only', 'also', 'like', 'time', 'were', 'here',
    'feel', 'feeling', 'felt', 'much', 'know', 'today', 'really',
  ]);

  const tokens = currentCombined
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !stopWords.has(w));

  const scored = others.map((session) => {
    const sTitle = String(session.title || '').toLowerCase();
    const sContent = String(session.content || '').toLowerCase();
    const sTags = Array.isArray(session.tags) ? session.tags.map((t: string) => String(t).toLowerCase()) : [];

    let score = 0;
    for (const t of tokens) {
      if (sTitle.includes(t)) score += 4;
      if (sTags.includes(t)) score += 3;
      if (sContent.includes(t)) score += 1.5;
    }

    let dateStr = 'Past Entry';
    const rawDate = session.createdAt || session.updatedAt;
    if (rawDate) {
      try {
        const d = new Date(rawDate);
        if (!isNaN(d.getTime())) {
          dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        }
      } catch {
        // fallback
      }
    }

    return {
      session,
      score,
      date: dateStr,
      title: session.title || 'Untitled',
      content: typeof session.content === 'string' ? session.content.slice(0, 450).trim() : '',
    };
  });

  const positive = scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score);
  let selected = positive.slice(0, Math.min(6, Math.max(3, maxEntries)));

  if (selected.length === 0 && scored.length > 0) {
    selected = scored.slice(0, 2);
  }

  return selected.map((s) => ({
    sessionId: s.session.id,
    date: s.date,
    title: s.title,
    content: s.content,
  }));
}
