import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Save,
  Sparkles,
  Bot,
  Send,
  Check,
  Bookmark,
  Share2,
  Trash2,
  ArrowLeft,
  ChevronDown,
  Target,
  Smile,
  Tag,
  Copy,
  AlertCircle,
  Clock,
  HelpCircle,
  ListTodo,
  Scale,
  ShieldCheck,
  PenLine,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import {
  saveJournalSession,
  getSessionMessages,
  saveSessionMessage,
  deleteJournalSession,
  saveBookmark,
  getGoals,
  saveActionPlan,
  saveDecision,
  saveUnresolvedThought,
  getJournalSessions,
} from '../services/firestoreService';
import {
  askCompanion,
  convertThoughtToAction,
  extractUnresolved,
} from '../services/geminiClient';
import { MindMascot } from '../components/MindMascot';
import type {
  JournalSession,
  ChatMessage,
  MoodType,
  AiMode,
  Goal,
  ActionPlan,
  Decision,
  UnresolvedThought,
} from '../types';

interface JournalPageProps {
  initialSession?: JournalSession | null;
  initialPrompt?: string;
  initialGoalId?: string;
  onBack: () => void;
  onSessionSaved?: (session: JournalSession) => void;
  onNavigateTab?: (tab: any) => void;
}

const MOODS: Array<{ label: MoodType; icon: string; color: string }> = [
  { label: 'Great', icon: '🌟', color: 'bg-emerald-950/60 border-emerald-700/60 text-emerald-300' },
  { label: 'Good', icon: '✨', color: 'bg-teal-950/60 border-teal-700/60 text-teal-300' },
  { label: 'Neutral', icon: '🍃', color: 'bg-zinc-800/80 border-zinc-700 text-zinc-300' },
  { label: 'Low', icon: '🌧️', color: 'bg-blue-950/60 border-blue-800/60 text-blue-300' },
  { label: 'Difficult', icon: '⚡', color: 'bg-rose-950/60 border-rose-800/60 text-rose-300' },
];

const PRESET_EMOTIONS = [
  'Motivated',
  'Excited',
  'Focused',
  'Confused',
  'Frustrated',
  'Grateful',
  'Anxious',
  'Tired',
  'Relieved',
  'Curious',
];

const AI_MODES: Array<{ id: AiMode; title: string; subtitle: string }> = [
  { id: 'REFLECT', title: 'Reflect', subtitle: 'Explore nuance & clarify feelings' },
  { id: 'SUMMARIZE', title: 'Summarize', subtitle: 'Core ideas & essential tensions' },
  { id: 'BRAINSTORM', title: 'Brainstorm', subtitle: 'Alternative angles & possibilities' },
  { id: 'CHALLENGE', title: 'Challenge', subtitle: 'Respectfully test assumptions' },
  { id: 'ACTION', title: 'Action', subtitle: 'Practical, high-leverage next steps' },
  { id: 'QUESTIONS', title: 'Questions', subtitle: '2-3 catalytic questions' },
];

