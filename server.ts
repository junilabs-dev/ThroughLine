import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

// Top-Level Request Deserialization (Ordering Guarantee)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Services & Dynamic Configuration
import { configService } from './server/configService';
import {
  generateContentWithFallback,
  THROUGHLINE_SOUL_SYSTEM_INSTRUCTION,
  retrieveRelevantPastEntries,
  MODEL_FALLBACK_LADDER,
  type RetrievedEntry,
} from './server/geminiService';

const BASE_RESPONSIBLE_AI_PROMPT = THROUGHLINE_SOUL_SYSTEM_INSTRUCTION;

// 1. Health check & Secure Credential Status
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    geminiConfigured: configService.isGeminiConfigured(),
  });
});

app.get('/api/config/status', (req, res) => {
  res.json(configService.getCredentialStatus());
});

// 2. AI Companion Multi-Turn Conversation (Phase 0: Grounded in Soul & Scoped Retrieval)
app.post('/api/gemini/companion', async (req, res) => {
  try {
    const payload = (req.body && typeof req.body === 'object') ? req.body : {};
    const {
      sessionId = '',
      reflectionTitle = '',
      reflectionContent = '',
      mood = '',
      emotions = [],
      tags = [],
      mode = 'REFLECT',
      style = 'Supportive',
      conversationHistory = [],
      userMessage = '',
      pastSessions = [],
      relatedPastEntries = [],
    } = payload;

    if (!userMessage && !reflectionContent) {
      return res.status(400).json({ error: 'Reflection content or user message is required' });
    }

    // Retrieve 3-6 relevant past entries if not explicitly provided
    let retrieved: RetrievedEntry[] = [];
    if (Array.isArray(relatedPastEntries) && relatedPastEntries.length > 0) {
      retrieved = relatedPastEntries.slice(0, 6);
    } else if (Array.isArray(pastSessions) && pastSessions.length > 0) {
      retrieved = retrieveRelevantPastEntries(reflectionTitle, reflectionContent, pastSessions, sessionId, 5);
    }

    // Structure the prompt with Phase 0.2 clear labels
    let relatedEntriesText = '(No prior entries retrieved)';
    if (retrieved.length > 0) {
      relatedEntriesText = retrieved
        .map((e) => `[${e.date}] ${e.title ? `"${e.title}": ` : ''}${e.content}`)
        .join('\n\n');
    }

    const currentEntryText = `${reflectionTitle ? `Title: ${reflectionTitle}\n` : ''}${reflectionContent || '(User has not added body text yet)'}`;

    // Mode-specific extension of Throughline Soul
    let modeGuidance = '';
    switch (mode) {
      case 'REFLECT':
        modeGuidance = 'Follow your core job in priority order: understand the current entry, check against retrieved past entries for recurring themes, unresolved thoughts, or tensions, and respond concisely.';
        break;
      case 'SUMMARIZE':
        modeGuidance = 'Synthesize what the user wrote by highlighting the core thread, unstated assumption or dilemma, and key realization in 2-3 tight paragraphs or bullet points without fluff.';
        break;
      case 'BRAINSTORM':
        modeGuidance = 'Explore open avenues, alternative perspectives, and fresh angles without giving unsolicited prescriptions.';
        break;
      case 'CHALLENGE':
        modeGuidance = 'Gently highlight any assumption stated as evidence, unexamined premises, or blind spots. Keep tentative and respectful.';
        break;
      case 'ACTION':
        modeGuidance = 'Check if a thought is ready to become a concrete next action. Suggest 1-3 pragmatic, bite-sized next steps.';
        break;
      case 'QUESTIONS':
        modeGuidance = 'Ask at most one deep, useful question that helps the user think further.';
        break;
      default:
        modeGuidance = 'Respond tentatively and observantly to help the user understand their thinking.';
    }

    const systemInstruction = `
${THROUGHLINE_SOUL_SYSTEM_INSTRUCTION}

## Context for This Turn
Active Mode: ${mode}
${modeGuidance}
Persona Tone: ${style}
${mood ? `User Recorded Mood: ${mood}` : ''}
${emotions.length ? `Selected Emotions: ${emotions.join(', ')}` : ''}
${tags.length ? `Tags: ${tags.join(', ')}` : ''}
`;

    // Build multi-turn contents format
    const contents: any[] = [];

    // Add prior conversation messages
    if (Array.isArray(conversationHistory)) {
      for (const msg of conversationHistory) {
        if (msg && msg.role && msg.content) {
          contents.push({
            role: msg.role === 'assistant' || msg.role === 'model' ? 'model' : 'user',
            parts: [{ text: String(msg.content) }],
          });
        }
      }
    }

    // Format current turn according to Phase 0.2 Context Structure
    const contextPrompt = `
CURRENT ENTRY (today):
${currentEntryText}

RELATED PAST ENTRIES (for context only — do not treat as today):
${relatedEntriesText}
${userMessage ? `\nUSER QUESTION / NOTE:\n${userMessage}` : ''}
`;

    contents.push({
      role: 'user',
      parts: [{ text: contextPrompt.trim() }],
    });

    const result = await generateContentWithFallback({
      contents,
      systemInstruction,
    });

    res.json({
      reply: result.text,
      modelUsed: result.modelUsed,
      retrievedEntriesCount: retrieved.length,
      retrievedEntries: retrieved.map((r) => ({ date: r.date, title: r.title })),
    });
  } catch (error: any) {
    console.error('Companion API error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate AI response' });
  }
});

