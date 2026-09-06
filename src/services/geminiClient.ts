import type {
  AiMode,
  AiStyle,
  ChatMessage,
  ThinkingMapData,
  PersonalInsightsData,
  Goal,
  JournalSession,
  WeeklyReflection,
  JournalQueryAnswer,
  DecisionOption,
  EvidenceVsAssumptionItem,
  PatternsData,
} from '../types';

export async function askCompanion(params: {
  sessionId?: string;
  reflectionTitle: string;
  reflectionContent: string;
  mood?: string;
  emotions?: string[];
  tags?: string[];
  mode: AiMode;
  style: AiStyle;
  conversationHistory: ChatMessage[];
  userMessage?: string;
  pastSessions?: JournalSession[];
}): Promise<{ reply: string; modelUsed: string; retrievedEntriesCount?: number; retrievedEntries?: Array<{ date: string; title: string }> }> {
  const res = await fetch('/api/gemini/companion', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Inference request failed' }));
    throw new Error(err.error || `Error ${res.status}: Failed to reach AI companion`);
  }

  return res.json();
}

export async function getSmartPrompt(params: {
  recentThemes?: string[];
  userGoal?: string;
}): Promise<{ prompt: string; category: string; context: string }> {
  const res = await fetch('/api/gemini/smart-prompt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    throw new Error('Failed to generate smart prompt');
  }

  return res.json();
}

export async function getThinkingMap(sessions: JournalSession[]): Promise<ThinkingMapData> {
  const res = await fetch('/api/gemini/thinking-map', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessions }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Thinking Map generation failed' }));
    throw new Error(err.error || 'Failed to generate thinking map');
  }

  return res.json();
}

export async function getPersonalInsights(sessions: JournalSession[], goals: Goal[]): Promise<PersonalInsightsData> {
  const res = await fetch('/api/gemini/insights', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessions, goals }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Insights generation failed' }));
    throw new Error(err.error || 'Failed to generate insights');
  }

  return res.json();
}

export async function getGoalReflection(goal: Goal, linkedSessions: JournalSession[]) {
  const res = await fetch('/api/gemini/goal-reflection', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ goal, linkedSessions }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Goal reflection failed' }));
    throw new Error(err.error || 'Failed to reflect on goal progress');
  }

  return res.json();
}

export async function getWeeklyReview(sessions: JournalSession[], weekLabel: string): Promise<WeeklyReflection> {
  const res = await fetch('/api/gemini/weekly-review', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessions, weekLabel }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Weekly review generation failed' }));
    throw new Error(err.error || 'Failed to generate weekly review');
  }

  const data = await res.json();
  return {
    id: `weekly-${Date.now()}`,
    createdAt: new Date().toISOString(),
    ...data,
  };
}

// -------------------------------------------------------------
// V2 AI CLIENT METHODS
// -------------------------------------------------------------

export async function askJournal(params: {
  query: string;
  sessions: JournalSession[];
}): Promise<JournalQueryAnswer> {
  const res = await fetch('/api/gemini/ask-journal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Query failed' }));
    throw new Error(err.error || 'Failed to ask journal');
  }

  return res.json();
}

export async function convertThoughtToAction(params: {
  title?: string;
  text: string;
}): Promise<{
  planTitle: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  steps: Array<{ text: string; notes?: string }>;
}> {
  const res = await fetch('/api/gemini/thought-to-action', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Action extraction failed' }));
    throw new Error(err.error || 'Failed to generate action plan');
  }

  return res.json();
}

export async function getDecisionAnalysis(params: {
  title: string;
  context: string;
  options: DecisionOption[];
  criteria: string[];
  assumptions: string[];
}): Promise<{
  hiddenAssumptions: string[];
  blindSpots: string[];
  tradeoffSummary: string;
  recommendedFramework: string;
  analyzedAt: string;
}> {
  const res = await fetch('/api/gemini/decision-helper', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Decision analysis failed' }));
    throw new Error(err.error || 'Failed to analyze decision');
  }

  return res.json();
}

export async function analyzeEvidenceVsAssumption(statement: string): Promise<EvidenceVsAssumptionItem> {
  const res = await fetch('/api/gemini/evidence-vs-assumption', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ statement }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Belief analysis failed' }));
    throw new Error(err.error || 'Failed to analyze belief');
  }

  const data = await res.json();
  return {
    id: `eva-${Date.now()}`,
    statement,
    verifiedFacts: data.verifiedFacts || [],
    untestedAssumptions: data.untestedAssumptions || [],
    blindSpots: data.blindSpots || [],
    experimentsToTest: data.experimentsToTest || [],
    analyzedAt: data.analyzedAt || new Date().toISOString(),
  };
}

export async function getPatternsAndContradictions(sessions: JournalSession[]): Promise<PatternsData> {
  const res = await fetch('/api/gemini/patterns-analysis', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessions }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Patterns analysis failed' }));
    throw new Error(err.error || 'Failed to analyze patterns');
  }

  return res.json();
}

export async function extractUnresolved(params: {
  title?: string;
  content: string;
}): Promise<Array<{ title: string; context: string; urgency: 'low' | 'medium' | 'high' }>> {
  const res = await fetch('/api/gemini/unresolved-extractor', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unresolved extraction failed' }));
    throw new Error(err.error || 'Failed to extract unresolved thoughts');
  }

  const data = await res.json();
  return Array.isArray(data.unresolved) ? data.unresolved : [];
}

export async function scanUnresolvedFromSessions(sessions: JournalSession[]): Promise<Array<{
  title: string;
  context: string;
  firstMentioned?: string;
  lastMentioned?: string;
  occurrenceCount?: number;
  relatedTopics?: string[];
  aiObservation?: string;
  relatedSessions?: Array<{ id: string; title: string; date: string }>;
  urgency: 'low' | 'medium' | 'high';
}>> {
  const res = await fetch('/api/gemini/unresolved-extractor', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessions }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unresolved scan failed' }));
    throw new Error(err.error || 'Failed to scan unresolved thoughts');
  }

  const data = await res.json();
  return Array.isArray(data.unresolved) ? data.unresolved : [];
}
