import { useState, useEffect } from 'react';
import {
  History,
  Calendar,
  Sparkles,
  ArrowRight,
  Clock,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { getJournalSessions } from '../services/firestoreService';
import type { JournalSession } from '../types';

interface RewindPageProps {
  onOpenSessionById?: (sessionId: string) => void;
  onStartReflection?: (prompt?: string) => void;
}

export default function RewindPage({ onOpenSessionById, onStartReflection }: RewindPageProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [sessions, setSessions] = useState<JournalSession[]>([]);
  const [loading, setLoading] = useState(true);

  // Rewind timeframe
  const [timeframe, setTimeframe] = useState<'7days' | '30days' | '90days' | 'all'>('30days');

  useEffect(() => {
    if (!user) return;
    loadSessions();
  }, [user]);

  const loadSessions = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const data = await getJournalSessions(user.uid);
      setSessions(data);
    } catch (err) {
      console.error(err);
      toast('Failed to load reflections', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Find reflections around milestones
  const now = Date.now();
  const getMilestoneMatches = (daysAgo: number) => {
    const targetMs = now - daysAgo * 24 * 60 * 60 * 1000;
    // within 3 days window
    const windowMs = 3 * 24 * 60 * 60 * 1000;
    return sessions.filter((s) => {
      const entryTime = new Date(s.createdAt).getTime();
      return Math.abs(entryTime - targetMs) <= windowMs;
    });
  };

  const sevenDaysAgo = getMilestoneMatches(7);
  const thirtyDaysAgo = getMilestoneMatches(30);
  const ninetyDaysAgo = getMilestoneMatches(90);

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-b border-zinc-800 pb-5">
        <div className="flex items-center gap-2 mb-1">
          <History className="w-5 h-5 text-indigo-400" />
          <h1 className="text-xl font-semibold tracking-tight text-zinc-100">Reflection Rewind</h1>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-950/80 border border-indigo-800/60 text-indigo-300">
            TIME TRAVEL
          </span>
        </div>
        <p className="text-xs text-zinc-400">
          Revisit past versions of yourself. Notice what you worried about then, and how your mindset has shifted.
        </p>
      </div>

      {/* Milestone Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 7 Days Ago */}
        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase text-indigo-300">7 Days Ago</span>
            <span className="text-[10px] text-zinc-500">{sevenDaysAgo.length} entries</span>
          </div>

          {sevenDaysAgo.length > 0 ? (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-zinc-100 line-clamp-1">{sevenDaysAgo[0].title}</h3>
              <p className="text-xs text-zinc-400 line-clamp-3 italic bg-zinc-950/50 p-2.5 rounded-lg border border-zinc-800/60">
                &ldquo;{sevenDaysAgo[0].content}&rdquo;
              </p>
              {onOpenSessionById && (
                <button
                  onClick={() => onOpenSessionById(sevenDaysAgo[0].id)}
                  className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 pt-1"
                >
                  <span>Read full entry</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
          ) : (
            <p className="text-xs text-zinc-500 italic">No entry found around 7 days ago.</p>
          )}
        </div>

        {/* 30 Days Ago */}
        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase text-teal-300">1 Month Ago</span>
            <span className="text-[10px] text-zinc-500">{thirtyDaysAgo.length} entries</span>
          </div>

          {thirtyDaysAgo.length > 0 ? (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-zinc-100 line-clamp-1">{thirtyDaysAgo[0].title}</h3>
              <p className="text-xs text-zinc-400 line-clamp-3 italic bg-zinc-950/50 p-2.5 rounded-lg border border-zinc-800/60">
                &ldquo;{thirtyDaysAgo[0].content}&rdquo;
              </p>
              {onOpenSessionById && (
                <button
                  onClick={() => onOpenSessionById(thirtyDaysAgo[0].id)}
                  className="text-xs text-teal-400 hover:text-teal-300 flex items-center gap-1 pt-1"
                >
                  <span>Read full entry</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
          ) : (
            <p className="text-xs text-zinc-500 italic">No entry found around 30 days ago.</p>
          )}
        </div>

        {/* 90 Days Ago */}
        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase text-amber-300">3 Months Ago</span>
            <span className="text-[10px] text-zinc-500">{ninetyDaysAgo.length} entries</span>
          </div>

          {ninetyDaysAgo.length > 0 ? (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-zinc-100 line-clamp-1">{ninetyDaysAgo[0].title}</h3>
              <p className="text-xs text-zinc-400 line-clamp-3 italic bg-zinc-950/50 p-2.5 rounded-lg border border-zinc-800/60">
                &ldquo;{ninetyDaysAgo[0].content}&rdquo;
              </p>
              {onOpenSessionById && (
                <button
                  onClick={() => onOpenSessionById(ninetyDaysAgo[0].id)}
                  className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 pt-1"
                >
                  <span>Read full entry</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
          ) : (
            <p className="text-xs text-zinc-500 italic">No entry found around 90 days ago.</p>
          )}
        </div>
      </div>

      {/* Rewind Reflection Prompt Card */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-950/30 to-purple-950/30 border border-indigo-800/40 space-y-3">
        <div className="flex items-center gap-2 text-indigo-300">
          <Sparkles className="w-4 h-4 text-indigo-400" />
          <h3 className="text-xs font-mono uppercase tracking-wider font-semibold">
            Rewind Inquiry
          </h3>
        </div>

        <p className="text-xs md:text-sm text-zinc-200 leading-relaxed">
          &ldquo;Look back at what you were stressing over a month ago. How much of that turned out to be an actual catastrophe? What skills or insights did you gain since?&rdquo;
        </p>

        {onStartReflection && (
          <button
            onClick={() =>
              onStartReflection(
                'Looking back on my past entries from 30 days ago, here is how my perspective and priorities have evolved:'
              )
            }
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-100 text-zinc-950 text-xs font-semibold hover:bg-white transition-all shadow-sm active:scale-[0.98]"
          >
            <span>Write a Rewind Reflection</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Chronological Timeline Stream */}
      <div className="space-y-3">
        <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-400 px-1">
          Chronological Memory Stream ({sessions.length} Reflections)
        </h3>

        {loading ? (
          <div className="p-8 text-center text-xs text-zinc-500 font-mono">Loading timeline...</div>
        ) : sessions.length === 0 ? (
          <div className="p-10 rounded-2xl bg-zinc-900/30 border border-zinc-800 text-center text-xs text-zinc-500">
            No reflections yet. Write your first reflection in the Journal!
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((s) => (
              <div
                key={s.id}
                onClick={() => onOpenSessionById && onOpenSessionById(s.id)}
                className="p-4 rounded-xl bg-zinc-900/40 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-zinc-200 group-hover:text-indigo-300 transition-colors">
                      {s.title}
                    </span>
                    {s.mood && (
                      <span className="text-[10px] text-zinc-400 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">
                        {s.mood}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-400 line-clamp-1">{s.content}</p>
                </div>

                <div className="flex items-center gap-3 text-[11px] text-zinc-500 flex-shrink-0">
                  <span>{new Date(s.createdAt).toLocaleDateString()}</span>
                  <span className="text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    &rarr;
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
