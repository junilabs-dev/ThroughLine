import { useState, useEffect } from 'react';
import {
  ListTodo,
  Plus,
  CheckCircle2,
  Circle,
  Calendar,
  Trash2,
  ArrowRight,
  Sparkles,
  Target,
  Edit2,
  Check,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import {
  getActionPlans,
  saveActionPlan,
  deleteActionPlan,
  saveGoal,
} from '../services/firestoreService';
import type { ActionPlan, ActionPlanStep, Goal } from '../types';

interface ActionPlansPageProps {
  onNavigateTab?: (tab: any) => void;
  onStartReflection?: (prompt?: string) => void;
}

export default function ActionPlansPage({ onNavigateTab, onStartReflection }: ActionPlansPageProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [plans, setPlans] = useState<ActionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'in_progress' | 'completed'>('in_progress');

  // Modal / Creator State
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [newSteps, setNewSteps] = useState<string[]>(['', '']);

  useEffect(() => {
    if (!user) return;
    loadPlans();
  }, [user]);

  const loadPlans = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const data = await getActionPlans(user.uid);
      setPlans(data);
    } catch (err) {
      console.error(err);
      toast('Failed to load action plans', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStep = async (plan: ActionPlan, stepId: string) => {
    if (!user) return;
    const updatedSteps = plan.steps.map((s) =>
      s.id === stepId ? { ...s, completed: !s.completed } : s
    );

    const allCompleted = updatedSteps.length > 0 && updatedSteps.every((s) => s.completed);
    const updatedPlan: ActionPlan = {
      ...plan,
      steps: updatedSteps,
      status: allCompleted ? 'completed' : 'in_progress',
      updatedAt: new Date().toISOString(),
    };

    try {
      await saveActionPlan(user.uid, updatedPlan);
      setPlans(plans.map((p) => (p.id === plan.id ? updatedPlan : p)));
    } catch (err) {
      toast('Failed to update step', 'error');
    }
  };

  const handleAddStepToPlan = async (plan: ActionPlan, stepText: string) => {
    if (!user || !stepText.trim()) return;
    const newStep: ActionPlanStep = {
      id: `step-${Date.now()}`,
      text: stepText.trim(),
      completed: false,
    };
    const updatedPlan: ActionPlan = {
      ...plan,
      steps: [...plan.steps, newStep],
      status: 'in_progress',
      updatedAt: new Date().toISOString(),
    };

    try {
      await saveActionPlan(user.uid, updatedPlan);
      setPlans(plans.map((p) => (p.id === plan.id ? updatedPlan : p)));
      toast('Step added', 'success');
    } catch (err) {
      toast('Failed to add step', 'error');
    }
  };

  const handleDeletePlan = async (id: string) => {
    if (!user) return;
    if (!window.confirm('Delete this action plan?')) return;
    try {
      await deleteActionPlan(user.uid, id);
      setPlans(plans.filter((p) => p.id !== id));
      toast('Action plan deleted', 'info');
    } catch (err) {
      toast('Delete failed', 'error');
    }
  };

  const handleSaveNewPlan = async () => {
    if (!user) return;
    if (!newTitle.trim()) {
      toast('Plan title is required', 'error');
      return;
    }

    const validSteps: ActionPlanStep[] = newSteps
      .filter((s) => s.trim().length > 0)
      .map((s, idx) => ({
        id: `step-${Date.now()}-${idx}`,
        text: s.trim(),
        completed: false,
      }));

    const newPlan: ActionPlan = {
      id: `plan-${Date.now()}`,
      title: newTitle.trim(),
      description: newDesc.trim() || undefined,
      priority: newPriority,
      status: 'in_progress',
      steps: validSteps,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await saveActionPlan(user.uid, newPlan);
      setPlans([newPlan, ...plans]);
      setIsCreating(false);
      setNewTitle('');
      setNewDesc('');
      setNewSteps(['', '']);
      toast('Action plan created', 'success');
    } catch (err) {
      toast('Failed to create action plan', 'error');
    }
  };

  const handleElevateToGoal = async (plan: ActionPlan) => {
    if (!user) return;
    const completedCount = plan.steps.filter((s) => s.completed).length;
    const totalCount = plan.steps.length;
    const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    const goal: Goal = {
      id: `goal-${Date.now()}`,
      title: plan.title,
      description: plan.description || `Derived from action plan with ${totalCount} actionable steps.`,
      targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'active',
      progress,
      notes: `Action Plan Steps:\n${plan.steps.map((s) => `- [${s.completed ? 'x' : ' '}] ${s.text}`).join('\n')}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await saveGoal(user.uid, goal);
      toast('Elevated to primary Goal!', 'success');
      if (onNavigateTab) {
        onNavigateTab('goals');
      }
    } catch (err) {
      toast('Failed to elevate to goal', 'error');
    }
  };

  const filteredPlans = plans.filter((p) => {
    if (filter === 'in_progress') return p.status !== 'completed';
    if (filter === 'completed') return p.status === 'completed';
    return true;
  });

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ListTodo className="w-5 h-5 text-indigo-400" />
            <h1 className="text-xl font-semibold tracking-tight text-zinc-100">Action Plans</h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-950/80 border border-indigo-800/60 text-indigo-300">
              THOUGHT &rarr; ACTION
            </span>
          </div>
          <p className="text-xs text-zinc-400">
            Convert abstract realizations and decision verdicts into high-leverage executable roadmaps.
          </p>
        </div>

        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold shadow-sm transition-all active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          <span>New Action Plan</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setFilter('in_progress')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            filter === 'in_progress'
              ? 'bg-zinc-800 text-zinc-100 shadow-sm border border-zinc-700'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Active ({plans.filter((p) => p.status !== 'completed').length})
        </button>
        <button
          onClick={() => setFilter('completed')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            filter === 'completed'
              ? 'bg-zinc-800 text-zinc-100 shadow-sm border border-zinc-700'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Completed ({plans.filter((p) => p.status === 'completed').length})
        </button>
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            filter === 'all'
              ? 'bg-zinc-800 text-zinc-100 shadow-sm border border-zinc-700'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          All ({plans.length})
        </button>
      </div>

      {/* Creation Modal / Inline Box */}
      {isCreating && (
        <div className="p-5 md:p-6 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <h2 className="text-sm font-semibold text-zinc-100">Create Action Plan</h2>
            <button onClick={() => setIsCreating(false)} className="text-xs text-zinc-400 hover:text-zinc-200">
              Cancel
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Plan Title *</label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Redesign morning routine to protect deep focus"
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Purpose & Context</label>
              <input
                type="text"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Why are you undertaking these steps?"
                className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Priority</label>
              <div className="flex gap-2">
                {(['low', 'medium', 'high'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setNewPriority(p)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium capitalize transition-all ${
                      newPriority === p
                        ? 'bg-indigo-950 border border-indigo-700 text-indigo-300'
                        : 'bg-zinc-950 border border-zinc-800 text-zinc-400'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-medium text-zinc-300">Action Steps</label>
              {newSteps.map((step, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-xs font-mono text-zinc-500 w-4">{idx + 1}.</span>
                  <input
                    type="text"
                    value={step}
                    onChange={(e) => {
                      const updated = [...newSteps];
                      updated[idx] = e.target.value;
                      setNewSteps(updated);
                    }}
                    placeholder={`Step ${idx + 1} (e.g. Turn off phone notifications at 9 PM)`}
                    className="flex-1 px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 placeholder-zinc-600"
                  />
                  {newSteps.length > 1 && (
                    <button
                      onClick={() => setNewSteps(newSteps.filter((_, i) => i !== idx))}
                      className="text-zinc-500 hover:text-rose-400 text-xs"
                    >
                      &times;
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => setNewSteps([...newSteps, ''])}
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 pt-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add another step
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
            <button
              onClick={() => setIsCreating(false)}
              className="px-3.5 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-zinc-200"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveNewPlan}
              className="px-4 py-1.5 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold shadow-sm"
            >
              Save Plan
            </button>
          </div>
        </div>
      )}

      {/* Plan Cards Grid */}
      {loading ? (
        <div className="p-8 text-center text-xs text-zinc-500 font-mono">Loading action plans...</div>
      ) : filteredPlans.length === 0 ? (
        <div className="p-12 rounded-2xl bg-zinc-900/30 border border-zinc-800 text-center space-y-3">
          <ListTodo className="w-10 h-10 mx-auto text-zinc-600" />
          <h3 className="text-sm font-semibold text-zinc-200">No Action Plans Found</h3>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            Extract actionable steps directly from your reflections in the Journal, or click &ldquo;New Action Plan&rdquo; above.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPlans.map((plan) => {
            const completedCount = plan.steps.filter((s) => s.completed).length;
            const totalCount = plan.steps.length;
            const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
            const isFinished = plan.status === 'completed';

            return (
              <div
                key={plan.id}
                className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700/80 transition-all space-y-4"
              >
                {/* Plan Header */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[9px] font-mono uppercase px-2 py-0.5 rounded ${
                          plan.priority === 'high'
                            ? 'bg-rose-950/70 text-rose-300 border border-rose-800/60'
                            : plan.priority === 'medium'
                            ? 'bg-amber-950/70 text-amber-300 border border-amber-800/60'
                            : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                        }`}
                      >
                        {plan.priority} priority
                      </span>
                      {plan.sourceSessionTitle && (
                        <span className="text-[10px] text-zinc-400 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">
                          from: {plan.sourceSessionTitle}
                        </span>
                      )}
                      {isFinished && (
                        <span className="text-[9px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-950/70 text-emerald-300 border border-emerald-800/60">
                          COMPLETED
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-semibold text-zinc-100">{plan.title}</h3>
                    {plan.description && (
                      <p className="text-xs text-zinc-400 leading-relaxed">{plan.description}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleElevateToGoal(plan)}
                      title="Promote to Primary Goal"
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-medium transition-colors"
                    >
                      <Target className="w-3.5 h-3.5 text-indigo-400" />
                      <span className="hidden sm:inline">Make Goal</span>
                    </button>
                    <button
                      onClick={() => handleDeletePlan(plan.id)}
                      className="p-1 rounded-lg text-zinc-500 hover:text-rose-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-zinc-400">
                    <span>
                      {completedCount} of {totalCount} steps completed
                    </span>
                    <span className="font-mono text-xs text-zinc-200">{progress}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-zinc-950 overflow-hidden border border-zinc-800">
                    <div
                      className={`h-full transition-all duration-300 ${
                        isFinished ? 'bg-emerald-500' : 'bg-indigo-500'
                      }`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {/* Steps List */}
                <div className="space-y-1.5 pt-1">
                  {plan.steps.map((step) => (
                    <div
                      key={step.id}
                      onClick={() => handleToggleStep(plan, step.id)}
                      className={`flex items-start gap-3 p-2.5 rounded-xl cursor-pointer transition-all ${
                        step.completed
                          ? 'bg-zinc-950/40 text-zinc-500 line-through'
                          : 'bg-zinc-950/80 hover:bg-zinc-950 text-zinc-200 border border-zinc-800/80'
                      }`}
                    >
                      {step.completed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                      ) : (
                        <Circle className="w-4 h-4 text-zinc-600 hover:text-indigo-400 flex-shrink-0 mt-0.5 transition-colors" />
                      )}
                      <div className="flex-1 text-xs leading-relaxed">
                        <span>{step.text}</span>
                        {step.notes && (
                          <span className="block text-[10px] text-zinc-500 font-normal no-underline mt-0.5">
                            {step.notes}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Quick Add Step */}
                <div className="pt-1">
                  <input
                    type="text"
                    placeholder="+ Add next step and press Enter"
                    onKeyDown={(e: any) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddStepToPlan(plan, e.target.value);
                        e.target.value = '';
                      }
                    }}
                    className="w-full px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800/80 text-xs text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