// 3. Smart Prompt Generation
app.post('/api/gemini/smart-prompt', async (req, res) => {
  try {
    const payload = (req.body && typeof req.body === 'object') ? req.body : {};
    const { recentThemes = [], userGoal = '' } = payload;

    const systemInstruction = `
${BASE_RESPONSIBLE_AI_PROMPT}

Your role is to craft a singular, deeply introspective, thought-provoking reflection prompt for the user today.
Do NOT output cliches like "What are you grateful for?".
Craft questions that cut to the core of personal growth, decisions, habits, energy, and honesty.
Examples of high quality:
- "What decision keeps coming back to your mind?"
- "What did you avoid today, and why?"
- "What are you currently optimizing for?"
- "What is one thing you understand better now than you did a month ago?"

${recentThemes.length ? `User's recent themes: ${recentThemes.join(', ')}` : ''}
${userGoal ? `User's active focus/goal: ${userGoal}` : ''}

Output a JSON object with keys:
- "prompt": The singular compelling question.
- "category": Short category (e.g. "Decision Making", "Energy & Focus", "Self-Honesty", "Direction").
- "context": A 1-sentence note on why this prompt is valuable right now.
`;

    const result = await generateContentWithFallback({
      contents: [{ role: 'user', parts: [{ text: 'Generate one deep reflection prompt for today.' }] }],
      systemInstruction,
      responseMimeType: 'application/json',
    });

    const parsed = JSON.parse(result.text);
    res.json(parsed);
  } catch (error: any) {
    console.error('Smart prompt error:', error);
    // Fallback prompt on failure
    res.json({
      prompt: 'What decision keeps coming back to your mind, and what is holding you back from making it?',
      category: 'Decisions',
      context: 'Unresolved choices drain mental energy until brought to the surface.',
    });
  }
});

// 4. Thinking Map Extraction (Signature Feature)
app.post('/api/gemini/thinking-map', async (req, res) => {
  try {
    const payload = (req.body && typeof req.body === 'object') ? req.body : {};
    const { sessions = [] } = payload;

    if (!Array.isArray(sessions) || sessions.length === 0) {
      return res.json({
        nodes: [
          {
            id: 'career',
            category: 'Career & Growth',
            description: 'Skills, opportunities, and professional trajectory.',
            subtopics: ['Role satisfaction', 'Skill acquisition', 'Workplace autonomy'],
            sentiment: 'neutral',
            frequency: 1,
            unresolvedQuestions: ['What are my non-negotiables for my next role?'],
          },
          {
            id: 'clarity',
            category: 'Mental Clarity',
            description: 'Energy levels, focus, and reducing cognitive overwhelm.',
            subtopics: ['Morning routine', 'Deep work boundaries', 'Digital detox'],
            sentiment: 'positive',
            frequency: 1,
            unresolvedQuestions: ['Where is my energy leaking the most during weekdays?'],
          },
        ],
        connections: [
          { from: 'career', to: 'clarity', label: 'Impacts focus' },
        ],
        overview: 'Add reflections to see your personal Thinking Map evolve across your thoughts.',
      });
    }

    const sessionExcerpts = sessions.slice(0, 20).map((s: any, idx: number) => ({
      index: idx + 1,
      title: s.title || 'Untitled',
      date: s.createdAt || '',
      mood: s.mood || '',
      tags: s.tags || [],
      excerpt: typeof s.content === 'string' ? s.content.slice(0, 500) : '',
      summary: s.summary || '',
    }));

    const systemInstruction = `
${BASE_RESPONSIBLE_AI_PROMPT}

You are analyzing the user's journal reflections to construct a "Thinking Map".
The purpose is to reveal what has been occupying their attention across multiple reflections.
Analyze the reflections and identify:
1. Primary thematic clusters / categories (e.g. Career, Health, Creativity, Relationships, Personal Philosophy).
2. For each cluster:
   - Subtopics and recurring concerns
   - Overall sentiment (positive, neutral, tension, exploring)
   - Frequency score (relative weight 1-5)
   - 1-2 Unresolved questions that keep lingering in their entries
3. Meaningful connections between clusters (e.g. Career tension -> Mental Clarity impact).
4. A 2-sentence overarching synthesis.

Return strictly valid JSON with this structure:
{
  "overview": "Short high-level synthesis of what has occupied the user's thoughts",
  "nodes": [
    {
      "id": "unique-slug-string",
      "category": "Theme Name",
      "description": "1 sentence summarizing this theme in their reflections",
      "subtopics": ["subtopic 1", "subtopic 2", "subtopic 3"],
      "sentiment": "positive" | "neutral" | "tension" | "exploring",
      "frequency": 1-5,
      "unresolvedQuestions": ["Thoughtful question here"]
    }
  ],
  "connections": [
    { "from": "node-id-1", "to": "node-id-2", "label": "Relationship description" }
  ]
}
`;

    const result = await generateContentWithFallback({
      contents: [{
        role: 'user',
        parts: [{ text: `Analyze these ${sessionExcerpts.length} reflections:\n${JSON.stringify(sessionExcerpts, null, 2)}` }],
      }],
      systemInstruction,
      responseMimeType: 'application/json',
    });

    const parsed = JSON.parse(result.text);
    res.json(parsed);
  } catch (error: any) {
    console.error('Thinking map error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate thinking map' });
  }
});

// 5. Personal Insights Analysis
app.post('/api/gemini/insights', async (req, res) => {
  try {
    const payload = (req.body && typeof req.body === 'object') ? req.body : {};
    const { sessions = [], goals = [] } = payload;

    const systemInstruction = `
${BASE_RESPONSIBLE_AI_PROMPT}

Analyze the user's reflection sessions and goals to answer four core questions:
1. "What have I been thinking about?" (Key Themes)
2. "What keeps coming up?" (Recurring Challenges & Patterns)
3. "What seems to be improving?" (Positive Shifts & Wins)
4. "What still needs attention?" (Unresolved Topics & Next Actions)

Return strictly valid JSON with keys:
{
  "keyThemes": ["Theme 1", "Theme 2", "Theme 3"],
  "recurringChallenges": [
    { "challenge": "Title", "frequency": "Frequent" | "Emerging", "insight": "Concise observation" }
  ],
  "positiveShifts": [
    { "area": "Title", "observation": "Positive shift detected" }
  ],
  "unresolvedTopics": [
    { "topic": "Title", "openQuestion": "Question to reflect on next" }
  ],
  "actionableTakeaways": [
    "Practical takeaway 1",
    "Practical takeaway 2"
  ]
}
`;

    const sample = sessions.slice(0, 15).map((s: any) => ({
      title: s.title,
      mood: s.mood,
      tags: s.tags,
      excerpt: typeof s.content === 'string' ? s.content.slice(0, 300) : '',
      summary: s.summary,
    }));

    const result = await generateContentWithFallback({
      contents: [{
        role: 'user',
        parts: [{
          text: `Here is the user's reflection history:\n${JSON.stringify({ sessions: sample, goals }, null, 2)}`,
        }],
      }],
      systemInstruction,
      responseMimeType: 'application/json',
    });

    const parsed = JSON.parse(result.text);
    res.json(parsed);
  } catch (error: any) {
    console.error('Insights error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate insights' });
  }
});

