import { useState, useEffect } from 'react';
import {
  CalendarCheck,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  ChevronDown,
  Calendar,
  History,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import {
  getWeeklyReflections,
  saveWeeklyReflection,
  getJournalSessions,
} from '../services/firestoreService';
import { getWeeklyReview } from '../services/geminiClient';
import type { WeeklyReflection, JournalSession } from '../types';

interface WeeklyReviewPageProps {
  onStartReflection: (prompt?: string) => void;
}

export default function WeeklyReviewPage({ onStartReflection }: WeeklyReviewPageProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [reviews, setReviews] = useState<WeeklyReflection[]>([]);
  const [activeReview, setActiveReview] = useState<WeeklyReflection | null>(null);
  const [sessions, setSessions] = useState<JournalSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadWeeklyData();
  }, [user]);

  const loadWeeklyData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const [userReviews, userSessions] = await Promise.all([
        getWeeklyReflections(user.uid),
        getJournalSessions(user.uid),
      ]);
      setReviews(userReviews);
      setSessions(userSessions);
      if (userReviews.length > 0) {
        setActiveReview(userReviews[0]);
      }
    } catch (err) {
      console.error(err);
      toast('Failed to load weekly reviews', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReview = async () => {
    if (!user) return;
    try {
      setGenerating(true);
      // Filter past 7 days of entries
      const oneWeekAgo = new Date(Date.now() - 7 * 86400000);
      const weekSessions = sessions.filter(
        (s) => new Date(s.createdAt || s.updatedAt) >= oneWeekAgo
      );

      const targetSessions = weekSessions.length > 0 ? weekSessions : sessions.slice(0, 10);
      if (targetSessions.length === 0) {
        toast('Write a few journal reflections first before generating a weekly review.', 'info');
        setGenerating(false);
        return;
      }

      const weekLabel = `Week of ${new Date().toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      })}`;

      const generated = await getWeeklyReview(targetSessions, weekLabel);
      await saveWeeklyReflection(user.uid, generated);

      setReviews([generated, ...reviews]);
      setActiveReview(generated);
      toast('Weekly Review synthesized successfully!', 'success');
    } catch (err: any) {
      console.error(err);
      toast(err.message || 'Failed to generate weekly review', 'error');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div id="weekly-review-page" className="p-6 md:p-10 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-800/80">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center">
              <CalendarCheck className="w-4 h-4" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-100">Weekly Review</h1>
            <span className="text-xs px-2 py-0.5 rounded bg-teal-950/80 text-teal-300 border border-teal-800 font-mono">
              7 PILLARS
            </span>
          </div>
          <p className="text-sm text-zinc-400 mt-1">
            Synthesize your reflections over the past 7 days to close the week with perspective and enter next week with clear focus.
          </p>
        </div>

        <button
          id="generate-weekly-review-btn"
          onClick={handleGenerateReview}
          disabled={generating}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 font-semibold text-xs transition-all shadow-sm active:scale-95 disabled:opacity-50"
        >
          <Sparkles className={`w-4 h-4 ${generating ? 'animate-spin text-indigo-600' : ''}`} />
          <span>{generating ? 'Synthesizing...' : 'Generate Review for This Week'}</span>
        </button>
      </div>

      {/* Review Selector if multiple archives exist */}
      {reviews.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          <span className="text-xs font-mono text-zinc-500 shrink-0">Archives:</span>
          {reviews.map((r) => (
            <button
              key={r.id}
              onClick={() => setActiveReview(r)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors shrink-0 ${
                activeReview?.id === r.id
                  ? 'bg-zinc-800 text-zinc-100 border-zinc-600'
                  : 'bg-zinc-900/60 text-zinc-400 border-zinc-800 hover:text-zinc-200'
              }`}
            >
              {r.weekLabel}
            </button>
          ))}
        </div>
      )}

      {/* Active Review View */}
      {loading ? (
        <div className="p-16 text-center text-zinc-500 text-sm">Loading weekly reviews...</div>
      ) : !activeReview ? (
        <div className="p-16 rounded-2xl bg-zinc-900/30 border border-zinc-800/60 text-center space-y-4">
          <CalendarCheck className="w-10 h-10 text-zinc-600 mx-auto" />
          <h3 className="text-base font-semibold text-zinc-200">No weekly review yet</h3>
          <p className="text-xs text-zinc-400 max-w-md mx-auto">
            Click "Generate Review for This Week" to let Gemini analyze your reflections from the past 7 days across the 7
            core pillars.
          </p>
          <button
            onClick={handleGenerateReview}
            disabled={generating}
            className="px-5 py-2.5 rounded-xl bg-zinc-100 text-zinc-950 font-semibold text-xs transition-all hover:bg-white"
          >
            Generate First Review
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-mono text-indigo-400 font-semibold uppercase">
              {activeReview.weekLabel}
            </span>
            <span className="text-xs text-zinc-500">
              Synthesized {new Date(activeReview.createdAt).toLocaleDateString()}
            </span>
          </div>

          {/* The 7 Core Pillars Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* 1. What Went Well */}
            <div className="p-5 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <h3 className="text-xs font-mono uppercase text-emerald-400 font-semibold tracking-wider">
                  1. What Went Well
                </h3>
              </div>
              <ul className="space-y-2 text-xs text-zinc-300">
                {activeReview.whatWentWell?.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 leading-relaxed">
                    <span className="text-emerald-400 shrink-0 mt-0.5">&bull;</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* 2. What Was Difficult */}
            <div className="p-5 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-rose-400" />
                <h3 className="text-xs font-mono uppercase text-rose-400 font-semibold tracking-wider">
                  2. What Was Difficult
                </h3>
              </div>
              <ul className="space-y-2 text-xs text-zinc-300">
                {activeReview.whatWasDifficult?.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 leading-relaxed">
                    <span className="text-rose-400 shrink-0 mt-0.5">&bull;</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* 3. What Kept Coming Up */}
            <div className="p-5 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-400" />
                <h3 className="text-xs font-mono uppercase text-amber-400 font-semibold tracking-wider">
                  3. What Kept Coming Up
                </h3>
              </div>
              <ul className="space-y-2 text-xs text-zinc-300">
                {activeReview.whatKeptComingUp?.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 leading-relaxed">
                    <span className="text-amber-400 shrink-0 mt-0.5">&bull;</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* 4. What Changed */}
            <div className="p-5 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-indigo-400" />
                <h3 className="text-xs font-mono uppercase text-indigo-400 font-semibold tracking-wider">
                  4. What Changed (Shifts in Thinking)
                </h3>
              </div>
              <ul className="space-y-2 text-xs text-zinc-300">
                {activeReview.whatChanged?.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 leading-relaxed">
                    <span className="text-indigo-400 shrink-0 mt-0.5">&bull;</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* 5. What Did I Learn */}
            <div className="p-5 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-sky-400" />
                <h3 className="text-xs font-mono uppercase text-sky-400 font-semibold tracking-wider">
                  5. What Did I Learn
                </h3>
              </div>
              <ul className="space-y-2 text-xs text-zinc-300">
                {activeReview.whatDidILearn?.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 leading-relaxed">
                    <span className="text-sky-400 shrink-0 mt-0.5">&bull;</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* 6. What Should I Focus On Next */}
            <div className="p-5 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-teal-400" />
                <h3 className="text-xs font-mono uppercase text-teal-400 font-semibold tracking-wider">
                  6. What Should I Focus On Next
                </h3>
              </div>
              <ul className="space-y-2 text-xs text-zinc-300">
                {activeReview.whatShouldIFocusOnNext?.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 leading-relaxed font-medium">
                    <span className="text-teal-400 shrink-0 mt-0.5">&bull;</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* 7. Next Week's Question Card */}
          <div className="p-6 sm:p-7 rounded-2xl bg-gradient-to-br from-indigo-950/40 via-zinc-900/60 to-zinc-900/40 border border-indigo-900/50 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                <HelpCircle className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-mono uppercase text-indigo-300 font-semibold tracking-wider">
                7. Next Week's Question
              </h3>
            </div>

            <p className="text-lg font-serif text-zinc-100 font-medium leading-relaxed">
              "{activeReview.nextWeeksQuestion}"
            </p>

            <div className="pt-2 flex items-center justify-end">
              <button
                onClick={() => onStartReflection(activeReview.nextWeeksQuestion)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/40 text-indigo-200 border border-indigo-500/40 font-medium text-xs transition-all active:scale-[0.98]"
              >
                <span>Reflect on this question</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
