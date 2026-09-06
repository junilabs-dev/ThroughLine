import { useState, useEffect } from 'react';
import {
  Sparkles,
  RefreshCw,
  TrendingUp,
  AlertCircle,
  HelpCircle,
  CheckCircle2,
  Smile,
  Tag,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import {
  getJournalSessions,
  getGoals,
  getSavedInsights,
  saveInsights,
} from '../services/firestoreService';
import { getPersonalInsights } from '../services/geminiClient';
import type { PersonalInsightsData, JournalSession, Goal } from '../types';

interface InsightsPageProps {
  onStartReflection: (prompt?: string) => void;
}

export default function InsightsPage({ onStartReflection }: InsightsPageProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [insights, setInsights] = useState<PersonalInsightsData | null>(null);
  const [sessions, setSessions] = useState<JournalSession[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const [userSessions, userGoals, cachedInsights] = await Promise.all([
        getJournalSessions(user.uid),
        getGoals(user.uid),
        getSavedInsights(user.uid),
      ]);
      setSessions(userSessions);
      setGoals(userGoals);

      if (cachedInsights) {
        setInsights(cachedInsights);
      } else if (userSessions.length > 0) {
        await handleGenerateInsights(userSessions, userGoals);
      }
    } catch (err: any) {
      console.error(err);
      toast('Failed to load insights', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateInsights = async (
    targetSessions = sessions,
    targetGoals = goals
  ) => {
    if (!user) return;
    try {
      setAnalyzing(true);
      const res = await getPersonalInsights(targetSessions, targetGoals);
      setInsights(res);
      await saveInsights(user.uid, res);
      toast('Insights updated from your recent reflections', 'success');
    } catch (err: any) {
      console.error(err);
      toast(err.message || 'Failed to analyze reflections', 'error');
    } finally {
      setAnalyzing(false);
    }
  };

  // Mood Frequency Count
  const moodCounts = sessions.reduce((acc: Record<string, number>, s) => {
    if (s.mood) {
      acc[s.mood] = (acc[s.mood] || 0) + 1;
    }
    return acc;
  }, {});

  // Top Tags
  const tagCounts = sessions.reduce((acc: Record<string, number>, s) => {
    (s.tags || []).forEach((t) => {
      acc[t] = (acc[t] || 0) + 1;
    });
    return acc;
  }, {});
  const topTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  return (
    <div id="insights-page" className="p-6 md:p-10 max-w-5xl mx-auto space-y-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-800/80">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-100">Personal Insights</h1>
          </div>
          <p className="text-sm text-zinc-400 mt-1">
            Synthesized self-understanding answering the core questions of your thinking journey.
          </p>
        </div>

        <button
          id="regenerate-insights-btn"
          onClick={() => handleGenerateInsights()}
          disabled={analyzing}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 text-xs font-medium transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${analyzing ? 'animate-spin text-indigo-400' : ''}`} />
          <span>{analyzing ? 'Analyzing...' : 'Refresh Insights'}</span>
        </button>
      </div>

      {/* Overview Analytics Bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Mood Distribution */}
        <div className="p-5 rounded-2xl bg-zinc-900/40 border border-zinc-800/70 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-mono uppercase text-zinc-400 font-semibold flex items-center gap-1.5">
              <Smile className="w-3.5 h-3.5 text-teal-400" />
              Recorded Moods
            </h3>
            <span className="text-xs text-zinc-500">{sessions.length} entries</span>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {Object.keys(moodCounts).length === 0 ? (
              <p className="text-xs text-zinc-500">Record moods in your journal to observe trends.</p>
            ) : (
              Object.entries(moodCounts).map(([m, count]) => (
                <div
                  key={m}
                  className="px-3 py-1.5 rounded-xl bg-zinc-800/60 border border-zinc-700/60 text-xs text-zinc-200 flex items-center gap-2"
                >
                  <span className="font-medium">{m}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-400">
                    {count}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Top Discussion Tags */}
        <div className="p-5 rounded-2xl bg-zinc-900/40 border border-zinc-800/70 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-mono uppercase text-zinc-400 font-semibold flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-indigo-400" />
              Top Reflection Tags
            </h3>
            <span className="text-xs text-zinc-500">{topTags.length} active tags</span>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {topTags.length === 0 ? (
              <p className="text-xs text-zinc-500">Add tags to your reflections to track topics.</p>
            ) : (
              topTags.map(([tag, count]) => (
                <span
                  key={tag}
                  className="px-3 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 flex items-center gap-1.5"
                >
                  #{tag}
                  <span className="text-[10px] text-zinc-500 font-mono">({count})</span>
                </span>
              ))
            )}
          </div>
        </div>
      </div>

      {/* The 4 Core Questions Grid */}
      <div className="space-y-6">
        {/* 1. What have I been thinking about? */}
        <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full bg-indigo-400" />
            <h2 className="text-base font-semibold text-zinc-100">
              1. What have I been thinking about?
            </h2>
          </div>
          <p className="text-xs text-zinc-400">
            Primary recurrent themes extracted across your recent entries.
          </p>

          <div className="flex flex-wrap gap-2.5">
            {insights?.keyThemes?.map((theme, i) => (
              <span
                key={i}
                className="px-3.5 py-1.5 rounded-xl bg-indigo-950/40 border border-indigo-800/50 text-indigo-200 text-xs font-medium"
              >
                {theme}
              </span>
            ))}
          </div>
        </div>

        {/* 2. What keeps coming up? */}
        <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full bg-rose-400" />
            <h2 className="text-base font-semibold text-zinc-100">
              2. What keeps coming up? (Recurring Challenges & Tensions)
            </h2>
          </div>
          <p className="text-xs text-zinc-400">
            Patterns of friction, doubt, or cognitive friction that repeat in your writing.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {insights?.recurringChallenges?.map((ch, i) => (
              <div
                key={i}
                className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 text-xs text-zinc-300 space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-zinc-200">{ch.challenge}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-950/60 text-rose-300 border border-rose-800/50">
                    {ch.frequency}
                  </span>
                </div>
                <p className="text-zinc-400 mt-1 leading-relaxed">{ch.insight}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 3. What seems to be improving? */}
        <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
            <h2 className="text-base font-semibold text-zinc-100">
              3. What seems to be improving? (Positive Shifts)
            </h2>
          </div>
          <p className="text-xs text-zinc-400">
            Observable shifts in your mindset, habits, or behavioral breakthroughs.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {insights?.positiveShifts?.map((shift, i) => (
              <div
                key={i}
                className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 text-xs text-zinc-300 space-y-1"
              >
                <p className="font-semibold text-emerald-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  {shift.area}
                </p>
                <p className="text-zinc-400 mt-1 leading-relaxed">{shift.observation}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 4. What still needs attention? */}
        <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full bg-amber-400" />
            <h2 className="text-base font-semibold text-zinc-100">
              4. What still needs attention? (Unresolved Topics)
            </h2>
          </div>
          <p className="text-xs text-zinc-400">
            Open threads that warrant continued reflection and honest self-inquiry.
          </p>

          <div className="space-y-2.5">
            {insights?.unresolvedTopics?.map((topic, i) => (
              <div
                key={i}
                className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <span className="font-semibold text-zinc-200">{topic.topic}</span>
                  <p className="text-zinc-400 mt-0.5 font-serif">"{topic.openQuestion}"</p>
                </div>

                <button
                  onClick={() => onStartReflection(topic.openQuestion)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-indigo-300 font-medium text-xs transition-colors shrink-0"
                >
                  <span>Reflect</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