export default function JournalPage({
  initialSession,
  initialPrompt,
  initialGoalId,
  onBack,
  onSessionSaved,
  onNavigateTab,
}: JournalPageProps) {
  const { user, settings } = useAuth();
  const { toast } = useToast();

  // Session State
  const [sessionId, setSessionId] = useState<string>(
    initialSession?.id || `session-${Date.now()}`
  );
  const [title, setTitle] = useState<string>(initialSession?.title || '');
  const [content, setContent] = useState<string>(
    initialSession?.content || (initialPrompt ? `Prompt: ${initialPrompt}\n\n` : '')
  );
  const [mood, setMood] = useState<MoodType | undefined>(initialSession?.mood);
  const [emotions, setEmotions] = useState<string[]>(initialSession?.emotions || []);
  const [tags, setTags] = useState<string[]>(initialSession?.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [linkedGoalId, setLinkedGoalId] = useState<string | undefined>(
    initialSession?.linkedGoalId || initialGoalId
  );
  const [isBookmarked, setIsBookmarked] = useState<boolean>(initialSession?.bookmarked || false);

  // V2 Transition Loading States
  const [convertingToAction, setConvertingToAction] = useState(false);
  const [extractingLoops, setExtractingLoops] = useState(false);

  // Available Goals for Linking
  const [availableGoals, setAvailableGoals] = useState<Goal[]>([]);

  // Conversation State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeMode, setActiveMode] = useState<AiMode>('REFLECT');
  const [chatInput, setChatInput] = useState('');
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [mobileJournalView, setMobileJournalView] = useState<'canvas' | 'companion'>('canvas');
  const [pastSessions, setPastSessions] = useState<JournalSession[]>([]);

  // Auto-Save Indicator
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [lastSavedTime, setLastSavedTime] = useState<string>('just now');
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // Load conversation messages & goals on mount
  useEffect(() => {
    if (!user) return;
    loadGoals();
    loadPastSessions();
    if (initialSession?.id) {
      loadMessages(initialSession.id);
    }
  }, [user, initialSession?.id]);

  const loadPastSessions = async () => {
    if (!user) return;
    try {
      const history = await getJournalSessions(user.uid);
      setPastSessions(history);
    } catch (err) {
      console.info('Could not load past sessions for context retrieval:', err);
    }
  };

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAiGenerating]);

  const loadGoals = async () => {
    if (!user) return;
    try {
      const g = await getGoals(user.uid);
      setAvailableGoals(g);
    } catch (err) {
      console.info('Could not load goals:', err);
    }
  };

  const loadMessages = async (sid: string) => {
    if (!user) return;
    try {
      const msgs = await getSessionMessages(user.uid, sid);
      setMessages(msgs);
    } catch (err) {
      console.info('Could not load session messages:', err);
    }
  };

  // Trigger auto-save debounce on content or metadata edits
  useEffect(() => {
    setSaveStatus('unsaved');
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(() => {
      handleSave(false);
    }, 2500);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [title, content, mood, emotions, tags, linkedGoalId, isBookmarked]);

  const handleSave = async (showNotification = false): Promise<void> => {
    if (!user) return;
    // Prevent saving empty sessions if untouched
    if (!title.trim() && !content.trim()) return;

    try {
      setSaveStatus('saving');
      const now = new Date().toISOString();
      const sessionToSave: JournalSession = {
        id: sessionId,
        title: title.trim() || 'Untitled Reflection',
        content,
        createdAt: initialSession?.createdAt || now,
        updatedAt: now,
        mood,
        emotions,
        tags,
        linkedGoalId,
        bookmarked: isBookmarked,
        status: 'completed',
      };

      await saveJournalSession(user.uid, sessionToSave);
      setSaveStatus('saved');
      setLastSavedTime(
        new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      );
      if (onSessionSaved) {
        onSessionSaved(sessionToSave);
      }
      if (showNotification) {
        toast('Reflection saved securely', 'success');
      }
    } catch (error: any) {
      console.error('Save failed:', error);
      setSaveStatus('unsaved');
      toast('Failed to auto-save. Retrying on next stroke.', 'error');
    }
  };

  // Tag Management
  const handleAddTag = () => {
    const trimmed = tagInput.trim().replace(/^#/, '');
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  // Emotion Management
  const toggleEmotion = (emotion: string) => {
    if (emotions.includes(emotion)) {
      setEmotions(emotions.filter((e) => e !== emotion));
    } else {
      setEmotions([...emotions, emotion]);
    }
  };

  // AI Companion Trigger
  const handleSendToAi = async (customMessage?: string) => {
    if (!user) return;
    const msgToSend = customMessage !== undefined ? customMessage : chatInput.trim();

    if (!msgToSend && !content.trim()) {
      toast('Write some thoughts first or type a question for the companion.', 'info');
      return;
    }

    const userChatMessage: ChatMessage = {
      id: `msg-${Date.now()}-user`,
      role: 'user',
      content: msgToSend || `[Mode: ${activeMode}] Please unpack my reflection.`,
      timestamp: new Date().toISOString(),
      mode: activeMode,
    };

    const updatedMessages = [...messages, userChatMessage];
    setMessages(updatedMessages);
    setChatInput('');
    setIsAiGenerating(true);

    try {
      // First persist the user message
      await saveSessionMessage(user.uid, sessionId, userChatMessage);

      // Call the server Gemini endpoint
      const response = await askCompanion({
        sessionId,
        reflectionTitle: title,
        reflectionContent: content,
        mood,
        emotions,
        tags,
        mode: activeMode,
        style: settings.aiStyle,
        conversationHistory: updatedMessages,
        userMessage: msgToSend,
        pastSessions,
      });

      const aiChatMessage: ChatMessage = {
        id: `msg-${Date.now()}-ai`,
        role: 'assistant',
        content: response.reply,
        timestamp: new Date().toISOString(),
        mode: activeMode,
      };

      setMessages([...updatedMessages, aiChatMessage]);
      await saveSessionMessage(user.uid, sessionId, aiChatMessage);
    } catch (error: any) {
      console.error('AI Companion Error:', error);
      const errMsg = String(error?.message || '');
      const isCreditsDepleted =
        errMsg.toLowerCase().includes('prepayment credits') ||
        errMsg.toLowerCase().includes('resource_exhausted') ||
        errMsg.toLowerCase().includes('depleted') ||
        error?.status === 429;

      if (isCreditsDepleted) {
        const noticeMessage: ChatMessage = {
          id: `msg-${Date.now()}-ai-billing`,
          role: 'assistant',
          content: `⚠️ **AI Studio Notice: Prepayment Credits Depleted**\n\nThe Gemini API returned a \`429 RESOURCE_EXHAUSTED\` error because your Google AI Studio project's prepaid credits have run out.\n\n### How to restore AI Companion:\n1. Visit [Google AI Studio Projects](https://ai.studio/projects)\n2. Select your project and manage billing at [Gemini API Prepayment Docs](https://ai.google.dev/gemini-api/docs/billing#prepay)\n3. Add prepayment credits or link a billing account\n\n---\n*Gentle reminder for today: Your reflection has been safely saved. When you're not feeling well and aren't sure why, give yourself space to rest rather than forcing a resolution.*`,
          timestamp: new Date().toISOString(),
          mode: activeMode,
        };
        setMessages([...updatedMessages, noticeMessage]);
        toast('Gemini prepayment credits are depleted. Visit ai.studio/projects to top up.', 'error');
      } else {
        toast(error.message || 'Thinking companion was unable to respond', 'error');
      }
    } finally {
      setIsAiGenerating(false);
    }
  };

  // Bookmark specific AI message
  const handleBookmarkMessage = async (msg: ChatMessage) => {
    if (!user) return;
    try {
      await saveBookmark(user.uid, {
        id: `bm-${Date.now()}`,
        title: `AI Insight from "${title || 'Untitled'}"`,
        type: 'ai_response',
        content: msg.content,
        referenceId: sessionId,
        createdAt: new Date().toISOString(),
        tags,
      });
      toast('Saved to your Bookmarks', 'success');
    } catch (err) {
      toast('Failed to bookmark', 'error');
    }
  };

  // Bookmark the entire reflection
  const handleToggleBookmarkReflection = async () => {
    if (!user) return;
    const nextState = !isBookmarked;
    setIsBookmarked(nextState);

    if (nextState) {
      try {
        await saveBookmark(user.uid, {
          id: `bm-${sessionId}`,
          title: title || 'Untitled Reflection',
          type: 'entry',
          content: content.slice(0, 500),
          referenceId: sessionId,
          createdAt: new Date().toISOString(),
          tags,
        });
        toast('Reflection bookmarked', 'success');
      } catch (err) {
        toast('Failed to bookmark', 'error');
      }
    } else {
      toast('Bookmark removed', 'info');
    }
  };

  // Copy Markdown
  const handleExportMarkdown = () => {
    const md = `# ${title || 'Untitled Reflection'}\n*Date: ${new Date().toLocaleDateString()}*\n*Mood: ${
      mood || 'Not specified'
    } | Emotions: ${emotions.join(', ') || 'None'} | Tags: ${tags.join(', ') || 'None'}*\n\n${content}\n\n---\n### AI Companion Exploration\n\n${messages
      .map((m) => `**${m.role === 'user' ? 'You' : 'Companion'} (${m.mode || 'Reflect'}):**\n${m.content}\n`)
      .join('\n')}`;

    navigator.clipboard.writeText(md);
    toast('Copied full reflection and conversation as Markdown!', 'success');
  };

  // Delete Session
  const handleDeleteSession = async () => {
    if (!user) return;
    if (!window.confirm('Are you sure you want to permanently delete this reflection?')) return;
    try {
      await deleteJournalSession(user.uid, sessionId);
      toast('Reflection deleted', 'info');
      onBack();
    } catch (err) {
      toast('Failed to delete reflection', 'error');
    }
  };

  // V2 Thought -> Action Conversion
  const handleConvertToPlan = async () => {
    if (!user || !content.trim()) {
      toast('Write some thoughts first before turning into an action plan', 'info');
      return;
    }
    try {
      setConvertingToAction(true);
      const planData = await convertThoughtToAction({
        title,
        text: content,
      });
      const newPlan: ActionPlan = {
        id: `plan-${Date.now()}`,
        title: planData.planTitle || title || 'Action Plan from Reflection',
        description: planData.description,
        priority: planData.priority,
        status: 'in_progress',
        sourceSessionId: sessionId,
        sourceSessionTitle: title || 'Reflection',
        steps: planData.steps.map((s, idx) => ({
          id: `step-${Date.now()}-${idx}`,
          text: s.text,
          notes: s.notes,
          completed: false,
        })),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await saveActionPlan(user.uid, newPlan);
      toast('Action Plan created from this reflection!', 'success');
      if (onNavigateTab) {
        onNavigateTab('action-plans');
      }
    } catch (err) {
      toast('Failed to generate action plan', 'error');
    } finally {
      setConvertingToAction(false);
    }
  };

  // V2 Extract Unresolved Loops
  const handleExtractLoops = async () => {
    if (!user || !content.trim()) {
      toast('Write some thoughts first to scan for open loops', 'info');
      return;
    }
    try {
      setExtractingLoops(true);
      const loops = await extractUnresolved({
        title,
        content,
      });
      if (loops.length === 0) {
        toast('No open loops detected in this reflection', 'info');
        return;
      }
      for (const l of loops) {
        const t: UnresolvedThought = {
          id: `unresolved-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          title: l.title,
          context: l.context,
          status: 'open',
          urgency: l.urgency,
          sourceSessionId: sessionId,
          followUpNotes: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await saveUnresolvedThought(user.uid, t);
      }
      toast(`Saved ${loops.length} open loop(s) to tracker!`, 'success');
      if (onNavigateTab) {
        onNavigateTab('unresolved');
      }
    } catch (err) {
      toast('Extraction failed', 'error');
    } finally {
      setExtractingLoops(false);
    }
  };

  // V2 Send to Decision Room
  const handleSendToDecisions = async () => {
    if (!user || !content.trim()) {
      toast('Write some thoughts first before framing a decision', 'info');
      return;
    }
    const decision: Decision = {
      id: `decision-${Date.now()}`,
      title: title || 'Dilemma Framed from Reflection',
      context: content.slice(0, 350),
      criteria: [],
      options: [
        { id: 'opt-1', title: 'Option 1', pros: [], cons: [] },
        { id: 'opt-2', title: 'Option 2', pros: [], cons: [] },
      ],
      assumptions: [],
      status: 'evaluating',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    try {
      await saveDecision(user.uid, decision);
      toast('Sent to Decision Room as active evaluation!', 'success');
      if (onNavigateTab) {
        onNavigateTab('decisions');
      }
    } catch (err) {
      toast('Failed to create decision draft', 'error');
    }
  };

  const wordCount = useMemo(() => {
    if (!content.trim()) return 0;
    return content.trim().split(/\s+/).length;
  }, [content]);

  return (
    <div id="journal-workspace" className="h-[calc(100vh-3.5rem)] md:h-screen flex flex-col bg-zinc-950 text-zinc-100">
      {/* Top Utility Bar */}
      <div className="border-b border-zinc-800/80 px-4 md:px-6 py-2.5 flex items-center justify-between shrink-0 bg-zinc-950/90 backdrop-blur-sm z-20">
        <div className="flex items-center gap-3">
          <button
            id="journal-back-btn"
            onClick={onBack}
            className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80 rounded-lg transition-colors flex items-center gap-1 text-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back</span>
          </button>

          <div className="h-4 w-px bg-zinc-800 hidden sm:block" />

          {/* Auto-Save Status */}
          <div className="flex items-center gap-2 text-xs font-mono">
            {saveStatus === 'saving' && (
              <span className="text-amber-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                Saving...
              </span>
            )}
            {saveStatus === 'saved' && (
              <span className="text-zinc-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Saved {lastSavedTime}
              </span>
            )}
            {saveStatus === 'unsaved' && (
              <span className="text-zinc-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
                Unsaved changes
              </span>
            )}
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-400 hidden sm:inline font-mono">
            {wordCount} {wordCount === 1 ? 'word' : 'words'}
          </span>

          <button
            onClick={handleToggleBookmarkReflection}
            title={isBookmarked ? 'Remove Bookmark' : 'Bookmark Reflection'}
            className={`p-1.5 rounded-lg border transition-colors ${
              isBookmarked
                ? 'bg-amber-950/60 border-amber-700/60 text-amber-300'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Bookmark className="w-4 h-4" />
          </button>

          <button
            onClick={handleExportMarkdown}
            title="Export Markdown"
            className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <Share2 className="w-4 h-4" />
          </button>

          <button
            id="journal-manual-save-btn"
            onClick={() => handleSave(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-all"
          >
            <Save className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Save</span>
          </button>

          <button
            onClick={handleDeleteSession}
            title="Delete Reflection"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mobile Device Tab Switcher (< lg screens) */}
      <div className="lg:hidden flex items-center bg-zinc-950 px-3 py-2 border-b border-zinc-800/80 gap-2 shrink-0 z-10">
        <button
          onClick={() => setMobileJournalView('canvas')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-medium transition-all min-h-[42px] ${
            mobileJournalView === 'canvas'
              ? 'bg-zinc-800 text-zinc-100 border border-zinc-700 shadow-sm'
              : 'bg-zinc-900/50 text-zinc-400 hover:text-zinc-200 border border-zinc-800/40'
          }`}
        >
          <PenLine className="w-3.5 h-3.5 text-indigo-400" />
          <span>Writing Canvas</span>
          <span className="text-[10px] font-mono text-zinc-500">({wordCount}w)</span>
        </button>
        <button
          onClick={() => setMobileJournalView('companion')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-medium transition-all min-h-[42px] ${
            mobileJournalView === 'companion'
              ? 'bg-zinc-800 text-zinc-100 border border-zinc-700 shadow-sm'
              : 'bg-zinc-900/50 text-zinc-400 hover:text-zinc-200 border border-zinc-800/40'
          }`}
        >
          <Bot className="w-3.5 h-3.5 text-indigo-400" />
          <span>AI Companion</span>
          {messages.length > 0 && (
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800">
              {messages.length}
            </span>
          )}
        </button>
      </div>

      {/* Main Split Layout: Writing Canvas + AI Companion */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left: Distraction-Free Writing Canvas */}
        <div
          className={`flex-1 flex-col overflow-y-auto p-4 sm:p-6 md:p-10 border-b lg:border-b-0 lg:border-r border-zinc-800/80 bg-zinc-950 ${
            mobileJournalView === 'canvas' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          <div className="max-w-2xl w-full mx-auto flex-1 flex flex-col space-y-6">
            {/* Title Input */}
            <input
              id="journal-title-input"
              type="text"
              placeholder="Title of this reflection..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-transparent text-2xl md:text-3xl font-bold tracking-tight text-zinc-100 placeholder:text-zinc-700 focus:outline-none border-b border-transparent focus:border-zinc-800 pb-2 transition-colors"
            />

            {/* Mood & Emotion Metadata Bar */}
            <div className="space-y-3 pt-2">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs font-mono text-zinc-400">Mood:</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {MOODS.map((m) => {
                    const isSelected = mood === m.label;
                    return (
                      <button
                        key={m.label}
                        onClick={() => setMood(isSelected ? undefined : m.label)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                          isSelected
                            ? m.color
                            : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        <span>{m.icon}</span>
                        <span>{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Emotions Selection */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-mono text-zinc-400">Feelings:</span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {PRESET_EMOTIONS.map((emo) => {
                    const isSelected = emotions.includes(emo);
                    return (
                      <button
                        key={emo}
                        onClick={() => toggleEmotion(emo)}
                        className={`px-2 py-0.5 rounded-full text-[11px] font-medium border transition-colors ${
                          isSelected
                            ? 'bg-indigo-950/80 border-indigo-700 text-indigo-300'
                            : 'bg-zinc-900/40 border-zinc-800/80 text-zinc-400 hover:text-zinc-300'
                        }`}
                      >
                        {emo}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Goal Linker & Tags Row */}
              <div className="flex flex-wrap items-center gap-4 pt-1">
                {/* Linked Goal */}
                {availableGoals.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Target className="w-3.5 h-3.5 text-zinc-400" />
                    <select
                      value={linkedGoalId || ''}
                      onChange={(e) => setLinkedGoalId(e.target.value || undefined)}
                      className="bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 rounded-lg px-2 py-1 focus:outline-none focus:border-zinc-700"
                    >
                      <option value="">Link to Goal (Optional)</option>
                      {availableGoals.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.title}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Tags */}
                <div className="flex items-center gap-1.5 flex-wrap flex-1">
                  <Tag className="w-3.5 h-3.5 text-zinc-400" />
                  {tags.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-zinc-900 border border-zinc-800 text-zinc-300"
                    >
                      #{t}
                      <button
                        onClick={() => handleRemoveTag(t)}
                        className="text-zinc-400 hover:text-zinc-200 ml-0.5"
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                  <div className="inline-flex items-center">
                    <input
                      type="text"
                      placeholder="Add tag..."
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddTag();
                        }
                      }}
                      className="bg-transparent text-xs text-zinc-300 placeholder:text-zinc-700 focus:outline-none w-20 px-1 py-0.5"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* V2 Thought Transitions Toolbar */}
            <div className="flex items-center justify-between gap-2 flex-wrap pt-2 pb-1 border-b border-zinc-900">
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={handleConvertToPlan}
                  disabled={convertingToAction || !content.trim()}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-950/60 hover:bg-indigo-900/80 border border-indigo-800/60 text-indigo-300 text-xs font-medium transition-all disabled:opacity-40"
                  title="Convert this reflection into an actionable plan"
                >
                  <ListTodo className="w-3.5 h-3.5" />
                  <span>{convertingToAction ? 'Planning...' : 'Make Action Plan'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleSendToDecisions}
                  disabled={!content.trim()}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-medium transition-all disabled:opacity-40"
                  title="Frame this reflection as an active decision in the Decision Room"
                >
                  <Scale className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Send to Decision Room</span>
                </button>

                <button
                  type="button"
                  onClick={handleExtractLoops}
                  disabled={extractingLoops || !content.trim()}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-medium transition-all disabled:opacity-40"
                  title="Detect unresolved questions or dilemmas in this writing"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-zinc-400" />
                  <span>{extractingLoops ? 'Extracting...' : 'Extract Open Loops'}</span>
                </button>
              </div>

              <div className="flex items-center gap-1 text-[10px] text-zinc-500 font-mono">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
                <span>Isolated to your account</span>
              </div>
            </div>

            {/* The Sacred Free-Form Writing Canvas */}
            <div className="flex-1 flex flex-col pt-2">
              <textarea
                id="journal-content-textarea"
                placeholder="Dump your raw thoughts here. Unpack what happened, what feels heavy, or what decision is calling for clarity..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full flex-1 bg-transparent text-zinc-200 placeholder:text-zinc-700 focus:outline-none resize-none leading-relaxed text-base font-serif tracking-wide border-0 p-0 selection:bg-indigo-900/40 min-h-[350px]"
              />
            </div>
          </div>
        </div>

        {/* Right: AI Thinking Companion Panel */}
        <div
          className={`w-full lg:w-[460px] xl:w-[500px] flex-col bg-zinc-950/60 shrink-0 border-t lg:border-t-0 ${
            mobileJournalView === 'companion' ? 'flex flex-1' : 'hidden lg:flex'
          }`}
        >
          {/* Companion Header */}
          <div className="p-4 border-b border-zinc-800/80 flex items-center justify-between shrink-0 bg-zinc-950/80">
            <div className="flex items-center gap-2.5">
              <div className="relative shrink-0 flex items-center justify-center p-0.5 rounded-xl bg-zinc-900 border border-indigo-500/30">
                <MindMascot
                  mood={isAiGenerating ? 'thinking' : saveStatus === 'saving' ? 'thinking' : 'peaceful'}
                  size="xs"
                />
              </div>
              <div>
                <h3 className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                  <span>AI Thinking Companion</span>
                  {isAiGenerating && (
                    <span className="text-[10px] font-mono text-teal-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
                      Lumie thinking...
                    </span>
                  )}
                </h3>
                <p className="text-[10px] text-zinc-400">Lumie is holding context for this session</p>
              </div>
            </div>

            <div className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800">
              Style: {settings.aiStyle}
            </div>
          </div>

          {/* AI Mode Selector Tabs */}
          <div className="p-3 border-b border-zinc-800/80 bg-zinc-900/30 shrink-0">
            <div className="grid grid-cols-3 gap-1.5">
              {AI_MODES.map((m) => {
                const isActive = activeMode === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => {
                      setActiveMode(m.id);
                      handleSendToAi(`[Switched to ${m.id} Mode]`);
                    }}
                    className={`p-2 rounded-lg text-left transition-all border ${
                      isActive
                        ? 'bg-indigo-950/70 border-indigo-700/80 text-indigo-200 shadow-sm'
                        : 'bg-zinc-900/40 border-zinc-800/60 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
                    }`}
                  >
                    <p className="text-xs font-semibold">{m.title}</p>
                    <p className="text-[9px] text-zinc-400 truncate leading-tight mt-0.5">{m.subtitle}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Conversation Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-500 space-y-3">
                <div className="p-2 rounded-2xl bg-zinc-900/60 border border-indigo-500/20 mb-1">
                  <MindMascot mood="idle" size="md" interactive={false} />
                </div>
                <h4 className="text-xs font-semibold text-zinc-200">Lumie is listening to your reflections</h4>
                <p className="text-xs text-zinc-400 max-w-xs leading-relaxed">
                  Choose an inquiry mode above or jot down your ideas on the left, then let Lumie help you unpack what is beneath the surface.
                </p>
                <div className="flex flex-wrap justify-center gap-2 pt-2">
                  <button
                    onClick={() => handleSendToAi('What is the core dilemma in what I wrote?')}
                    className="px-2.5 py-1 rounded-full text-[11px] bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 transition-colors"
                  >
                    "Identify the core dilemma"
                  </button>
                  <button
                    onClick={() => handleSendToAi('What assumptions might I be making?')}
                    className="px-2.5 py-1 rounded-full text-[11px] bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 transition-colors"
                  >
                    "Question my assumptions"
                  </button>
                </div>
              </div>
            ) : (
              messages.map((msg) => {
                const isUser = msg.role === 'user';
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1`}
                  >
                    <div className="flex items-center gap-2 px-1 text-[10px] text-zinc-400 font-mono">
                      <span>{isUser ? 'You' : 'Companion'}</span>
                      {msg.mode && <span>&bull; {msg.mode}</span>}
                      <span>
                        &bull; {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div
                      className={`p-3.5 rounded-2xl max-w-[90%] text-xs leading-relaxed ${
                        isUser
                          ? 'bg-zinc-800 text-zinc-100 rounded-tr-none border border-zinc-700'
                          : 'bg-zinc-900/90 text-zinc-200 rounded-tl-none border border-zinc-800/90 shadow-sm'
                      }`}
                    >
                      <div className="prose prose-invert prose-xs max-w-none">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>

                      {!isUser && (
                        <div className="mt-2.5 pt-2 border-t border-zinc-800/60 flex items-center justify-end gap-2 text-zinc-400">
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(msg.content);
                              toast('Copied response', 'info');
                            }}
                            title="Copy response"
                            className="p-1 hover:text-zinc-200 transition-colors"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleBookmarkMessage(msg)}
                            title="Bookmark response"
                            className="p-1 hover:text-amber-400 transition-colors"
                          >
                            <Bookmark className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}

            {isAiGenerating && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs text-indigo-300 font-mono animate-pulse">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
                <span>Companion is thinking with Gemini...</span>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Chat Input Box */}
          <div className="p-3 border-t border-zinc-800/80 bg-zinc-950 shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendToAi();
              }}
              className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1.5 focus-within:border-zinc-700"
            >
              <input
                id="companion-chat-input"
                type="text"
                placeholder={`Ask companion in ${activeMode} mode...`}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                disabled={isAiGenerating}
                className="flex-1 bg-transparent text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none py-1"
              />
              <button
                id="companion-send-btn"
                type="submit"
                disabled={isAiGenerating}
                className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
