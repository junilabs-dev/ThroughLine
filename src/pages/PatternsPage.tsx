import { useState, useEffect } from 'react';
import {
  Activity,
  Sparkles,
  RefreshCw,
  GitCompare,
  ShieldAlert,
  HelpCircle,
  Lightbulb,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import {
  getJournalSessions,
  getSavedPatterns,
  savePatterns,
} from '../services/firestoreService';
import {
  getPatternsAndContradictions,
  analyzeEvidenceVsAssumption,
} from '../services/geminiClient';
import type { PatternsData, EvidenceVsAssumptionItem, JournalSession } from '../types';

interface PatternsPageProps {
  onStartReflection?: (prompt?: string) => void;
  onOpenSessionById?: (id: string) => void;
}

export default function PatternsPage({ onStartReflection, onOpenSessionById }: PatternsPageProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [activeSubTab, setActiveSubTab] = useState<'patterns' | 'contradictions' | 'evidence'>('patterns');
  const [sessions, setSessions] = useState<JournalSession[]>([]);
  const [patternsData, setPatternsData] = useState<PatternsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  // Evidence vs Assumption Tool State
  const [beliefInput, setBeliefInput] = useState('');
  const [analyzingBelief, setAnalyzingBelief] = useState(false);
  const [analyzedBeliefs, setAnalyzedBeliefs] = useState<EvidenceVsAssumptionItem[]>([]);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const [allSessions, cached] = await Promise.all([
        getJournalSessions(user.uid),
        getSavedPatterns(user.uid),
      ]);
      setSessions(allSessions);
      if (cached) {
        setPatternsData(cached);
      }
    } catch (err) {
      console.error(err);
      toast('Failed to load patterns data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRunAnalysis = async () => {
    if (!user) return;
    if (sessions.length < 2) {
      toast('Write at least 2 reflections before running pattern analysis', 'info');
      return;
    }

    try {
      setAnalyzing(true);
      const result = await getPatternsAndContradictions(sessions);
      setPatternsData(result);
      await savePatterns(user.uid, result);
      toast('Patterns & contradictions updated', 'success');
    } catch (err: any) {
      toast('Pattern analysis failed: ' + (err.message || 'Error'), 'error');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleAnalyzeBelief = async () => {
    if (!beliefInput.trim()) {
      toast('Enter a belief or assumption to deconstruct', 'info');
      return;
    }

    try {
      setAnalyzingBelief(true);
      const item = await analyzeEvidenceVsAssumption(beliefInput.trim());
      setAnalyzedBeliefs([item, ...analyzedBeliefs]);
      setBeliefInput('');
      toast('Deconstruction complete', 'success');
    } catch (err: any) {
      toast('Deconstruction failed', 'error');
    } finally {
      setAnalyzingBelief(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-5 h-5 text-indigo-400" />
            <h1 className="text-xl font-semibold tracking-tight text-zinc-100">Patterns & Clarity</h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-950/80 border border-indigo-800/60 text-indigo-300">
              META-COGNITION
            </span>
          </div>
          <p className="text-xs text-zinc-400">
            Uncover recurring behavioral loops, cross-examine contradicting views, and test beliefs against facts.
          </p>
        </div>

        <button
          onClick={handleRunAnalysis}
          disabled={analyzing || sessions.length < 2}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold shadow-sm transition-all active:scale-[0.98] disabled:opacity-50"
        >
          {analyzing ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Analyzing {sessions.length} entries...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>Refresh Patterns</span>
            </>
          )}
        </button>
      </div>

      {/* Sub-tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
        <button
          onClick={() => setActiveSubTab('patterns')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${
            activeSubTab === 'patterns'
              ? 'bg-zinc-800 text-zinc-100 border border-zinc-700'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <TrendingUp className="w-4 h-4 text-indigo-400" />
          <span>Recurring Cycles</span>
        </button>

        <button
          onClick={() => setActiveSubTab('contradictions')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${
            activeSubTab === 'contradictions'
              ? 'bg-zinc-800 text-zinc-100 border border-zinc-700'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <GitCompare className="w-4 h-4 text-amber-400" />
          <span>Contradiction Detector</span>
        </button>

        <button
          onClick={() => setActiveSubTab('evidence')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${
            activeSubTab === 'evidence'
              ? 'bg-zinc-800 text-zinc-100 border border-zinc-700'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <ShieldAlert className="w-4 h-4 text-teal-400" />
          <span>Evidence vs Assumption</span>
        </button>
      </div>

      {/* Sub-Tab 1: Recurring Cycles */}
      {activeSubTab === 'patterns' && (
        <div className="space-y-4">
          {patternsData?.patterns && patternsData.patterns.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {patternsData.patterns.map((pat, idx) => (
                <div
                  key={idx}
                  className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                      {pat.frequency} • {pat.category}
                    </span>
                  </div>

                  <h3 className="text-sm font-semibold text-zinc-100">{pat.patternName}</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">{pat.triggerContext}</p>
                  {pat.evolution && (
                    <p className="text-xs text-zinc-500 italic">Evolution: {pat.evolution}</p>
                  )}

                  {pat.constructiveTakeaway && (
                    <div className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800/80 space-y-1">
                      <p className="text-[10px] font-mono uppercase text-teal-400">
                        Constructive Takeaway
                      </p>
                      <p className="text-xs text-zinc-300">{pat.constructiveTakeaway}</p>
                    </div>
                  )}

                  {onStartReflection && (
                    <button
                      onClick={() =>
                        onStartReflection(`Reflecting on recurring pattern: "${pat.patternName}"`)
                      }
                      className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 pt-1"
                    >
                      <span>Explore in Journal</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 rounded-2xl bg-zinc-900/30 border border-zinc-800 text-center space-y-3">
              <Activity className="w-10 h-10 mx-auto text-zinc-600" />
              <h3 className="text-sm font-semibold text-zinc-200">No Recurring Cycles Analyzed Yet</h3>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                Write a few entries and click &ldquo;Refresh Patterns&rdquo; to discover behavioral and cognitive trends.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Sub-Tab 2: Contradiction Detector */}
      {activeSubTab === 'contradictions' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-800/40 text-xs text-amber-200 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <p>
              Contradictions are not character flaws—they are proof of evolution, conflicting needs, or unexamined premises.
            </p>
          </div>

          {patternsData?.contradictions && patternsData.contradictions.length > 0 ? (
            <div className="space-y-4">
              {patternsData.contradictions.map((c, idx) => (
                <div
                  key={idx}
                  className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4"
                >
                  <h3 className="text-sm font-semibold text-zinc-100">{c.title}</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div
                      onClick={() => c.statementA?.sessionId && onOpenSessionById && onOpenSessionById(c.statementA.sessionId)}
                      className={`p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-1.5 transition-all ${
                        c.statementA?.sessionId && onOpenSessionById ? 'cursor-pointer hover:border-zinc-700 hover:bg-zinc-900 group' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono uppercase text-zinc-400 group-hover:text-zinc-200 transition-colors">
                          Position A {c.statementA?.sessionTitle ? `• ${c.statementA.sessionTitle}` : ''}
                        </span>
                        {c.statementA?.date && (
                          <span className="text-[10px] text-zinc-500">{c.statementA.date}</span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-200 italic">&ldquo;{c.statementA?.quote}&rdquo;</p>
                      {c.statementA?.sessionId && onOpenSessionById && (
                        <div className="text-[10px] text-zinc-500 group-hover:text-indigo-400 flex items-center justify-end gap-1 pt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <span>View entry &rarr;</span>
                        </div>
                      )}
                    </div>

                    <div
                      onClick={() => c.statementB?.sessionId && onOpenSessionById && onOpenSessionById(c.statementB.sessionId)}
                      className={`p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-1.5 transition-all ${
                        c.statementB?.sessionId && onOpenSessionById ? 'cursor-pointer hover:border-zinc-700 hover:bg-zinc-900 group' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono uppercase text-indigo-400 group-hover:text-indigo-300 transition-colors">
                          Position B {c.statementB?.sessionTitle ? `• ${c.statementB.sessionTitle}` : ''}
                        </span>
                        {c.statementB?.date && (
                          <span className="text-[10px] text-zinc-500">{c.statementB.date}</span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-200 italic">&ldquo;{c.statementB?.quote}&rdquo;</p>
                      {c.statementB?.sessionId && onOpenSessionById && (
                        <div className="text-[10px] text-zinc-500 group-hover:text-indigo-400 flex items-center justify-end gap-1 pt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <span>View entry &rarr;</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-indigo-950/20 border border-indigo-800/40 space-y-2.5">
                    <div>
                      <p className="text-[10px] font-mono uppercase text-indigo-300 font-semibold mb-1">
                        Underlying Tension
                      </p>
                      <p className="text-xs text-zinc-300 leading-relaxed">{c.tensionExplanation}</p>
                    </div>

                    {c.socraticQuestion && (
                      <div className="pt-2 border-t border-indigo-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <p className="text-xs text-amber-300 font-medium italic">
                          &ldquo;{c.socraticQuestion}&rdquo;
                        </p>
                        {onStartReflection && (
                          <button
                            onClick={() =>
                              onStartReflection(
                                `Reflecting on the tension:\n"${c.title}"\n\nQuestion to explore: ${c.socraticQuestion}`
                              )
                            }
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium self-start sm:self-auto flex-shrink-0 shadow-sm transition-colors"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Reflect on this Tension</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 rounded-2xl bg-zinc-900/30 border border-zinc-800 text-center space-y-3">
              <GitCompare className="w-10 h-10 mx-auto text-zinc-600" />
              <h3 className="text-sm font-semibold text-zinc-200">No Contradictions Flagged</h3>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                Click &ldquo;Refresh Patterns&rdquo; above to audit differences across your journal entries over time.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Sub-Tab 3: Evidence vs Assumption Deconstructor */}
      {activeSubTab === 'evidence' && (
        <div className="space-y-5">
          <div className="p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-3">
            <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-300">
              Belief Deconstruction Tool
            </h3>
            <p className="text-xs text-zinc-400">
              Enter any stressful belief, assumption, or narrative you are telling yourself (e.g. &ldquo;If I decline this project, I will ruin my reputation&rdquo;).
            </p>

            <div className="flex gap-2">
              <input
                type="text"
                value={beliefInput}
                onChange={(e) => setBeliefInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAnalyzeBelief()}
                placeholder="Type your belief or worry here..."
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500"
              />
              <button
                onClick={handleAnalyzeBelief}
                disabled={analyzingBelief || !beliefInput.trim()}
                className="px-4 py-2.5 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
              >
                {analyzingBelief ? 'Deconstructing...' : 'Analyze'}
              </button>
            </div>
          </div>

          {/* Analyzed Beliefs Results */}
          <div className="space-y-4">
            {analyzedBeliefs.map((item) => (
              <div
                key={item.id}
                className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4"
              >
                <div className="border-b border-zinc-800 pb-2">
                  <span className="text-[10px] font-mono text-zinc-500 uppercase">Statement Tested</span>
                  <p className="text-sm font-semibold text-zinc-100 mt-0.5">&ldquo;{item.statement}&rdquo;</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Verified Facts */}
                  <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-900/30 space-y-1.5">
                    <p className="text-[10px] font-mono uppercase text-emerald-400 font-semibold">
                      Verified Facts
                    </p>
                    <ul className="text-xs text-zinc-300 space-y-1 list-disc list-inside">
                      {item.verifiedFacts.map((f, i) => (
                        <li key={i}>{f}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Untested Assumptions */}
                  <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-900/30 space-y-1.5">
                    <p className="text-[10px] font-mono uppercase text-amber-400 font-semibold">
                      Untested Assumptions
                    </p>
                    <ul className="text-xs text-zinc-300 space-y-1 list-disc list-inside">
                      {item.untestedAssumptions.map((a, i) => (
                        <li key={i}>{a}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Experiments to Test */}
                {item.experimentsToTest?.length > 0 && (
                  <div className="p-3.5 rounded-xl bg-indigo-950/20 border border-indigo-800/40 space-y-1.5">
                    <p className="text-[10px] font-mono uppercase text-indigo-300 font-semibold">
                      Low-Stakes Real-World Tests
                    </p>
                    <ul className="text-xs text-zinc-300 space-y-1 list-disc list-inside">
                      {item.experimentsToTest.map((exp, i) => (
                        <li key={i}>{exp}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
