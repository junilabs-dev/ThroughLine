export type MoodType = 'Great' | 'Good' | 'Neutral' | 'Low' | 'Difficult';

export type AiMode =
  | 'REFLECT'
  | 'SUMMARIZE'
  | 'BRAINSTORM'
  | 'CHALLENGE'
  | 'ACTION'
  | 'QUESTIONS'
  | 'SOCRATIC'
  | 'EVIDENCE'
  | 'STRATEGY';

export type AiStyle =
  | 'Supportive'
  | 'Concise'
  | 'Analytical'
  | 'Challenging'
  | 'Creative'
  | 'Socratic';

export type AiScope = 'all' | 'last_30_days' | 'pinned_only';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  mode?: AiMode;
  citations?: Array<{ sessionId: string; title: string; quote: string }>;
}

export interface JournalSession {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  mood?: MoodType;
  emotions: string[];
  tags: string[];
  summary?: string;
  aiInsights?: string;
  linkedGoalId?: string;
  linkedDecisionId?: string;
  status: 'draft' | 'completed' | 'archived';
  bookmarked?: boolean;
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  targetDate: string;
  status: 'active' | 'completed' | 'paused';
  progress: number; // 0 to 100
  notes?: string;
  createdAt: string;
  updatedAt: string;
  aiFeedback?: {
    progressObserved: string;
    blockers: string[];
    recurringIssues: string[];
    suggestedNextSteps: string[];
    encouragement?: string;
    analyzedAt: string;
  };
}

export interface Bookmark {
  id: string;
  title: string;
  type: 'entry' | 'ai_response' | 'insight' | 'idea' | 'decision' | 'action';
  content: string;
  referenceId?: string;
  createdAt: string;
  tags?: string[];
}

export interface WeeklyReflection {
  id: string;
  weekLabel: string;
  createdAt: string;
  whatWentWell: string[];
  whatWasDifficult: string[];
  whatKeptComingUp: string[];
  whatChanged: string[];
  whatDidILearn: string[];
  whatShouldIFocusOnNext: string[];
  nextWeeksQuestion: string;
}

export interface ThinkingMapNode {
  id: string;
  category: string;
  description: string;
  subtopics: string[];
  sentiment: 'positive' | 'neutral' | 'tension' | 'exploring';
  frequency: number;
  unresolvedQuestions: string[];
}

export interface ThinkingMapConnection {
  from: string;
  to: string;
  label: string;
}

export interface ThinkingMapData {
  overview: string;
  nodes: ThinkingMapNode[];
  connections: ThinkingMapConnection[];
  updatedAt?: string;
}

export interface PersonalInsightsData {
  keyThemes: string[];
  recurringChallenges: Array<{
    challenge: string;
    frequency: 'Frequent' | 'Emerging';
    insight: string;
  }>;
  positiveShifts: Array<{
    area: string;
    observation: string;
  }>;
  unresolvedTopics: Array<{
    topic: string;
    openQuestion: string;
  }>;
  actionableTakeaways: string[];
  analyzedAt?: string;
}

// -------------------------------------------------------------
// V2 NEW DOMAIN MODELS
// -------------------------------------------------------------

export interface DecisionOption {
  id: string;
  title: string;
  pros: string[];
  cons: string[];
  score?: number;
}

export interface Decision {
  id: string;
  title: string;
  context: string;
  criteria: string[];
  options: DecisionOption[];
  assumptions: string[];
  status: 'evaluating' | 'decided' | 'archived';
  chosenOptionId?: string;
  verdictRationale?: string;
  reviewDate?: string;
  createdAt: string;
  updatedAt: string;
  aiAnalysis?: {
    hiddenAssumptions: string[];
    blindSpots: string[];
    tradeoffSummary: string;
    recommendedFramework: string;
    analyzedAt: string;
  };
}

export interface ActionPlanStep {
  id: string;
  text: string;
  completed: boolean;
  dueDate?: string;
  notes?: string;
}

export interface ActionPlan {
  id: string;
  title: string;
  description?: string;
  sourceSessionId?: string;
  sourceSessionTitle?: string;
  sourceDecisionId?: string;
  priority: 'low' | 'medium' | 'high';
  status: 'not_started' | 'in_progress' | 'completed';
  steps: ActionPlanStep[];
  createdAt: string;
  updatedAt: string;
}

export interface UnresolvedThought {
  id: string;
  title: string;
  context: string;
  sourceSessionId?: string;
  sourceSessionTitle?: string;
  status: 'open' | 'in_progress' | 'resolved';
  urgency: 'low' | 'medium' | 'high';
  followUpNotes: Array<{ id: string; note: string; createdAt: string }>;
  resolution?: string;
  firstMentioned?: string;
  lastMentioned?: string;
  occurrenceCount?: number;
  relatedTopics?: string[];
  aiObservation?: string;
  relatedSessions?: Array<{ id: string; title: string; date: string }>;
  createdAt: string;
  updatedAt: string;
}

export interface JournalCitation {
  sessionId: string;
  sessionTitle: string;
  date: string;
  quote: string;
}

export interface JournalQueryAnswer {
  query: string;
  answer: string;
  observation?: string;
  supportingDates?: string[];
  retrievedCount?: number;
  citations: JournalCitation[];
  recurringThemes: string[];
  chronologicalTrend?: string;
  analyzedAt: string;
}

export interface EvidenceVsAssumptionItem {
  id: string;
  statement: string;
  verifiedFacts: string[];
  untestedAssumptions: string[];
  blindSpots: string[];
  experimentsToTest: string[];
  analyzedAt: string;
}

export interface ContradictionItem {
  id: string;
  title: string;
  statementA: { quote: string; sessionTitle?: string; date?: string; sessionId?: string };
  statementB: { quote: string; sessionTitle?: string; date?: string; sessionId?: string };
  tensionExplanation: string;
  socraticQuestion: string;
  dismissed?: boolean;
  saved?: boolean;
}

export interface PatternInsight {
  id: string;
  patternName: string;
  category: 'emotional' | 'cognitive' | 'behavioral' | 'energy';
  frequency: string;
  triggerContext: string;
  evolution: string;
  constructiveTakeaway: string;
}

export interface PatternsData {
  patterns: PatternInsight[];
  contradictions: ContradictionItem[];
  overallSynthesis: string;
  analyzedAt: string;
}

export interface UserSettings {
  aiStyle: AiStyle;
  aiScope: AiScope;
  dailyPromptEnabled: boolean;
  theme: 'light' | 'dark';
}
