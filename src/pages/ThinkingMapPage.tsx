import { useState, useEffect } from 'react';
import {
  Network,
  RefreshCw,
  Sparkles,
  HelpCircle,
  TrendingUp,
  AlertTriangle,
  Compass,
  ArrowRight,
  Info,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import {
  getJournalSessions,
  getSavedThinkingMap,
  saveThinkingMap,
} from '../services/firestoreService';
import { getThinkingMap } from '../services/geminiClient';
import type { ThinkingMapData, ThinkingMapNode } from '../types';

interface ThinkingMapPageProps {
  onStartReflection: (prompt?: string) => void;
}

export default function ThinkingMapPage({ onStartReflection }: ThinkingMapPageProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [mapData, setMapData] = useState<ThinkingMapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [selectedNode, setSelectedNode] = useState<ThinkingMapNode | null>(null);

  useEffect(() => {
    if (!user) return;
    loadMapData();
  }, [user]);

  const loadMapData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      // Check cache in Firestore first
      const cached = await getSavedThinkingMap(user.uid);
      if (cached && cached.nodes && cached.nodes.length > 0) {
        setMapData(cached);
        setSelectedNode(cached.nodes[0]);
      } else {
        // Generate if not cached
        await handleGenerateMap();
      }
    } catch (err: any) {
      console.error(err);
      toast('Failed to load Thinking Map', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateMap = async () => {
    if (!user) return;
    try {
      setRegenerating(true);
      const sessions = await getJournalSessions(user.uid);
      const res = await getThinkingMap(sessions);
      setMapData(res);
      if (res.nodes.length > 0) {
        setSelectedNode(res.nodes[0]);
      }
      // Save to cache
      await saveThinkingMap(user.uid, res);
      toast('Thinking Map updated based on your latest reflections', 'success');
    } catch (err: any) {
      console.error(err);
      toast(err.message || 'Failed to synthesize Thinking Map', 'error');
    } finally {
      setRegenerating(false);
    }
  };

  const getSentimentBadge = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-950/70 text-emerald-300 border border-emerald-800/60">
            Positive Momentum
          </span>
        );
      case 'tension':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-rose-950/70 text-rose-300 border border-rose-800/60">
            Friction & Doubt
          </span>
        );
      case 'exploring':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-indigo-950/70 text-indigo-300 border border-indigo-800/60">
            Active Exploration
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-800 text-zinc-300 border border-zinc-700">
            Equilibrium
          </span>
        );
    }
  };

  return (
    <div id="thinking-map-page" className="p-6 md:p-10 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-800/80">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Network className="w-4 h-4" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-100">Thinking Map</h1>
            <span className="text-xs px-2 py-0.5 rounded bg-indigo-950/80 text-indigo-300 border border-indigo-800 font-mono">
              SIGNATURE
            </span>
          </div>
          <p className="text-sm text-zinc-400 mt-1">
            Visual relationship graph revealing what has quietly occupied your attention across multiple reflections.
          </p>
        </div>

        <button
          id="regenerate-thinking-map-btn"
          onClick={handleGenerateMap}
          disabled={regenerating}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 text-xs font-medium transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${regenerating ? 'animate-spin text-indigo-400' : ''}`} />
          <span>{regenerating ? 'Synthesizing...' : 'Regenerate Map'}</span>
        </button>
      </div>

      {/* Synthesis Banner */}
      {mapData?.overview && (
        <div className="p-5 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 flex items-start gap-3.5">
          <Sparkles className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-xs font-mono uppercase text-indigo-400 font-semibold tracking-wider">
              Longitudinal AI Synthesis
            </h3>
            <p className="text-sm text-zinc-200 mt-1 leading-relaxed">{mapData.overview}</p>
          </div>
        </div>
      )}

      {/* Interactive Map Layout */}
      {loading && !mapData ? (
        <div className="p-16 text-center text-zinc-500 text-sm">Synthesizing thematic clusters...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Thematic Clusters Cards List */}
          <div className="lg:col-span-7 space-y-4">
            <h2 className="text-sm font-semibold text-zinc-300 font-mono uppercase tracking-wider">
              Thematic Nodes ({mapData?.nodes?.length || 0})
            </h2>

            <div className="space-y-3">
              {mapData?.nodes?.map((node) => {
                const isSelected = selectedNode?.id === node.id;
                return (
                  <div
                    key={node.id}
                    onClick={() => setSelectedNode(node)}
                    className={`p-5 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-zinc-900/90 border-indigo-500/60 shadow-lg'
                        : 'bg-zinc-900/40 border-zinc-800/70 hover:border-zinc-700 hover:bg-zinc-900/60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-3 h-3 rounded-full ${
                            node.sentiment === 'positive'
                              ? 'bg-emerald-400'
                              : node.sentiment === 'tension'
                              ? 'bg-rose-400'
                              : 'bg-indigo-400'
                          }`}
                        />
                        <h3 className="text-base font-semibold text-zinc-100">{node.category}</h3>
                      </div>
                      {getSentimentBadge(node.sentiment)}
                    </div>

                    <p className="text-xs text-zinc-400 mt-2 leading-relaxed">{node.description}</p>

                    {/* Subtopics Visual Tree */}
                    <div className="mt-4 pt-3 border-t border-zinc-800/80">
                      <p className="text-[11px] font-mono text-zinc-400 mb-2">Recurring sub-branches:</p>
                      <div className="flex flex-wrap gap-2">
                        {node.subtopics?.map((sub) => (
                          <span
                            key={sub}
                            className="text-xs px-2.5 py-1 rounded-lg bg-zinc-800/80 border border-zinc-700/60 text-zinc-300 flex items-center gap-1.5"
                          >
                            <ChevronRight className="w-3 h-3 text-zinc-500" />
                            {sub}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Inferred Relationships & Connections */}
            {mapData?.connections && mapData.connections.length > 0 && (
              <div className="mt-8 p-5 rounded-2xl bg-zinc-900/30 border border-zinc-800/70">
                <h3 className="text-xs font-mono uppercase text-zinc-400 font-semibold mb-3">
                  Thematic Interconnections
                </h3>
                <div className="space-y-2">
                  {mapData.connections.map((conn, idx) => (
                    <div
                      key={idx}
                      className="text-xs text-zinc-300 flex items-center gap-2 p-2 rounded-lg bg-zinc-900/60 border border-zinc-800"
                    >
                      <span className="font-semibold text-indigo-300 capitalize">{conn.from}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-zinc-500" />
                      <span className="font-semibold text-teal-300 capitalize">{conn.to}</span>
                      <span className="text-zinc-500 ml-auto font-mono text-[11px]">
                        &mdash; {conn.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: Selected Node Deep Dive & Catalytic Questions */}
          <div className="lg:col-span-5">
            <div className="sticky top-6 space-y-5">
              {selectedNode ? (
                <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800/90 space-y-5">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-indigo-400 font-semibold tracking-wider">
                      Selected Theme
                    </span>
                    <h3 className="text-xl font-bold text-zinc-100 mt-1">{selectedNode.category}</h3>
                    <p className="text-xs text-zinc-400 mt-1">{selectedNode.description}</p>
                  </div>

                  {/* Unresolved Questions */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-semibold text-amber-300">
                      <HelpCircle className="w-4 h-4 text-amber-400" />
                      <span>Lingering Unresolved Questions</span>
                    </div>

                    <div className="space-y-2">
                      {selectedNode.unresolvedQuestions?.map((q, i) => (
                        <div
                          key={i}
                          className="p-3.5 rounded-xl bg-zinc-800/50 border border-zinc-700/60 text-xs text-zinc-200 leading-relaxed font-serif"
                        >
                          "{q}"
                          <div className="mt-2.5 pt-2 border-t border-zinc-700/40 flex justify-end">
                            <button
                              onClick={() => onStartReflection(q)}
                              className="text-[11px] text-indigo-400 hover:text-indigo-300 font-sans font-medium flex items-center gap-1"
                            >
                              Reflect on this question &rarr;
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-zinc-800 text-[11px] text-zinc-500 leading-normal flex items-start gap-2">
                    <Info className="w-4 h-4 text-zinc-600 shrink-0 mt-0.5" />
                    <span>
                      Observed themes are synthesized across your personal journal history to illuminate patterns, without
                      pretending psychological certainty.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-8 rounded-2xl bg-zinc-900/30 border border-zinc-800/60 text-center text-zinc-500 text-xs">
                  Select any node on the left to inspect its subtopics and open questions.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
