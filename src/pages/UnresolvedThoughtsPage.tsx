import { useState, useEffect } from 'react';
import {
  HelpCircle,
  Plus,
  Sparkles,
  CheckCircle2,
  Clock,
  ArrowRight,
  MessageSquare,
  Trash2,
  Flame,
  Check,
  Filter,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import {
  getUnresolvedThoughts,
  saveUnresolvedThought,
  deleteUnresolvedThought,
  getJournalSessions,
} from '../services/firestoreService';
import { extractUnresolved, scanUnresolvedFromSessions } from '../services/geminiClient';
import type { UnresolvedThought, JournalSession } from '../types';

interface UnresolvedThoughtsPageProps {
  onStartReflection?: (prompt?: string) => void;
  onOpenSessionById?: (id: string) => void;
}

export default function UnresolvedThoughtsPage({
  onStartReflection,
  onOpenSessionById,
}: UnresolvedThoughtsPageProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [thoughts, setThoughts] = useState<UnresolvedThought[]>([]);
  const [sessions, setSessions] = useState<JournalSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanningAi, setScanningAi] = useState(false);
  const [filter, setFilter] = useState<'all' | 'open' | 'in_progress' | 'resolved'>('open');

  // Candidate suggestions discovered from journal history
  const [discoveredCandidates, setDiscoveredCandidates] = useState<Array<{
    title: string;
    context: string;
    firstMentioned?: string;
    lastMentioned?: string;
    occurrenceCount?: number;
    relatedTopics?: string[];
    aiObservation?: string;
    relatedSessions?: Array<{ id: string; title: string; date: string }>;
    urgency: 'low' | 'medium' | 'high';
  }>>([]);

  // Manual Add State
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContext, setNewContext] = useState('');
  const [newUrgency, setNewUrgency] = useState<'low' | 'medium' | 'high'>('medium');

  // Follow-up Note state for active thought
  const [activeNoteInput, setActiveNoteInput] = useState<{ [thoughtId: string]: string }>({});

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const [userThoughts, userSessions] = await Promise.all([
        getUnresolvedThoughts(user.uid),
        getJournalSessions(user.uid),
      ]);
      setThoughts(userThoughts);
      setSessions(userSessions);
    } catch (err) {
      console.error(err);
      toast('Failed to load unresolved thoughts', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleScanEntriesWithAi = async () => {
    if (!user) return;
    if (sessions.length === 0) {
      toast('No reflections found to scan yet', 'info');
      return;
    }

    try {
      setScanningAi(true);
      const extracted = await scanUnresolvedFromSessions(sessions);

      if (extracted.length === 0) {
        toast('No unresolved recurring loops detected across your entries', 'info');
        return;
      }

      // Filter out any that already exist in thoughts
      const unadded = extracted.filter(
        (item) => !thoughts.some((t) => t.title.toLowerCase().includes(item.title.toLowerCase()))
      );

      if (unadded.length === 0) {
        toast('All identified recurring loops are already in your list', 'info');
      } else {
        setDiscoveredCandidates(unadded);
        toast(`Identified ${unadded.length} recurring open loops for review`, 'success');
      }
    } catch (err: any) {
      console.error(err);
      toast('AI scan failed', 'error');
    } finally {
      setScanningAi(false);
    }
  };

  const handleSaveCandidate = async (candidate: typeof discoveredCandidates[0]) => {
    if (!user) return;
    try {
      const newThought: UnresolvedThought = {
        id: `unresolved-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        title: candidate.title,
        context: candidate.context,
        status: 'open',
        urgency: candidate.urgency,
        firstMentioned: candidate.firstMentioned,
        lastMentioned: candidate.lastMentioned,
        occurrenceCount: candidate.occurrenceCount,
        relatedTopics: candidate.relatedTopics,
        aiObservation: candidate.aiObservation,
        relatedSessions: candidate.relatedSessions,
        followUpNotes: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await saveUnresolvedThought(user.uid, newThought);
      setThoughts((prev) => [newThought, ...prev]);
      setDiscoveredCandidates((prev) => prev.filter((c) => c.title !== candidate.title));
      toast('Saved to your Unresolved Thoughts', 'success');
    } catch (err) {
      toast('Failed to save unresolved thought', 'error');
    }
  };

  const handleDismissCandidate = (candidateTitle: string) => {
    setDiscoveredCandidates((prev) => prev.filter((c) => c.title !== candidateTitle));
    toast('Dismissed candidate loop', 'info');
  };

  const handleSaveNew = async () => {
    if (!user) return;
    if (!newTitle.trim()) {
      toast('Title is required', 'error');
      return;
    }

    const thought: UnresolvedThought = {
      id: `unresolved-${Date.now()}`,
      title: newTitle.trim(),
      context: newContext.trim(),
      status: 'open',
      urgency: newUrgency,
      followUpNotes: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await saveUnresolvedThought(user.uid, thought);
      setThoughts([thought, ...thoughts]);
      setIsCreating(false);
      setNewTitle('');
      setNewContext('');
      toast('Recorded open loop', 'success');
    } catch (err) {
      toast('Failed to save', 'error');
    }
  };

  const handleStatusChange = async (thought: UnresolvedThought, newStatus: 'open' | 'in_progress' | 'resolved') => {
    if (!user) return;
    let resolution = thought.resolution;
    if (newStatus === 'resolved' && !resolution) {
      resolution = window.prompt('Optional resolution note (How was this settled?):') || 'Resolved through reflection.';
    }

    const updated: UnresolvedThought = {
      ...thought,
      status: newStatus,
      resolution: newStatus === 'resolved' ? resolution : undefined,
      updatedAt: new Date().toISOString(),
    };

    try {
      await saveUnresolvedThought(user.uid, updated);
      setThoughts(thoughts.map((t) => (t.id === thought.id ? updated : t)));
      toast(`Status changed to ${newStatus}`, 'info');
    } catch (err) {
      toast('Status update failed', 'error');
    }
  };

  const handleAddFollowUpNote = async (thoughtId: string) => {
    if (!user) return;
    const noteText = (activeNoteInput[thoughtId] || '').trim();
    if (!noteText) return;

    const target = thoughts.find((t) => t.id === thoughtId);
    if (!target) return;

    const newNote = {
      id: `note-${Date.now()}`,
      note: noteText,
      createdAt: new Date().toISOString(),
    };

    const updated: UnresolvedThought = {
      ...target,
      followUpNotes: [...target.followUpNotes, newNote],
      updatedAt: new Date().toISOString(),
    };

    try {
      await saveUnresolvedThought(user.uid, updated);
      setThoughts(thoughts.map((t) => (t.id === thoughtId ? updated : t)));
      setActiveNoteInput({ ...activeNoteInput, [thoughtId]: '' });
      toast('Follow-up logged', 'success');
    } catch (err) {
      toast('Failed to save note', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    if (!window.confirm('Delete this unresolved thought?')) return;
    try {
      await deleteUnresolvedThought(user.uid, id);
      setThoughts(thoughts.filter((t) => t.id !== id));
      toast('Deleted', 'info');
    } catch (err) {
      toast('Delete failed', 'error');
    }
  };

  const filteredThoughts = thoughts.filter((t) => {
    if (filter === 'open') return t.status === 'open';
    if (filter === 'in_progress') return t.status === 'in_progress';
    if (filter === 'resolved') return t.status === 'resolved';
    return true;
  });

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <HelpCircle className="w-5 h-5 text-indigo-400" />
            <h1 className="text-xl font-semibold tracking-tight text-zinc-100">Unresolved Thoughts</h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-950/80 border border-indigo-800/60 text-indigo-300">
              OPEN LOOPS
            </span>
          </div>
          <p className="text-xs text-zinc-400">
            Unanswered questions and emotional tensions that keep lingering in your mind.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleScanEntriesWithAi}
            disabled={scanningAi}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-800/80 text-indigo-300 text-xs font-medium transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{scanningAi ? 'Scanning...' : 'Scan Entries'}</span>
          </button>
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold shadow-sm transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Dilemma</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-zinc-900 border border-zinc-800/80 w-fit text-xs">
        <button
          onClick={() => setFilter('open')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
            filter === 'open' ? 'bg-zinc-800 text-zinc-100 shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Open ({thoughts.filter((t) => t.status === 'open').length})
        </button>
        <button
          onClick={() => setFilter('in_progress')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
            filter === 'in_progress' ? 'bg-zinc-800 text-zinc-100 shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          In Progress ({thoughts.filter((t) => t.status === 'in_progress').length})
        </button>
        <button
          onClick={() => setFilter('resolved')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
            filter === 'resolved' ? 'bg-zinc-800 text-zinc-100 shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Resolved ({thoughts.filter((t) => t.status === 'resolved').length})
        </button>
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
            filter === 'all' ? 'bg-zinc-800 text-zinc-100 shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          All ({thoughts.length})
        </button>
      </div>

      {/* Create Modal / Card */}
      {isCreating && (
        <div className="p-5 md:p-6 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <h2 className="text-sm font-semibold text-zinc-100">Capture Unresolved Thought</h2>
            <button onClick={() => setIsCreating(false)} className="text-xs text-zinc-400 hover:text-zinc-200">
              Cancel
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Open Question or Dilemma *
              </label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. How do I reconcile my ambition with needing more rest?"
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Underlying Context</label>
              <textarea
                rows={2}
                value={newContext}
                onChange={(e) => setNewContext(e.target.value)}
                placeholder="Where does this tension show up most often?"
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Urgency</label>
              <div className="flex gap-2">
                {(['low', 'medium', 'high'] as const).map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setNewUrgency(u)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium capitalize transition-all ${
                      newUrgency === u
                        ? 'bg-indigo-950 border border-indigo-700 text-indigo-300'
                        : 'bg-zinc-950 border border-zinc-800 text-zinc-400'
                    }`}
                  >
                    {u}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
            <button onClick={() => setIsCreating(false)} className="px-3.5 py-1.5 text-xs text-zinc-400 hover:text-white">
              Cancel
            </button>
            <button
              onClick={handleSaveNew}
              className="px-4 py-1.5 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold shadow-sm"
            >
              Save Open Loop
            </button>
          </div>
        </div>
      )}

      {/* Discovered Candidates for Review */}
      {discoveredCandidates.length > 0 && (
        <div className="p-5 md:p-6 rounded-2xl bg-indigo-950/20 border border-indigo-800/40 space-y-4">
          <div className="flex items-center justify-between border-b border-indigo-900/40 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <h2 className="text-xs font-mono uppercase tracking-wider text-indigo-300 font-semibold">
                Detected Across Entries ({discoveredCandidates.length} for review)
              </h2>
            </div>
            <button
              onClick={() => setDiscoveredCandidates([])}
              className="text-xs text-zinc-400 hover:text-zinc-200"
            >
              Dismiss All
            </button>
          </div>

          <div className="space-y-3">
            {discoveredCandidates.map((candidate, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl bg-zinc-900/80 border border-indigo-900/40 space-y-3 shadow-sm"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap text-[10px]">
                      <span className="font-mono uppercase px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                        {candidate.urgency} urgency
                      </span>
                      {candidate.occurrenceCount && (
                        <span className="font-mono text-zinc-400">
                          Appeared across {candidate.occurrenceCount} reflections
                        </span>
                      )}
                      {(candidate.firstMentioned || candidate.lastMentioned) && (
                        <span className="text-zinc-500">
                          {candidate.firstMentioned && `First: ${candidate.firstMentioned}`}
                          {candidate.firstMentioned && candidate.lastMentioned && ' · '}
                          {candidate.lastMentioned && `Last: ${candidate.lastMentioned}`}
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-semibold text-zinc-100">{candidate.title}</h3>
                    {candidate.context && (
                      <p className="text-xs text-zinc-300 leading-relaxed">{candidate.context}</p>
                    )}
                    {candidate.aiObservation && (
                      <p className="text-xs text-indigo-300/90 italic font-serif pt-1">
                        &ldquo;{candidate.aiObservation}&rdquo;
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0 pt-1">
                    <button
                      onClick={() => handleDismissCandidate(candidate.title)}
                      className="px-2.5 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-zinc-200 border border-zinc-800 hover:bg-zinc-800 transition-colors"
                    >
                      Dismiss
                    </button>
                    <button
                      onClick={() => handleSaveCandidate(candidate)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium shadow-sm transition-colors"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Save to List</span>
                    </button>
                  </div>
                </div>

                {/* Clickable Related Sessions */}
                {candidate.relatedSessions && candidate.relatedSessions.length > 0 && (
                  <div className="pt-2 border-t border-zinc-800/80 flex items-center gap-2 flex-wrap text-xs">
                    <span className="text-[10px] font-mono uppercase text-zinc-500">Related Entries:</span>
                    {candidate.relatedSessions.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => onOpenSessionById && onOpenSessionById(s.id)}
                        className="px-2 py-0.5 rounded bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-indigo-300 hover:text-indigo-200 text-[11px] transition-colors"
                        title="Click to view reflection"
                      >
                        {s.title || 'Reflection'} ({s.date?.slice(0, 10)})
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* List of Unresolved Thoughts */}
      {loading ? (
        <div className="p-8 text-center text-xs text-zinc-500 font-mono">Loading thoughts...</div>
      ) : filteredThoughts.length === 0 ? (
        <div className="p-12 rounded-2xl bg-zinc-900/30 border border-zinc-800 text-center space-y-3">
          <HelpCircle className="w-10 h-10 mx-auto text-zinc-600" />
          <h3 className="text-sm font-semibold text-zinc-200">No Open Loops in this Filter</h3>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            Click &ldquo;Scan Entries&rdquo; to have AI extract unanswered dilemmas from your reflections, or add one manually.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredThoughts.map((thought) => {
            const isResolved = thought.status === 'resolved';

            return (
              <div
                key={thought.id}
                className={`p-5 rounded-2xl border transition-all space-y-4 ${
                  isResolved
                    ? 'bg-zinc-950/40 border-zinc-800/60 opacity-80'
                    : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700/80'
                }`}
              >
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[9px] font-mono uppercase px-2 py-0.5 rounded ${
                          thought.urgency === 'high'
                            ? 'bg-rose-950 text-rose-300 border border-rose-800'
                            : thought.urgency === 'medium'
                            ? 'bg-amber-950 text-amber-300 border border-amber-800'
                            : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                        }`}
                      >
                        {thought.urgency} urgency
                      </span>

                      <span
                        className={`text-[9px] font-mono uppercase px-2 py-0.5 rounded ${
                          isResolved
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : thought.status === 'in_progress'
                            ? 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                            : 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                        }`}
                      >
                        {thought.status.replace('_', ' ')}
                      </span>

                      <span className="text-[10px] text-zinc-500">
                        {new Date(thought.createdAt).toLocaleDateString()}
                      </span>

                      {thought.occurrenceCount && thought.occurrenceCount > 1 && (
                        <span className="text-[10px] font-mono text-zinc-400">
                          ({thought.occurrenceCount} reflections)
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm font-semibold text-zinc-100">{thought.title}</h3>
                    {thought.context && (
                      <p className="text-xs text-zinc-400 leading-relaxed">{thought.context}</p>
                    )}

                    {thought.aiObservation && (
                      <p className="text-xs text-indigo-300/90 italic font-serif pt-0.5">
                        &ldquo;{thought.aiObservation}&rdquo;
                      </p>
                    )}

                    {(thought.firstMentioned || thought.lastMentioned) && (
                      <p className="text-[10px] text-zinc-500 font-mono">
                        {thought.firstMentioned && `First: ${thought.firstMentioned}`}
                        {thought.firstMentioned && thought.lastMentioned && ' · '}
                        {thought.lastMentioned && `Last: ${thought.lastMentioned}`}
                      </p>
                    )}

                    {thought.relatedSessions && thought.relatedSessions.length > 0 && (
                      <div className="pt-1.5 flex items-center gap-1.5 flex-wrap text-xs">
                        <span className="text-[9px] font-mono uppercase text-zinc-500">Appeared in:</span>
                        {thought.relatedSessions.map((s, i) => (
                          <button
                            key={i}
                            onClick={() => onOpenSessionById && onOpenSessionById(s.id)}
                            className="px-2 py-0.5 rounded bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-indigo-300 hover:text-indigo-200 text-[10px] transition-colors"
                            title="Open reflection"
                          >
                            {s.title || 'Reflection'} ({s.date?.slice(0, 10)})
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {onStartReflection && !isResolved && (
                      <button
                        onClick={() => onStartReflection(`Reflecting on unresolved question:\n"${thought.title}"`)}
                        title="Reflect in Journal"
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-800/80 text-indigo-300 text-xs transition-colors"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Reflect</span>
                      </button>
                    )}

                    {/* Status Dropdown Buttons */}
                    <div className="flex rounded-lg bg-zinc-950 border border-zinc-800 p-0.5 text-xs">
                      <button
                        onClick={() => handleStatusChange(thought, 'open')}
                        className={`px-2 py-0.5 rounded text-[10px] ${
                          thought.status === 'open' ? 'bg-zinc-800 text-white font-semibold' : 'text-zinc-500'
                        }`}
                      >
                        Open
                      </button>
                      <button
                        onClick={() => handleStatusChange(thought, 'in_progress')}
                        className={`px-2 py-0.5 rounded text-[10px] ${
                          thought.status === 'in_progress' ? 'bg-indigo-900 text-white font-semibold' : 'text-zinc-500'
                        }`}
                      >
                        Active
                      </button>
                      <button
                        onClick={() => handleStatusChange(thought, 'resolved')}
                        className={`px-2 py-0.5 rounded text-[10px] ${
                          thought.status === 'resolved' ? 'bg-emerald-900 text-white font-semibold' : 'text-zinc-500'
                        }`}
                      >
                        Resolved
                      </button>
                    </div>

                    <button
                      onClick={() => handleDelete(thought.id)}
                      className="p-1 rounded-lg text-zinc-500 hover:text-rose-400 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Resolution Rationale (if resolved) */}
                {thought.resolution && (
                  <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-800/40 text-xs text-emerald-200">
                    <span className="font-semibold">Resolution:</span> {thought.resolution}
                  </div>
                )}

                {/* Follow-up Notes History */}
                {thought.followUpNotes?.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <p className="text-[10px] font-mono uppercase text-zinc-500">Evolution Log</p>
                    <div className="space-y-1">
                      {thought.followUpNotes.map((note) => (
                        <div
                          key={note.id}
                          className="flex items-start justify-between text-xs text-zinc-300 bg-zinc-950/50 p-2 rounded-lg border border-zinc-800/60"
                        >
                          <span>{note.note}</span>
                          <span className="text-[10px] text-zinc-500 flex-shrink-0 ml-2">
                            {new Date(note.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Add Follow-up Note */}
                {!isResolved && (
                  <div className="flex gap-2 pt-1">
                    <input
                      type="text"
                      value={activeNoteInput[thought.id] || ''}
                      onChange={(e) =>
                        setActiveNoteInput({ ...activeNoteInput, [thought.id]: e.target.value })
                      }
                      onKeyDown={(e) => e.key === 'Enter' && handleAddFollowUpNote(thought.id)}
                      placeholder="Add an update or new realization on this loop..."
                      className="flex-1 px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      onClick={() => handleAddFollowUpNote(thought.id)}
                      className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200"
                    >
                      Log Note
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