// 6. Goal Progress Reflection
app.post('/api/gemini/goal-reflection', async (req, res) => {
  try {
    const payload = (req.body && typeof req.body === 'object') ? req.body : {};
    const { goal = {}, linkedSessions = [] } = payload;

    const systemInstruction = `
${BASE_RESPONSIBLE_AI_PROMPT}

The user has set a goal: "${goal.title || ''}" (${goal.description || 'No description'}).
Current progress: ${goal.progress || 0}%. Target date: ${goal.targetDate || 'Not set'}.

Analyze the linked journal reflections below and evaluate:
1. Progress observed in their thoughts and actions.
2. Blockers or friction points expressed in their reflections.
3. Recurring issues or mental hurdles.
4. 2-3 Recommended next steps to move forward.

Return strictly valid JSON:
{
  "progressObserved": "Summary of visible momentum or mindset evolution",
  "blockers": ["Blocker 1", "Blocker 2"],
  "recurringIssues": ["Issue 1", "Issue 2"],
  "suggestedNextSteps": ["Step 1", "Step 2"],
  "encouragement": "Grounded, non-cheesy observation on their journey"
}
`;

    const excerpts = linkedSessions.map((s: any) => ({
      title: s.title,
      mood: s.mood,
      excerpt: typeof s.content === 'string' ? s.content.slice(0, 400) : '',
    }));

    const result = await generateContentWithFallback({
      contents: [{
        role: 'user',
        parts: [{ text: `Goal details and reflections:\n${JSON.stringify({ goal, excerpts }, null, 2)}` }],
      }],
      systemInstruction,
      responseMimeType: 'application/json',
    });

    const parsed = JSON.parse(result.text);
    res.json(parsed);
  } catch (error: any) {
    console.error('Goal reflection error:', error);
    res.status(500).json({ error: error.message || 'Failed to analyze goal' });
  }
});

