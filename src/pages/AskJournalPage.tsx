import { useState, useEffect } from 'react';
import {
  Search,
  Sparkles,
  ArrowRight,
  BookOpen,
  Calendar,
  Quote,
  Clock,
  Tag,
  TrendingUp,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { getJournalSessions } from '../services/firestoreService';
import { askJournal } from '../services/geminiClient';
import type { JournalSession, JournalQueryAnswer } from '../types';

interface AskJournalPageProps {
  onOpenSessionById?: (sessionId: string) => void;
}

const SAMPLE_QUERIES = [
  'What have I written about changing careers or jobs?',
  'When did I feel most energized and why?',
  'What recurring friction points or blockers keep coming up?',
  'What habits have made the biggest positive difference?',
  'What decisions have I been procrastinating on?',
];

export default function AskJournalPage({ onOpenSessionById }: AskJournalPageProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [sessions, setSessions] = useState<JournalSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);

  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [result, setResult] = useState<JournalQueryAnswer | null>(null);
  const [queryHistory, setQueryHistory] = useState<JournalQueryAnswer[]>([]);

  useEffect(() => {
    if (!user) return;
    loadSessions();
  }, [user]);

  const loadSessions = async () => {
    if (!user) return;
    try {
      setLoadingSessions(true);
      const data = await getJournalSessions(user.uid);
      setSessions(data);
    } catch (err) {
      console.error(err);
      toast('Failed to load reflections for search', 'error');
    } finally {
      setLoadingSessions(false);
    }
  };

  const handleSearch = async (queryText?: string) => {
    const q = (queryText || query).trim();
    if (!q) {
      toast('Please enter a question to ask your journal', 'info');
      return;
    }

    if (sessions.length === 0) {
      toast('No reflections available yet. Write some entries first!', 'info');
      return;
    }

    try {
      setIsSearching(true);
      setQuery(q);
      const answer = await askJournal({
        query: q,
        sessions,
      });

      setResult(answer);
      setQueryHistory((prev) => [answer, ...prev.slice(0, 4)]);
    } catch (err: any) {
      console.error(err);
      toast('Journal query failed: ' + (err.message || 'Error'), 'error');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="border-b border-zinc-800 pb-5">
        <div className="flex items-center gap-2 mb-1">
          <Search className="w-5 h-5 text-indigo-400" />
          <h1 className="text-xl font-semibold tracking-tight text-zinc-100">Ask My Journal</h1>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-950/80 border border-indigo-800/60 text-indigo-300">
            SEMANTIC INTELLIGENCE
          </span>
        </div>
        <p className="text-xs text-zinc-400">
          Query your personal thinking history. Answers are grounded in your actual words with citations.
        </p>
      </div>

      {/* Query Bar */}
      <div className="p-4 md:p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-3 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              id="ask-journal-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Ask anything about your past thoughts, habits, or decisions..."
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-zinc-950 border border-zinc-800 text-xs md:text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all"
            />
          </div>

          <button
            id="ask-journal-submit-btn"
            onClick={() => handleSearch()}
            disabled={isSearching || !query.trim()}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-zinc-100 hover:bg-white disabled:opacity-50 text-zinc-950 font-semibold text-xs md:text-sm transition-all shadow-sm active:scale-[0.98]"
          >
            {isSearching ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Reading...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>Ask</span>
              </>
            )}
          </button>
        </div>

        {/* Suggestion Chips */}
        <div className="flex items-center gap-2 flex-wrap pt-1">
          <span className="text-[10px] font-mono text-zinc-500 uppercase">Try asking:</span>
          {SAMPLE_QUERIES.map((sample, idx) => (
            <button
              key={idx}
              onClick={() => handleSearch(sample)}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-zinc-800/60 hover:bg-zinc-800 text-zinc-300 border border-zinc-700/50 hover:border-zinc-600 transition-all text-left"
            >
              &ldquo;{sample}&rdquo;
            </button>
          ))}
        </div>
      </div>

      {/* Results View */}
      {isSearching ? (
        <div className="p-12 rounded-2xl bg-zinc-900/30 border border-zinc-800 text-center space-y-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mx-auto animate-pulse">
            <Sparkles className="w-5 h-5" />
          </div>
          <p className="text-xs font-mono uppercase tracking-wider text-zinc-400">
            Synthesizing across {sessions.length} reflections...
          </p>
        </div>
      ) : result ? (
        <div className="space-y-6">
          {/* Phase 2: Prominent Observation & Supporting Entries Dates Bar */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-950/40 via-zinc-900/70 to-zinc-900/60 border border-indigo-900/40 space-y-3 shadow-md">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-indigo-400 font-semibold mb-1">
                Observation
              </div>
              <p className="text-base md:text-lg font-serif italic text-zinc-100 leading-relaxed">
                &ldquo;{result.observation || result.answer}&rdquo;
              </p>
            </div>

            {((result.supportingDates && result.supportingDates.length > 0) || (result.citations && result.citations.length > 0)) && (
              <div className="pt-2.5 border-t border-zinc-800/80 flex items-center flex-wrap gap-2 text-xs">
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-medium">
                  Supporting Entries:
                </span>
                <div className="flex items-center flex-wrap gap-1.5 font-medium text-indigo-300">
                  {(result.supportingDates && result.supportingDates.length > 0
                    ? result.supportingDates
                    : result.citations.map((c) => c.date).filter(Boolean)
                  ).map((d, i, arr) => (
                    <span key={i} className="inline-flex items-center gap-1.5">
                      <span className="px-2.5 py-0.5 rounded-full bg-indigo-950/70 border border-indigo-800/60 text-indigo-200 text-xs">
                        {d}
                      </span>
                      {i < arr.length - 1 && <span className="text-zinc-600">·</span>}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Main Detailed Answer Box */}
          <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2 text-indigo-300">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <h2 className="text-xs font-mono uppercase tracking-wider">Nuanced Journal Evidence</h2>
              </div>
              <span className="text-[10px] text-zinc-500">
                Scanned {sessions.length} entries
              </span>
            </div>

            <div className="prose prose-invert max-w-none text-xs md:text-sm text-zinc-200 leading-relaxed">
              <ReactMarkdown>{result.answer}</ReactMarkdown>
            </div>

            {/* Recurring Themes */}
            {result.recurringThemes?.length > 0 && (
              <div className="pt-3 border-t border-zinc-800 flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-mono text-zinc-500 uppercase">Related Themes:</span>
                {result.recurringThemes.map((theme, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded bg-zinc-800/80 border border-zinc-700 text-zinc-300 text-xs"
                  >
                    {theme}
                  </span>
                ))}
              </div>
            )}

            {/* Chronological Observation */}
            {result.chronologicalTrend && (
              <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80 flex items-start gap-3">
                <TrendingUp className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] font-mono uppercase text-indigo-300 font-semibold mb-0.5">
                    Timeline Evolution
                  </p>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    {result.chronologicalTrend}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Citations / Supporting Excerpts */}
          {result.citations?.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                  Supporting Entries & Evidence ({result.citations.length})
                </h3>
                <span className="text-[10px] text-zinc-500">Click to open original reflection</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {result.citations.map((cite, idx) => (
                  <div
                    key={idx}
                    onClick={() => onOpenSessionById && cite.sessionId && onOpenSessionById(cite.sessionId)}
                    className="p-4 rounded-xl bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-left transition-all cursor-pointer space-y-2 group"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-zinc-200 line-clamp-1 group-hover:text-indigo-300 transition-colors">
                        {cite.sessionTitle || 'Reflection Entry'}
                      </span>
                      {cite.date && (
                        <span className="text-[10px] text-zinc-500 flex items-center gap-1 flex-shrink-0">
                          <Calendar className="w-3 h-3" />
                          {cite.date.slice(0, 10)}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-zinc-400 italic bg-zinc-950/50 p-2.5 rounded-lg border border-zinc-800/60 line-clamp-3">
                      &ldquo;{cite.quote}&rdquo;
                    </p>

                    <div className="flex items-center justify-end text-[10px] text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span>View in Journal &rarr;</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Empty State with Explainer */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
          <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800 space-y-2">
            <BookOpen className="w-5 h-5 text-indigo-400" />
            <h3 className="text-xs font-semibold text-zinc-200">Grounded Memory</h3>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Never makes up facts. Answers cite the exact phrases and reflections you entered over weeks and months.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800 space-y-2">
            <TrendingUp className="w-5 h-5 text-teal-400" />
            <h3 className="text-xs font-semibold text-zinc-200">Pattern Evolution</h3>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Observe how your perspectives, fears, and priorities have subtly changed from your first entry to today.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800 space-y-2">
            <Quote className="w-5 h-5 text-amber-400" />
            <h3 className="text-xs font-semibold text-zinc-200">Clickable Citations</h3>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Every synthesized claim connects back to the original entry so you can verify and re-read the context.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
