import { useState, useEffect } from 'react';
import {
  Target,
  Plus,
  Sparkles,
  Calendar,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  TrendingUp,
  X,
  Edit2,
  Trash2,
  Check,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import {
  getGoals,
  saveGoal,
  deleteGoal,
  getJournalSessions,
} from '../services/firestoreService';
import { getGoalReflection } from '../services/geminiClient';
import type { Goal, JournalSession } from '../types';

interface GoalsPageProps {
  onStartReflection: (prompt?: string, goalId?: string) => void;
}

export default function GoalsPage({ onStartReflection }: GoalsPageProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [goals, setGoals] = useState<Goal[]>([]);
  const [sessions, setSessions] = useState<JournalSession[]>([]);
  const [loading, setLoading] = useState(true);

  // Goal Form Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formTargetDate, setFormTargetDate] = useState('');
  const [formProgress, setFormProgress] = useState(0);
  const [formStatus, setFormStatus] = useState<'active' | 'completed' | 'paused'>('active');

  // AI Reflection Modal / State
  const [reflectingGoalId, setReflectingGoalId] = useState<string | null>(null);
  const [selectedGoalFeedback, setSelectedGoalFeedback] = useState<Goal | null>(null);

  useEffect(() => {
    if (!user) return;
    loadGoalsData();
  }, [user]);

  const loadGoalsData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const [userGoals, userSessions] = await Promise.all([
        getGoals(user.uid),
        getJournalSessions(user.uid),
      ]);
      setGoals(userGoals);
      setSessions(userSessions);
    } catch (err) {
      console.error(err);
      toast('Failed to load goals', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingGoal(null);
    setFormTitle('');
    setFormDescription('');
    setFormTargetDate(new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]);
    setFormProgress(0);
    setFormStatus('active');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (goal: Goal) => {
    setEditingGoal(goal);
    setFormTitle(goal.title);
    setFormDescription(goal.description);
    setFormTargetDate(goal.targetDate);
    setFormProgress(goal.progress);
    setFormStatus(goal.status);
    setIsModalOpen(true);
  };

  const handleSaveGoalForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !formTitle.trim()) {
      toast('Please provide a goal title', 'error');
      return;
    }

    try {
      const now = new Date().toISOString();
      const goalToSave: Goal = {
        id: editingGoal ? editingGoal.id : `goal-${Date.now()}`,
        title: formTitle.trim(),
        description: formDescription.trim(),
        targetDate: formTargetDate,
        progress: Number(formProgress),
        status: formStatus,
        createdAt: editingGoal ? editingGoal.createdAt : now,
        updatedAt: now,
        aiFeedback: editingGoal?.aiFeedback,
      };

      await saveGoal(user.uid, goalToSave);
      toast(editingGoal ? 'Goal updated' : 'New goal established', 'success');
      setIsModalOpen(false);
      loadGoalsData();
    } catch (err: any) {
      toast('Failed to save goal', 'error');
    }
  };

  const handleDelete = async (goalId: string) => {
    if (!user) return;
    if (!window.confirm('Delete this goal?')) return;
    try {
      await deleteGoal(user.uid, goalId);
      toast('Goal removed', 'info');
      setGoals(goals.filter((g) => g.id !== goalId));
    } catch (err) {
      toast('Failed to delete goal', 'error');
    }
  };

  const handleReflectOnProgress = async (goal: Goal) => {
    if (!user) return;
    try {
      setReflectingGoalId(goal.id);
      // Find all journal sessions linked to this goal
      const linked = sessions.filter((s) => s.linkedGoalId === goal.id);

      const feedback = await getGoalReflection(goal, linked);
      const updatedGoal: Goal = {
        ...goal,
        aiFeedback: {
          ...feedback,
          analyzedAt: new Date().toISOString(),
        },
      };

      await saveGoal(user.uid, updatedGoal);
      setGoals(goals.map((g) => (g.id === goal.id ? updatedGoal : g)));
      setSelectedGoalFeedback(updatedGoal);
      toast('AI progress reflection generated', 'success');
    } catch (err: any) {
      console.error(err);
      toast(err.message || 'Could not analyze goal progress', 'error');
    } finally {
      setReflectingGoalId(null);
    }
  };

  return (
    <div id="goals-page" className="p-6 md:p-10 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-800/80">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center">
              <Target className="w-4 h-4" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-100">Personal Goals</h1>
          </div>
          <p className="text-sm text-zinc-400 mt-1">
            Connect thoughts to forward momentum. Link journal sessions and reflect on honest progress.
          </p>
        </div>

        <button
          id="create-goal-btn"
          onClick={handleOpenCreate}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 font-semibold text-xs transition-all shadow-sm active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Goal</span>
        </button>
      </div>

      {/* Goals List */}
      {loading ? (
        <div className="p-12 text-center text-zinc-500 text-sm">Loading your goals...</div>
      ) : goals.length === 0 ? (
        <div className="p-12 rounded-2xl bg-zinc-900/30 border border-zinc-800/60 text-center space-y-3">
          <Target className="w-8 h-8 text-zinc-600 mx-auto" />
          <h3 className="text-sm font-semibold text-zinc-200">No active goals yet</h3>
          <p className="text-xs text-zinc-400 max-w-md mx-auto">
            Set an intentional target. You can link your reflections directly to it to track mental shifts and blockers.
          </p>
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium"
          >
            Create First Goal
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {goals.map((goal) => {
            const linkedCount = sessions.filter((s) => s.linkedGoalId === goal.id).length;
            const isAnalyzing = reflectingGoalId === goal.id;

            return (
              <div
                key={goal.id}
                className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 hover:border-zinc-700 transition-all flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase font-semibold ${
                          goal.status === 'completed'
                            ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                            : goal.status === 'paused'
                            ? 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                            : 'bg-indigo-950/80 text-indigo-300 border border-indigo-800'
                        }`}
                      >
                        {goal.status}
                      </span>
                      {goal.targetDate && (
                        <span className="text-[11px] text-zinc-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {goal.targetDate}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 text-zinc-500">
                      <button
                        onClick={() => handleOpenEdit(goal)}
                        className="p-1 hover:text-zinc-200 transition-colors"
                        title="Edit goal"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(goal.id)}
                        className="p-1 hover:text-rose-400 transition-colors"
                        title="Delete goal"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-base font-semibold text-zinc-100 mt-2.5">{goal.title}</h3>
                  {goal.description && (
                    <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{goal.description}</p>
                  )}

                  {/* Progress Bar */}
                  <div className="mt-4 space-y-1.5">
                    <div className="flex justify-between text-xs text-zinc-400 font-mono">
                      <span>Progress</span>
                      <span className="font-semibold text-zinc-200">{goal.progress}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-teal-500 to-indigo-500 rounded-full transition-all duration-500"
                        style={{ width: `${goal.progress}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Linked Reflections & AI Progress Button */}
                <div className="pt-4 border-t border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <span className="text-zinc-500 font-mono text-[11px]">
                    {linkedCount} linked {linkedCount === 1 ? 'reflection' : 'reflections'}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onStartReflection(`Reflecting on goal: ${goal.title}`, goal.id)}
                      className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] font-medium"
                    >
                      + Reflect
                    </button>

                    <button
                      onClick={() => handleReflectOnProgress(goal)}
                      disabled={isAnalyzing}
                      className="px-2.5 py-1 rounded-lg bg-indigo-950/70 hover:bg-indigo-900/80 border border-indigo-800/80 text-indigo-300 text-[11px] font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
                    >
                      <Sparkles className={`w-3 h-3 ${isAnalyzing ? 'animate-spin' : ''}`} />
                      <span>{isAnalyzing ? 'Reflecting...' : 'AI Progress'}</span>
                    </button>
                  </div>
                </div>

                {/* AI Feedback Preview if available */}
                {goal.aiFeedback && (
                  <div className="mt-2 p-3 rounded-xl bg-zinc-950/60 border border-indigo-950 text-xs space-y-2">
                    <div className="flex items-center justify-between text-[10px] text-indigo-400 font-mono">
                      <span>Observed AI Momentum:</span>
                      <button
                        onClick={() => setSelectedGoalFeedback(goal)}
                        className="underline hover:text-indigo-300"
                      >
                        View Full Details
                      </button>
                    </div>
                    <p className="text-zinc-300 line-clamp-2 leading-relaxed">
                      {goal.aiFeedback.progressObserved}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Goal Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 className="text-base font-semibold text-zinc-100">
                {editingGoal ? 'Edit Goal' : 'Create New Goal'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-500 hover:text-zinc-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveGoalForm} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-400 mb-1 font-medium">Goal Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Master system architecture design"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-200 placeholder:text-zinc-700 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 font-medium">Description</label>
                <textarea
                  placeholder="Why does this goal matter right now?"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-200 placeholder:text-zinc-700 focus:outline-none focus:border-indigo-500 h-20 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1 font-medium">Target Date</label>
                  <input
                    type="date"
                    value={formTargetDate}
                    onChange={(e) => setFormTargetDate(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1 font-medium">Status</label>
                  <select
                    value={formStatus}
                    onChange={(e: any) => setFormStatus(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="paused">Paused</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-zinc-400 font-medium">Progress</label>
                  <span className="font-mono text-zinc-200">{formProgress}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={formProgress}
                  onChange={(e) => setFormProgress(Number(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 font-semibold transition-colors"
                >
                  Save Goal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Goal Feedback Deep-Dive Modal */}
      {selectedGoalFeedback && selectedGoalFeedback.aiFeedback && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-lg w-full p-6 space-y-5 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div>
                <span className="text-[10px] font-mono text-indigo-400 uppercase">
                  Progress Reflection
                </span>
                <h3 className="text-base font-semibold text-zinc-100">
                  {selectedGoalFeedback.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedGoalFeedback(null)}
                className="text-zinc-500 hover:text-zinc-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs leading-relaxed text-zinc-300">
              <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1">
                <p className="font-semibold text-emerald-300">Progress & Momentum Observed:</p>
                <p className="text-zinc-400">{selectedGoalFeedback.aiFeedback.progressObserved}</p>
              </div>

              {selectedGoalFeedback.aiFeedback.blockers?.length > 0 && (
                <div className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-900/40 space-y-1.5">
                  <p className="font-semibold text-rose-300">Detected Blockers:</p>
                  <ul className="list-disc pl-4 space-y-1 text-zinc-400">
                    {selectedGoalFeedback.aiFeedback.blockers.map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedGoalFeedback.aiFeedback.suggestedNextSteps?.length > 0 && (
                <div className="p-3.5 rounded-xl bg-indigo-950/30 border border-indigo-900/40 space-y-1.5">
                  <p className="font-semibold text-indigo-300">Suggested Next Steps:</p>
                  <ul className="list-disc pl-4 space-y-1 text-zinc-400">
                    {selectedGoalFeedback.aiFeedback.suggestedNextSteps.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedGoalFeedback.aiFeedback.encouragement && (
                <p className="text-zinc-400 italic font-serif text-center pt-2">
                  "{selectedGoalFeedback.aiFeedback.encouragement}"
                </p>
              )}
            </div>

            <div className="pt-3 border-t border-zinc-800 flex justify-end">
              <button
                onClick={() => setSelectedGoalFeedback(null)}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