// 7. Weekly Review Generation
app.post('/api/gemini/weekly-review', async (req, res) => {
  try {
    const payload = (req.body && typeof req.body === 'object') ? req.body : {};
    const { sessions = [], weekLabel = '' } = payload;

    const systemInstruction = `
${BASE_RESPONSIBLE_AI_PROMPT}

Synthesize the user's journal activity from the past 7 days into their Signature Weekly Review.
Produce structured insights strictly corresponding to these 7 sections:
1. WHAT WENT WELL: What positive things happened, achievements, or moments of clarity?
2. WHAT WAS DIFFICULT: What challenges, friction, or doubts appeared?
3. WHAT KEPT COMING UP: Recurring themes, topics, or preoccupations.
4. WHAT CHANGED: Shifts in thinking, habits, or behavioral adjustments.
5. WHAT DID I LEARN: Key realizations, truths noticed, or mental models discovered.
6. WHAT SHOULD I FOCUS ON NEXT: Concrete, practical priority for the upcoming week.
7. NEXT WEEK'S QUESTION: One thoughtful, profound reflection prompt to carry forward into next week.

Return strictly valid JSON:
{
  "weekLabel": "${weekLabel || 'This Week'}",
  "whatWentWell": ["Item 1", "Item 2"],
  "whatWasDifficult": ["Item 1", "Item 2"],
  "whatKeptComingUp": ["Theme 1", "Theme 2"],
  "whatChanged": ["Shift 1", "Shift 2"],
  "whatDidILearn": ["Realization 1", "Realization 2"],
  "whatShouldIFocusOnNext": ["Focus point 1", "Focus point 2"],
  "nextWeeksQuestion": "One deep question for next week"
}
`;

    const excerpts = sessions.slice(0, 20).map((s: any) => ({
      title: s.title,
      mood: s.mood,
      tags: s.tags,
      excerpt: typeof s.content === 'string' ? s.content.slice(0, 400) : '',
    }));

    const result = await generateContentWithFallback({
      contents: [{
        role: 'user',
        parts: [{ text: `Reflections from the past week:\n${JSON.stringify(excerpts, null, 2)}` }],
      }],
      systemInstruction,
      responseMimeType: 'application/json',
    });

    const parsed = JSON.parse(result.text);
    res.json(parsed);
  } catch (error: any) {
    console.error('Weekly review error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate weekly review' });
  }
});

