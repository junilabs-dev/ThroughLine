import { useEffect, useState } from 'react';
import {
  PenLine,
  Sparkles,
  ArrowRight,
  Target,
  CalendarCheck,
  Flame,
  BookOpen,
  RefreshCw,
  Clock,
  Compass,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import {
  getJournalSessions,
  getGoals,
  getWeeklyReflections,
} from '../services/firestoreService';
import { getSmartPrompt } from '../services/geminiClient';
import type { JournalSession, Goal, WeeklyReflection } from '../types';
import { LumieCheckIn } from '../components/LumieCheckIn';

interface DashboardPageProps {
  onStartReflection: (initialPrompt?: string, goalId?: string) => void;
  onOpenSession: (session: JournalSession) => void;
  onNavigateTab: (tab: any) => void;
}

export default function DashboardPage({
  onStartReflection,
  onOpenSession,
  onNavigateTab,
}: DashboardPageProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [sessions, setSessions] = useState<JournalSession[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [weeklyReviews, setWeeklyReviews] = useState<WeeklyReflection[]>([]);
  const [loading, setLoading] = useState(true);

  // Daily Smart Prompt State
  const [todayPrompt, setTodayPrompt] = useState<{
    prompt: string;
    category: string;
    context: string;
  }>({
    prompt: 'What decision keeps coming back to your mind, and what is holding you back from deciding?',
    category: 'Decisions',
    context: 'Unresolved choices consume mental RAM until examined on paper.',
  });
  const [loadingPrompt, setLoadingPrompt] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadDashboardData();
  }, [user]);

  const loadDashboardData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const [userSessions, userGoals, userReviews] = await Promise.all([
        getJournalSessions(user.uid),
        getGoals(user.uid),
        getWeeklyReflections(user.uid),
      ]);
      setSessions(userSessions);
      setGoals(userGoals);
      setWeeklyReviews(userReviews);

      // Load personalized prompt based on user's recent themes
      const recentTags = Array.from(new Set(userSessions.flatMap((s) => s.tags || []))).slice(0, 5);
      const activeGoalTitle = userGoals.find((g) => g.status === 'active')?.title;
      try {
        const promptRes = await getSmartPrompt({
          recentThemes: recentTags,
          userGoal: activeGoalTitle,
        });
        if (promptRes && promptRes.prompt) {
          setTodayPrompt(promptRes);
        }
      } catch (err) {
        console.info('Smart prompt fallback utilized:', err);
      }
    } catch (error: any) {
      console.error('Failed to load dashboard:', error);
      toast('Failed to load reflections', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshPrompt = async () => {
    setLoadingPrompt(true);
    try {
      const recentTags = Array.from(new Set(sessions.flatMap((s) => s.tags || []))).slice(0, 5);
      const activeGoal = goals.find((g) => g.status === 'active')?.title;
      const res = await getSmartPrompt({ recentThemes: recentTags, userGoal: activeGoal });
      setTodayPrompt(res);
      toast('Generated fresh reflection prompt', 'info');
    } catch (err) {
      toast('Could not refresh prompt', 'error');
    } finally {
      setLoadingPrompt(false);
    }
  };

  // Calculate Streak
  const calculateStreak = (entries: JournalSession[]): number => {
    if (!entries.length) return 0;
    const dates = new Set(
      entries.map((e) => new Date(e.createdAt || e.updatedAt).toDateString())
    );
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() - i);
      if (dates.has(checkDate.toDateString())) {
        streak++;
      } else if (i > 0) {
        // Break in streak
        break;
      }
    }
    return streak;
  };

  const streak = calculateStreak(sessions);
  const activeGoalsCount = goals.filter((g) => g.status === 'active').length;
  const recentSessions = sessions.slice(0, 3);
  const latestSession = sessions[0];

  const getGreetingTime = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'GOOD MORNING';
    if (hour < 18) return 'GOOD AFTERNOON';
    return 'GOOD EVENING';
  };

  const displayName = user?.displayName ? user.displayName.split(' ')[0].toUpperCase() : 'FRIEND';

  return (
    <div id="dashboard-page" className="p-6 md:p-10 max-w-5xl mx-auto space-y-10">
      {/* Header Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-zinc-800/80">
        <div>
          <span className="font-mono text-xs text-indigo-400 tracking-wider font-semibold">
            {getGreetingTime()}, {displayName}
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-100 mt-1">
            What has been on your mind lately?
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Take a breath, slow down, and turn your thoughts into structured clarity.
          </p>
        </div>

        <button
          id="dashboard-start-reflection-btn"
          onClick={() => onStartReflection()}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 font-semibold text-sm transition-all shadow-sm hover:shadow active:scale-[0.98] shrink-0"
        >
          <PenLine className="w-4 h-4" />
          <span>Start a Reflection</span>
        </button>
      </div>

      {/* Lumie Mascot Mindful Check-in */}
      <LumieCheckIn onStartReflection={onStartReflection} />

      {/* Today's Smart Prompt Card */}
      <div className="p-6 sm:p-7 rounded-2xl bg-gradient-to-br from-indigo-950/40 via-zinc-900/60 to-zinc-900/40 border border-indigo-900/40 relative overflow-hidden">
        <div className="flex items-center justify-between gap-4 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-mono font-semibold text-indigo-300 tracking-wider uppercase">
              Today's Thought &bull; {todayPrompt.category}
            </span>
          </div>

          <button
            onClick={handleRefreshPrompt}
            disabled={loadingPrompt}
            title="Generate new thought"
            className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loadingPrompt ? 'animate-spin text-indigo-400' : ''}`} />
          </button>
        </div>

        <p className="text-lg sm:text-xl font-medium text-zinc-100 leading-snug font-serif">
          "{todayPrompt.prompt}"
        </p>

        {todayPrompt.context && (
          <p className="text-xs text-zinc-400 mt-2 font-sans">{todayPrompt.context}</p>
        )}

        <div className="mt-5 flex items-center gap-3">
          <button
            id="prompt-reflect-now-btn"
            onClick={() => onStartReflection(todayPrompt.prompt)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/40 text-indigo-200 border border-indigo-500/40 font-medium text-xs transition-all active:scale-[0.98]"
          >
            <span>Reflect on this question</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/70 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-orange-950/50 border border-orange-800/40 flex items-center justify-center text-orange-400 shrink-0">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-zinc-400 font-medium">Reflection Streak</p>
            <p className="text-xl font-bold text-zinc-100 mt-0.5">
              {streak} <span className="text-xs font-normal text-zinc-400">days</span>
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/70 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-950/50 border border-indigo-800/40 flex items-center justify-center text-indigo-400 shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-zinc-400 font-medium">Total Entries</p>
            <p className="text-xl font-bold text-zinc-100 mt-0.5">{sessions.length}</p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/70 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-teal-950/50 border border-teal-800/40 flex items-center justify-center text-teal-400 shrink-0">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-zinc-400 font-medium">Active Goals</p>
            <p className="text-xl font-bold text-zinc-100 mt-0.5">{activeGoalsCount}</p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/70 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-sky-950/50 border border-sky-800/40 flex items-center justify-center text-sky-400 shrink-0">
            <CalendarCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-zinc-400 font-medium">Weekly Reviews</p>
            <p className="text-xl font-bold text-zinc-100 mt-0.5">{weeklyReviews.length}</p>
          </div>
        </div>
      </div>

      {/* Main Content Split: Continue & Recent vs Signature Patterns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Recent Reflections */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
              <Clock className="w-4 h-4 text-zinc-400" />
              <span>Recent Reflections</span>
            </h2>
            <button
              onClick={() => onNavigateTab('history')}
              className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              View all ({sessions.length}) &rarr;
            </button>
          </div>

          {loading ? (
            <div className="p-8 text-center text-zinc-500 text-sm">Loading recent thoughts...</div>
          ) : recentSessions.length === 0 ? (
            <div className="p-8 rounded-2xl bg-zinc-900/30 border border-zinc-800/60 text-center">
              <Compass className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
              <p className="text-sm font-medium text-zinc-300">Your journal is ready</p>
              <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                Begin your very first reflection session. Thoughts will be saved privately in your personal Cloud Firestore.
              </p>
              <button
                onClick={() => onStartReflection()}
                className="mt-4 px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium"
              >
                Write First Reflection
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {recentSessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => onOpenSession(session)}
                  className="p-4 rounded-xl bg-zinc-900/40 hover:bg-zinc-900/70 border border-zinc-800/70 hover:border-zinc-700 cursor-pointer transition-all flex flex-col justify-between group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-sm font-semibold text-zinc-200 group-hover:text-indigo-300 transition-colors line-clamp-1">
                      {session.title || 'Untitled Reflection'}
                    </h3>
                    <span className="text-[11px] font-mono text-zinc-500 shrink-0">
                      {new Date(session.updatedAt || session.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>

                  <p className="text-xs text-zinc-400 mt-1.5 line-clamp-2 leading-relaxed">
                    {session.content || '(No written content yet)'}
                  </p>

                  <div className="mt-3 flex items-center justify-between text-[11px] text-zinc-500">
                    <div className="flex items-center gap-2">
                      {session.mood && (
                        <span className="px-2 py-0.5 rounded bg-zinc-800/90 text-zinc-300 border border-zinc-700/60">
                          {session.mood}
                        </span>
                      )}
                      {(session.tags || []).slice(0, 2).map((t) => (
                        <span key={t} className="text-zinc-500">
                          #{t}
                        </span>
                      ))}
                    </div>

                    <span className="text-indigo-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                      Open <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Patterns & Quick Navigation */}
        <div className="lg:col-span-5 space-y-6">
          {/* Thinking Map Teaser */}
          <div className="p-5 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <span className="text-xs font-mono uppercase text-indigo-400 font-semibold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Your Patterns
                </span>
                <span className="text-[10px] text-zinc-500 font-mono">Thinking Map</span>
              </div>
              <h3 className="text-sm font-semibold text-zinc-100 mt-3">
                Longitudinal Attention Map
              </h3>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                Discover recurring themes, persistent concerns, and unresolved questions that have quietly appeared across
                multiple reflections.
              </p>
            </div>

            <button
              onClick={() => onNavigateTab('thinking-map')}
              className="mt-4 w-full py-2.5 px-3 rounded-xl bg-zinc-800/80 hover:bg-zinc-800 text-zinc-200 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
            >
              <span>Explore Thinking Map</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Weekly Review Teaser */}
          <div className="p-5 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <span className="text-xs font-mono uppercase text-teal-400 font-semibold flex items-center gap-1.5">
                  <CalendarCheck className="w-3.5 h-3.5" />
                  Weekly Review
                </span>
                <span className="text-[10px] text-zinc-500 font-mono">7-Pillar Synthesis</span>
              </div>
              <h3 className="text-sm font-semibold text-zinc-100 mt-3">
                Review Your Last 7 Days
              </h3>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                Synthesize what went well, what proved difficult, what shifted in your thinking, and the focal question for
                the week ahead.
              </p>
            </div>

            <button
              onClick={() => onNavigateTab('weekly')}
              className="mt-4 w-full py-2.5 px-3 rounded-xl bg-zinc-800/80 hover:bg-zinc-800 text-zinc-200 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
            >
              <span>{weeklyReviews.length > 0 ? 'View Weekly Reviews' : 'Generate This Week\'s Review'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