// 8. Ask My Journal (Phase 2: Semantic Synthesis & Evidence-Based Retrieval)
app.post('/api/gemini/ask-journal', async (req, res) => {
  try {
    const payload = (req.body && typeof req.body === 'object') ? req.body : {};
    const { query = '', sessions = [] } = payload;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Query is required' });
    }

    if (!Array.isArray(sessions) || sessions.length === 0) {
      return res.json({
        query,
        observation: 'No entries available yet to search.',
        answer: 'You have not added enough journal entries yet to answer this query. Write a few reflections to query your personal journal memory.',
        citations: [],
        supportingEntries: [],
        supportingDates: [],
        recurringThemes: [],
        chronologicalTrend: 'No entries available yet.',
        analyzedAt: new Date().toISOString(),
      });
    }

    const sessionExcerpts = sessions.slice(0, 30).map((s: any) => {
      let dateStr = '';
      const rawDate = s.createdAt || s.updatedAt;
      if (rawDate) {
        try {
          const d = new Date(rawDate);
          if (!isNaN(d.getTime())) {
            dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          }
        } catch {
          dateStr = String(rawDate).slice(0, 10);
        }
      }
      return {
        id: s.id,
        title: s.title || 'Untitled',
        date: dateStr || s.createdAt || s.updatedAt || '',
        mood: s.mood || '',
        tags: s.tags || [],
        content: typeof s.content === 'string' ? s.content.slice(0, 700) : '',
      };
    });

    const systemInstruction = `
${THROUGHLINE_SOUL_SYSTEM_INSTRUCTION}

You are the "Ask My Journal" semantic retrieval engine in Throughline.
The user is asking a reflective question about their personal writings: "${query}".

YOUR TASK:
1. Examine the provided journal entries as real evidence about this person.
2. Formulate a direct, tentative, and grounded observation ("You have mentioned...", "I noticed that across your entries...").
3. Extract precise citations and supporting dates (e.g. "March 14", "May 2") that substantiate the observation.
4. Give a nuanced answer that addresses their specific words without fluff or unsolicited advice.
5. Identify recurring themes and any chronological trend across their timeline.

Return strictly valid JSON:
{
  "observation": "Direct, one-sentence or two-sentence synthesis observation (e.g. 'You have mentioned career uncertainty several times across recent months.')",
  "answer": "Complete, nuanced answer to the user's question, strictly grounded in their words.",
  "citations": [
    {
      "sessionId": "session-id",
      "sessionTitle": "Session Title",
      "date": "Month Day, Year",
      "quote": "Short exact excerpt from entry"
    }
  ],
  "supportingDates": ["Month Day", "Month Day"],
  "recurringThemes": ["Theme 1", "Theme 2"],
  "chronologicalTrend": "Observation on how this topic shifted across their timeline"
}
`;

    const result = await generateContentWithFallback({
      contents: [{
        role: 'user',
        parts: [{ text: `User Question: "${query}"\n\nJournal Entries:\n${JSON.stringify(sessionExcerpts, null, 2)}` }],
      }],
      systemInstruction,
      responseMimeType: 'application/json',
    });

    const parsed = JSON.parse(result.text);
    const citations = Array.isArray(parsed.citations) ? parsed.citations : [];
    const supportingDates = Array.isArray(parsed.supportingDates)
      ? parsed.supportingDates
      : citations.map((c: any) => c.date).filter(Boolean);

    res.json({
      query,
      observation: parsed.observation || parsed.answer || 'No direct insights found.',
      answer: parsed.answer || parsed.observation || 'No direct insights found.',
      citations,
      supportingEntries: citations,
      supportingDates,
      recurringThemes: Array.isArray(parsed.recurringThemes) ? parsed.recurringThemes : [],
      chronologicalTrend: parsed.chronologicalTrend || '',
      analyzedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Ask journal error:', error);
    res.status(500).json({ error: error.message || 'Failed to query journal' });
  }
});

// 9. Thought to Action (Convert Thoughts into Concrete Action Plans)
app.post('/api/gemini/thought-to-action', async (req, res) => {
  try {
    const payload = (req.body && typeof req.body === 'object') ? req.body : {};
    const { text = '', title = '' } = payload;

    if (!text && !title) {
      return res.status(400).json({ error: 'Text or title is required' });
    }

    const systemInstruction = `
${BASE_RESPONSIBLE_AI_PROMPT}

You are the MindSpace "Thought to Action" engine.
Your purpose is to turn abstract feelings, ruminations, or realizations into practical, high-leverage next steps.

Rules:
1. Don't invent generic tasks. Base every task directly on the user's stated desire, blocker, or realization.
2. Keep tasks bite-sized, clear, and actionable (verb-first).
3. Assign priority (high, medium, low) based on mental leverage.
4. Give a title for the action plan.

Return strictly valid JSON:
{
  "planTitle": "Clear concise plan title",
  "description": "Brief rationale for these steps",
  "priority": "high" | "medium" | "low",
  "steps": [
    {
      "text": "Specific actionable step starting with an active verb",
      "notes": "Short tip or context for why this matters"
    }
  ]
}
`;

    const result = await generateContentWithFallback({
      contents: [{
        role: 'user',
        parts: [{ text: `Title: ${title}\nContent:\n${text}` }],
      }],
      systemInstruction,
      responseMimeType: 'application/json',
    });

    const parsed = JSON.parse(result.text);
    res.json(parsed);
  } catch (error: any) {
    console.error('Thought to action error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate action plan' });
  }
});

// 10. Decision Room AI Assistant
app.post('/api/gemini/decision-helper', async (req, res) => {
  try {
    const payload = (req.body && typeof req.body === 'object') ? req.body : {};
    const { title = '', context = '', options = [], criteria = [], assumptions = [] } = payload;

    const systemInstruction = `
${BASE_RESPONSIBLE_AI_PROMPT}

You are the MindSpace Decision Architect.
CRITICAL: Do NOT make the decision for the user. Your role is to help them think with clarity, spot hidden traps, surface unstated assumptions, and balance tradeoffs.

Analyze:
1. Hidden Assumptions: What might the user be taking for granted?
2. Blind Spots: What second-order consequences or variables have they not accounted for?
3. Tradeoff Summary: Compare their options objectively against their criteria.
4. Recommended Framework: A structured thinking model (e.g. 10/10/10 rule, Regret Minimization, Inversion, Eisenhower matrix, Reversibility test) that best fits this specific decision.

Return strictly valid JSON:
{
  "hiddenAssumptions": ["Assumption 1", "Assumption 2"],
  "blindSpots": ["Blind spot 1", "Blind spot 2"],
  "tradeoffSummary": "Concise analysis of the core tensions and tradeoffs among the options.",
  "recommendedFramework": "Name and 2-sentence explanation of the optimal mental model to apply here."
}
`;

    const result = await generateContentWithFallback({
      contents: [{
        role: 'user',
        parts: [{
          text: `Decision Details:\n${JSON.stringify({ title, context, options, criteria, assumptions }, null, 2)}`,
        }],
      }],
      systemInstruction,
      responseMimeType: 'application/json',
    });

    const parsed = JSON.parse(result.text);
    res.json({
      ...parsed,
      analyzedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Decision helper error:', error);
    res.status(500).json({ error: error.message || 'Failed to analyze decision' });
  }
});

// 11. Evidence vs Assumption Analyzer
app.post('/api/gemini/evidence-vs-assumption', async (req, res) => {
  try {
    const payload = (req.body && typeof req.body === 'object') ? req.body : {};
    const { statement = '' } = payload;

    if (!statement) {
      return res.status(400).json({ error: 'Statement is required' });
    }

    const systemInstruction = `
${BASE_RESPONSIBLE_AI_PROMPT}

You are an expert cognitive deconstructionist in MindSpace.
The user provides a belief, fear, doubt, or assumption they are wrestling with:
"${statement}"

Deconstruct it into:
1. Verified Facts / Objective Evidence: What in this statement is provable data or observable reality?
2. Untested Assumptions / Interpretations: What is a projection, subjective story, mind-reading, or unverified leap?
3. Cognitive Blind Spots: Overgeneralization, catastrophizing, false dichotomy, emotional reasoning, etc.
4. Reality-Check Experiments: 2-3 small, low-risk real-world actions the user can take this week to test whether this belief is actually true.

Return strictly valid JSON:
{
  "verifiedFacts": ["Fact 1", "Fact 2"],
  "untestedAssumptions": ["Assumption 1", "Assumption 2"],
  "blindSpots": ["Cognitive distortion / blind spot 1"],
  "experimentsToTest": ["Experiment 1", "Experiment 2"]
}
`;

    const result = await generateContentWithFallback({
      contents: [{
        role: 'user',
        parts: [{ text: `Analyze this belief/statement: "${statement}"` }],
      }],
      systemInstruction,
      responseMimeType: 'application/json',
    });

    const parsed = JSON.parse(result.text);
    res.json({
      statement,
      ...parsed,
      analyzedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Evidence vs assumption error:', error);
    res.status(500).json({ error: error.message || 'Failed to deconstruct belief' });
  }
});

// 12. Patterns & Contradiction Detector Across Reflections (Phase 4: Possible Tensions & Socratic Inquiry)
app.post('/api/gemini/patterns-analysis', async (req, res) => {
  try {
    const payload = (req.body && typeof req.body === 'object') ? req.body : {};
    const { sessions = [] } = payload;

    if (!Array.isArray(sessions) || sessions.length < 2) {
      return res.json({
        patterns: [],
        contradictions: [],
        overallSynthesis: 'You need at least two reflections to detect patterns or tensions over time.',
        analyzedAt: new Date().toISOString(),
      });
    }

    const sessionList = sessions.slice(0, 25).map((s: any) => {
      let dateStr = '';
      const rawDate = s.createdAt || s.updatedAt;
      if (rawDate) {
        try {
          const d = new Date(rawDate);
          if (!isNaN(d.getTime())) {
            dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          }
        } catch {
          dateStr = String(rawDate).slice(0, 10);
        }
      }
      return {
        id: s.id,
        title: s.title || 'Untitled',
        date: dateStr || s.createdAt || s.updatedAt || '',
        mood: s.mood || '',
        tags: s.tags || [],
        excerpt: typeof s.content === 'string' ? s.content.slice(0, 500) : '',
      };
    });

    const systemInstruction = `
${THROUGHLINE_SOUL_SYSTEM_INSTRUCTION}

Analyze these journal reflections over time to uncover:
1. PATTERNS: Recurring emotional, cognitive, behavioral, or energy cycles (e.g. "Sunday evening anxiety before the work week", "Creative burst followed by overcommitment", "Perfectionist pause when starting new projects").
2. CONTRADICTIONS & TENSIONS: Compare statements across entries for a possible tension (never 'contradiction' as an accusation or inconsistency). Always phrase as 'possible tension,' never absolute. Frame it as two real thoughts worth holding side by side. Provide one thoughtful Socratic question to explore.
3. A grounded 2-sentence synthesis of their personal trajectory.

Return strictly valid JSON:
{
  "patterns": [
    {
      "patternName": "Concise pattern title",
      "category": "emotional" | "cognitive" | "behavioral" | "energy",
      "frequency": "Frequent" | "Occasional" | "Emerging",
      "triggerContext": "When/why this tends to happen",
      "evolution": "How it has shifted across entries",
      "constructiveTakeaway": "Non-judgmental awareness tip"
    }
  ],
  "contradictions": [
    {
      "title": "Short title of the tension",
      "statementA": { "quote": "Quote A", "sessionTitle": "Title A", "date": "Date A", "sessionId": "id-of-entry-A" },
      "statementB": { "quote": "Quote B", "sessionTitle": "Title B", "date": "Date B", "sessionId": "id-of-entry-B" },
      "tensionExplanation": "Why these two viewpoints represent a tension or shift worth holding side by side",
      "socraticQuestion": "A thoughtful question to help them explore this tension"
    }
  ],
  "overallSynthesis": "Holistic high-level observation on their cognitive habits and growth."
}
`;

    const result = await generateContentWithFallback({
      contents: [{
        role: 'user',
        parts: [{ text: `Journal entries to analyze:\n${JSON.stringify(sessionList, null, 2)}` }],
      }],
      systemInstruction,
      responseMimeType: 'application/json',
    });

    const parsed = JSON.parse(result.text);
    res.json({
      patterns: Array.isArray(parsed.patterns) ? parsed.patterns.map((p: any, idx: number) => ({ id: `pat-${idx}`, ...p })) : [],
      contradictions: Array.isArray(parsed.contradictions) ? parsed.contradictions.map((c: any, idx: number) => ({ id: `con-${idx}`, ...c })) : [],
      overallSynthesis: parsed.overallSynthesis || '',
      analyzedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Patterns analysis error:', error);
    res.status(500).json({ error: error.message || 'Failed to analyze patterns' });
  }
});

// 13. Unresolved Thoughts Extractor & Cross-Entry Loop Scanner (Phase 3)
app.post('/api/gemini/unresolved-extractor', async (req, res) => {
  try {
    const payload = (req.body && typeof req.body === 'object') ? req.body : {};
    const { content = '', title = '', sessions = [] } = payload;

    // Check if multi-session scan was requested
    if (Array.isArray(sessions) && sessions.length > 0) {
      const formattedSessions = sessions.slice(0, 25).map((s: any) => {
        let dateStr = '';
        const rawDate = s.createdAt || s.updatedAt;
        if (rawDate) {
          try {
            const d = new Date(rawDate);
            if (!isNaN(d.getTime())) {
              dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            }
          } catch {
            dateStr = String(rawDate).slice(0, 10);
          }
        }
        return {
          id: s.id,
          title: s.title || 'Untitled',
          date: dateStr || s.createdAt || '',
          content: typeof s.content === 'string' ? s.content.slice(0, 500) : '',
        };
      });

      const systemInstruction = `
${THROUGHLINE_SOUL_SYSTEM_INSTRUCTION}

Analyze these journal reflections over time to identify recurring issues, open loops, or questions that appear across multiple reflections.
For each recurring issue, extract:
- title: concise statement of the recurring issue or unanswered question
- context: where and how it surfaces in their reflections
- firstMentioned: date of earliest mention
- lastMentioned: date of latest mention
- occurrenceCount: count of entries where this appears
- relatedTopics: array of topics or keywords
- aiObservation: brief observation on why it may matter, worded tentatively: "This appears repeatedly in your reflections...", never "You are avoiding this."
- relatedSessionIds: array of session IDs where this was mentioned
- urgency: "high" | "medium" | "low"

Extract up to 6 distinct unresolved items.

Return strictly valid JSON:
{
  "unresolved": [
    {
      "title": "Clear concise recurring dilemma or question",
      "context": "Context of where this came from",
      "firstMentioned": "Month Day, Year",
      "lastMentioned": "Month Day, Year",
      "occurrenceCount": 3,
      "relatedTopics": ["Career", "Direction"],
      "aiObservation": "This appears repeatedly in your reflections across several weeks.",
      "relatedSessionIds": ["session-id-1", "session-id-2"],
      "urgency": "medium"
    }
  ]
}
`;

      const result = await generateContentWithFallback({
        contents: [{
          role: 'user',
          parts: [{ text: `Reflections to scan for unresolved loops:\n${JSON.stringify(formattedSessions, null, 2)}` }],
        }],
        systemInstruction,
        responseMimeType: 'application/json',
      });

      const parsed = JSON.parse(result.text);
      const items = Array.isArray(parsed.unresolved) ? parsed.unresolved : [];

      // Map session titles and dates back to relatedSessions
      const sessionMap = new Map(formattedSessions.map((s) => [s.id, s]));
      const enriched = items.map((item: any) => ({
        ...item,
        relatedSessions: Array.isArray(item.relatedSessionIds)
          ? item.relatedSessionIds
              .map((id: string) => {
                const s = sessionMap.get(id);
                return s ? { id: s.id, title: s.title, date: s.date } : null;
              })
              .filter(Boolean)
          : [],
      }));

      return res.json({ unresolved: enriched });
    }

    // Single entry extraction fallback
    if (!content && !title) {
      return res.status(400).json({ error: 'Content or sessions required' });
    }

    const systemInstruction = `
${THROUGHLINE_SOUL_SYSTEM_INSTRUCTION}

Examine this reflection and detect any open questions, unresolved dilemmas, unfinished thoughts, or emotional tensions that remain unanswered.
Extract up to 3 distinct unresolved thoughts.
Word any observation tentatively: "This appears to be an open question...", never judgmental.

Return strictly valid JSON:
{
  "unresolved": [
    {
      "title": "Clear concise question or unresolved dilemma",
      "context": "Brief context explaining where this came from in their reflection",
      "urgency": "high" | "medium" | "low"
    }
  ]
}
`;

    const result = await generateContentWithFallback({
      contents: [{
        role: 'user',
        parts: [{ text: `Title: ${title}\nContent:\n${content}` }],
      }],
      systemInstruction,
      responseMimeType: 'application/json',
    });

    const parsed = JSON.parse(result.text);
    res.json(parsed);
  } catch (error: any) {
    console.error('Unresolved extractor error:', error);
    res.status(500).json({ error: error.message || 'Failed to extract unresolved thoughts' });
  }
});

// Vite middleware for development or Static handling for production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Throughline Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
