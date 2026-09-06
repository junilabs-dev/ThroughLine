import { useState, useEffect } from 'react';
import {
  Scale,
  Plus,
  Sparkles,
  Trash2,
  CheckCircle2,
  Calendar,
  AlertCircle,
  HelpCircle,
  Lightbulb,
  Check,
  Edit3,
  Archive,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import {
  getDecisions,
  saveDecision,
  deleteDecision,
  saveActionPlan,
} from '../services/firestoreService';
import { getDecisionAnalysis } from '../services/geminiClient';
import type { Decision, DecisionOption, ActionPlan } from '../types';

interface DecisionsPageProps {
  onNavigateTab?: (tab: any) => void;
}

export default function DecisionsPage({ onNavigateTab }: DecisionsPageProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDecision, setSelectedDecision] = useState<Decision | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [filter, setFilter] = useState<'all' | 'evaluating' | 'decided'>('evaluating');

  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formContext, setFormContext] = useState('');
  const [criteriaInput, setCriteriaInput] = useState('');
  const [criteriaList, setCriteriaList] = useState<string[]>([]);
  const [assumptionsInput, setAssumptionsInput] = useState('');
  const [assumptionsList, setAssumptionsList] = useState<string[]>([]);
  const [options, setOptions] = useState<DecisionOption[]>([
    { id: 'opt-1', title: 'Option A', pros: [], cons: [] },
    { id: 'opt-2', title: 'Option B', pros: [], cons: [] },
  ]);
  const [reviewDate, setReviewDate] = useState('');
  const [analyzingAi, setAnalyzingAi] = useState(false);

  // Verdict Modal / Inline State
  const [chosenOptionId, setChosenOptionId] = useState<string>('');
  const [verdictRationale, setVerdictRationale] = useState<string>('');

  useEffect(() => {
    if (!user) return;
    loadDecisions();
  }, [user]);

  const loadDecisions = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const data = await getDecisions(user.uid);
      setDecisions(data);
      if (data.length > 0 && !selectedDecision && !isCreating) {
        setSelectedDecision(data[0]);
      }
    } catch (err) {
      console.error(err);
      toast('Failed to load decisions', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleStartCreate = () => {
    setIsCreating(true);
    setSelectedDecision(null);
    setFormTitle('');
    setFormContext('');
    setCriteriaList([]);
    setAssumptionsList([]);
    setOptions([
      { id: 'opt-1', title: '', pros: [], cons: [] },
      { id: 'opt-2', title: '', pros: [], cons: [] },
    ]);
    setReviewDate('');
  };

  const handleAddCriterion = () => {
    if (!criteriaInput.trim()) return;
    setCriteriaList([...criteriaList, criteriaInput.trim()]);
    setCriteriaInput('');
  };

  const handleRemoveCriterion = (index: number) => {
    setCriteriaList(criteriaList.filter((_, i) => i !== index));
  };

  const handleAddAssumption = () => {
    if (!assumptionsInput.trim()) return;
    setAssumptionsList([...assumptionsList, assumptionsInput.trim()]);
    setAssumptionsInput('');
  };

  const handleRemoveAssumption = (index: number) => {
    setAssumptionsList(assumptionsList.filter((_, i) => i !== index));
  };

  const handleAddOption = () => {
    setOptions([
      ...options,
      { id: `opt-${Date.now()}`, title: `Option ${String.fromCharCode(65 + options.length)}`, pros: [], cons: [] },
    ]);
  };

  const handleOptionTitleChange = (id: string, newTitle: string) => {
    setOptions(options.map((o) => (o.id === id ? { ...o, title: newTitle } : o)));
  };

  const handleAddOptionPro = (id: string, text: string) => {
    if (!text.trim()) return;
    setOptions(options.map((o) => (o.id === id ? { ...o, pros: [...o.pros, text.trim()] } : o)));
  };

  const handleAddOptionCon = (id: string, text: string) => {
    if (!text.trim()) return;
    setOptions(options.map((o) => (o.id === id ? { ...o, cons: [...o.cons, text.trim()] } : o)));
  };

  const handleRemoveOptionPro = (optId: string, pIdx: number) => {
    setOptions(options.map((o) => (o.id === optId ? { ...o, pros: o.pros.filter((_, i) => i !== pIdx) } : o)));
  };

  const handleRemoveOptionCon = (optId: string, cIdx: number) => {
    setOptions(options.map((o) => (o.id === optId ? { ...o, cons: o.cons.filter((_, i) => i !== cIdx) } : o)));
  };

  const handleRemoveOption = (id: string) => {
    if (options.length <= 2) {
      toast('A decision requires at least two options to compare', 'info');
      return;
    }
    setOptions(options.filter((o) => o.id !== id));
  };

  const handleSaveDecision = async () => {
    if (!user) return;
    if (!formTitle.trim()) {
      toast('Decision title is required', 'error');
      return;
    }

    const decision: Decision = {
      id: selectedDecision?.id || `decision-${Date.now()}`,
      title: formTitle.trim(),
      context: formContext.trim(),
      criteria: criteriaList,
      options: options.filter((o) => o.title.trim()),
      assumptions: assumptionsList,
      status: selectedDecision?.status || 'evaluating',
      chosenOptionId: selectedDecision?.chosenOptionId,
      verdictRationale: selectedDecision?.verdictRationale,
      reviewDate: reviewDate || selectedDecision?.reviewDate,
      createdAt: selectedDecision?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      aiAnalysis: selectedDecision?.aiAnalysis,
    };

    try {
      await saveDecision(user.uid, decision);
      toast('Decision saved to Decision Room', 'success');
      setIsCreating(false);
      setSelectedDecision(decision);
      loadDecisions();
    } catch (err) {
      toast('Failed to save decision', 'error');
    }
  };

  const handleRunAiAnalysis = async () => {
    const active = selectedDecision || {
      title: formTitle,
      context: formContext,
      options,
      criteria: criteriaList,
      assumptions: assumptionsList,
    };

    if (!active.title) {
      toast('Please enter a decision title first', 'info');
      return;
    }

    try {
      setAnalyzingAi(true);
      const analysis = await getDecisionAnalysis({
        title: active.title,
        context: active.context || '',
        options: active.options,
        criteria: active.criteria || [],
        assumptions: active.assumptions || [],
      });

      if (user && selectedDecision) {
        const updated: Decision = {
          ...selectedDecision,
          aiAnalysis: analysis,
          updatedAt: new Date().toISOString(),
        };
        await saveDecision(user.uid, updated);
        setSelectedDecision(updated);
        setDecisions(decisions.map((d) => (d.id === updated.id ? updated : d)));
      }
      toast('Decision architecture analysis generated', 'success');
    } catch (err: any) {
      toast('AI analysis failed: ' + (err.message || 'Error'), 'error');
    } finally {
      setAnalyzingAi(false);
    }
  };

  const handleFinalizeVerdict = async () => {
    if (!user || !selectedDecision) return;
    if (!chosenOptionId) {
      toast('Please choose a winning option', 'info');
      return;
    }

    const updated: Decision = {
      ...selectedDecision,
      status: 'decided',
      chosenOptionId,
      verdictRationale,
      updatedAt: new Date().toISOString(),
    };

    try {
      await saveDecision(user.uid, updated);
      setSelectedDecision(updated);
      setDecisions(decisions.map((d) => (d.id === updated.id ? updated : d)));
      toast('Decision finalized! Recorded in memory.', 'success');
    } catch (err) {
      toast('Failed to record verdict', 'error');
    }
  };

  const handleCreateActionPlanFromDecision = async () => {
    if (!user || !selectedDecision) return;
    const chosen = selectedDecision.options.find((o) => o.id === selectedDecision.chosenOptionId);
    const plan: ActionPlan = {
      id: `plan-${Date.now()}`,
      title: `Execute Decision: ${selectedDecision.title}`,
      description: `Plan derived from verdict: "${chosen?.title || 'Selected option'}" - ${selectedDecision.verdictRationale || ''}`,
      sourceDecisionId: selectedDecision.id,
      priority: 'high',
      status: 'in_progress',
      steps: [
        { id: 'step-1', text: `Announce or commit to choice: ${chosen?.title || 'Decision'}`, completed: false },
        { id: 'step-2', text: 'Set up first milestone and notify stakeholders', completed: false },
        { id: 'step-3', text: 'Review assumptions and second-order outcomes', completed: false },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await saveActionPlan(user.uid, plan);
      toast('Action Plan generated from decision!', 'success');
      if (onNavigateTab) {
        onNavigateTab('action-plans');
      }
    } catch (err) {
      toast('Failed to create action plan', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    if (!window.confirm('Delete this decision record?')) return;
    try {
      await deleteDecision(user.uid, id);
      setDecisions(decisions.filter((d) => d.id !== id));
      if (selectedDecision?.id === id) {
        setSelectedDecision(decisions.find((d) => d.id !== id) || null);
      }
      toast('Decision deleted', 'info');
    } catch (err) {
      toast('Delete failed', 'error');
    }
  };

  const filteredDecisions = decisions.filter((d) => {
    if (filter === 'evaluating') return d.status === 'evaluating';
    if (filter === 'decided') return d.status === 'decided';
    return true;
  });

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Scale className="w-5 h-5 text-indigo-400" />
            <h1 className="text-xl font-semibold tracking-tight text-zinc-100">Decision Room</h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-950/80 border border-indigo-800/60 text-indigo-300">
              FRAMEWORK
            </span>
          </div>
          <p className="text-xs text-zinc-400">
            Deconstruct complex choices, expose hidden assumptions, and turn ambiguity into clear verdicts.
          </p>
        </div>

        <button
          id="create-decision-btn"
          onClick={handleStartCreate}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold shadow-sm transition-all active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          <span>New Decision</span>
        </button>
      </div>

      {/* Main Workspace: Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Decision Directory */}
        <div className="lg:col-span-4 space-y-3">
          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-zinc-900 border border-zinc-800/80 text-xs">
            <button
              onClick={() => setFilter('evaluating')}
              className={`flex-1 py-1.5 rounded-lg text-center font-medium transition-all ${
                filter === 'evaluating' ? 'bg-zinc-800 text-zinc-100 shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Evaluating ({decisions.filter((d) => d.status === 'evaluating').length})
            </button>
            <button
              onClick={() => setFilter('decided')}
              className={`flex-1 py-1.5 rounded-lg text-center font-medium transition-all ${
                filter === 'decided' ? 'bg-zinc-800 text-zinc-100 shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Decided ({decisions.filter((d) => d.status === 'decided').length})
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`flex-1 py-1.5 rounded-lg text-center font-medium transition-all ${
                filter === 'all' ? 'bg-zinc-800 text-zinc-100 shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              All ({decisions.length})
            </button>
          </div>

          {/* List of Decisions */}
          {loading ? (
            <div className="p-8 text-center text-xs text-zinc-500 font-mono">Loading decision files...</div>
          ) : filteredDecisions.length === 0 ? (
            <div className="p-8 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 text-center space-y-2">
              <Scale className="w-8 h-8 mx-auto text-zinc-600" />
              <p className="text-xs font-medium text-zinc-300">No decisions in this view</p>
              <p className="text-[11px] text-zinc-500">
                Structure a major life, career, or product dilemma to think clearly.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredDecisions.map((decision) => {
                const isSelected = selectedDecision?.id === decision.id && !isCreating;
                const isDecided = decision.status === 'decided';
                return (
                  <div
                    key={decision.id}
                    onClick={() => {
                      setSelectedDecision(decision);
                      setIsCreating(false);
                    }}
                    className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-zinc-800/90 border-indigo-500/50 shadow-md ring-1 ring-indigo-500/20'
                        : 'bg-zinc-900/50 hover:bg-zinc-900 border-zinc-800/80'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-xs font-semibold text-zinc-200 line-clamp-1">{decision.title}</h3>
                      <span
                        className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded ${
                          isDecided
                            ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/60'
                            : 'bg-amber-950/60 text-amber-300 border border-amber-800/60'
                        }`}
                      >
                        {decision.status}
                      </span>
                    </div>

                    <p className="text-[11px] text-zinc-400 line-clamp-2 mt-1">
                      {decision.context || `${decision.options.length} options under evaluation.`}
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-zinc-500 mt-3 pt-2 border-t border-zinc-800/60">
                      <span>{decision.options.length} Options</span>
                      <span>Updated {new Date(decision.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Decision Viewer & Creator */}
        <div className="lg:col-span-8">
          {isCreating ? (
            /* Decision Creation / Edit Form */
            <div className="p-5 md:p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-5">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <h2 className="text-sm font-semibold text-zinc-100">Draft New Decision</h2>
                <button
                  onClick={() => setIsCreating(false)}
                  className="text-xs text-zinc-400 hover:text-zinc-200"
                >
                  Cancel
                </button>
              </div>

              {/* Title & Context */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Decision Statement *
                  </label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g. Should I accept the senior role or stay to build my own project?"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Context & Stakes
                  </label>
                  <textarea
                    rows={2}
                    value={formContext}
                    onChange={(e) => setFormContext(e.target.value)}
                    placeholder="Why does this decision matter right now? What is pushing you to decide?"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Criteria */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-zinc-300">
                  Decision Criteria (What matters most in the outcome?)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={criteriaInput}
                    onChange={(e) => setCriteriaInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCriterion())}
                    placeholder="e.g. Financial runway, Autonomy, Mental energy"
                    className="flex-1 px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 placeholder-zinc-600"
                  />
                  <button
                    onClick={handleAddCriterion}
                    className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200"
                  >
                    Add
                  </button>
                </div>
                {criteriaList.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {criteriaList.map((crit, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-950/60 border border-indigo-800/40 text-indigo-300 text-xs"
                      >
                        {crit}
                        <button onClick={() => handleRemoveCriterion(idx)} className="text-indigo-400 hover:text-white">
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Options Comparison */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-zinc-300">Options to Evaluate</label>
                  <button
                    type="button"
                    onClick={handleAddOption}
                    className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Option
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {options.map((opt, optIdx) => (
                    <div key={opt.id} className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <input
                          type="text"
                          value={opt.title}
                          onChange={(e) => handleOptionTitleChange(opt.id, e.target.value)}
                          placeholder={`Option ${String.fromCharCode(65 + optIdx)} title`}
                          className="w-full font-semibold text-xs bg-transparent border-b border-zinc-800 focus:border-indigo-500 pb-1 text-zinc-100 focus:outline-none"
                        />
                        {options.length > 2 && (
                          <button
                            onClick={() => handleRemoveOption(opt.id)}
                            className="text-zinc-500 hover:text-rose-400 text-xs"
                          >
                            &times;
                          </button>
                        )}
                      </div>

                      {/* Pros */}
                      <div className="space-y-1">
                        <span className="text-[10px] font-mono text-emerald-400 uppercase">Pros / Upsides</span>
                        <input
                          type="text"
                          placeholder="Type pro & press Enter"
                          onKeyDown={(e: any) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddOptionPro(opt.id, e.target.value);
                              e.target.value = '';
                            }
                          }}
                          className="w-full px-2 py-1 rounded bg-zinc-900 border border-zinc-800 text-xs text-zinc-200"
                        />
                        <div className="space-y-1 pt-1">
                          {opt.pros.map((p, idx) => (
                            <div key={idx} className="flex items-center justify-between text-[11px] text-zinc-300 bg-emerald-950/20 border border-emerald-900/30 px-2 py-0.5 rounded">
                              <span>+ {p}</span>
                              <button onClick={() => handleRemoveOptionPro(opt.id, idx)} className="text-zinc-500 hover:text-white">&times;</button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Cons */}
                      <div className="space-y-1">
                        <span className="text-[10px] font-mono text-rose-400 uppercase">Cons / Downsides</span>
                        <input
                          type="text"
                          placeholder="Type con & press Enter"
                          onKeyDown={(e: any) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddOptionCon(opt.id, e.target.value);
                              e.target.value = '';
                            }
                          }}
                          className="w-full px-2 py-1 rounded bg-zinc-900 border border-zinc-800 text-xs text-zinc-200"
                        />
                        <div className="space-y-1 pt-1">
                          {opt.cons.map((c, idx) => (
                            <div key={idx} className="flex items-center justify-between text-[11px] text-zinc-300 bg-rose-950/20 border border-rose-900/30 px-2 py-0.5 rounded">
                              <span>- {c}</span>
                              <button onClick={() => handleRemoveOptionCon(opt.id, idx)} className="text-zinc-500 hover:text-white">&times;</button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Assumptions */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-zinc-300">
                  Assumptions being made (What must be true for this to work?)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={assumptionsInput}
                    onChange={(e) => setAssumptionsInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddAssumption())}
                    placeholder="e.g. The job market won't collapse in 6 months"
                    className="flex-1 px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 placeholder-zinc-600"
                  />
                  <button
                    onClick={handleAddAssumption}
                    className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200"
                  >
                    Add
                  </button>
                </div>
                {assumptionsList.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {assumptionsList.map((assump, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs"
                      >
                        {assump}
                        <button onClick={() => handleRemoveAssumption(idx)} className="text-zinc-400 hover:text-white">
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  onClick={() => setIsCreating(false)}
                  className="px-4 py-2 rounded-xl text-xs text-zinc-400 hover:text-zinc-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveDecision}
                  className="px-5 py-2 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold shadow-sm"
                >
                  Save to Room
                </button>
              </div>
            </div>
          ) : selectedDecision ? (
            /* Active Decision Details View */
            <div className="space-y-6">
              {/* Header Box */}
              <div className="p-5 md:p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[9px] font-mono uppercase px-2 py-0.5 rounded ${
                          selectedDecision.status === 'decided'
                            ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                            : 'bg-amber-950/80 text-amber-300 border border-amber-800'
                        }`}
                      >
                        {selectedDecision.status}
                      </span>
                      <span className="text-xs text-zinc-500">
                        Created {new Date(selectedDecision.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <h2 className="text-base md:text-lg font-semibold text-zinc-100">
                      {selectedDecision.title}
                    </h2>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={handleRunAiAnalysis}
                      disabled={analyzingAi}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-800/80 text-indigo-300 text-xs font-medium transition-all"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{analyzingAi ? 'Analyzing...' : 'AI Architecture'}</span>
                    </button>
                    <button
                      onClick={() => handleDelete(selectedDecision.id)}
                      className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {selectedDecision.context && (
                  <p className="text-xs text-zinc-300 bg-zinc-950/50 p-3 rounded-xl border border-zinc-800/60 leading-relaxed">
                    {selectedDecision.context}
                  </p>
                )}

                {/* Criteria Tags */}
                {selectedDecision.criteria?.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                      Evaluation Criteria
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedDecision.criteria.map((c, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded bg-zinc-800/80 border border-zinc-700 text-zinc-300 text-xs"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Options Grid */}
              <div className="space-y-2">
                <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-400 px-1">
                  Options Comparison Matrix
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedDecision.options.map((opt) => {
                    const isWinner = selectedDecision.chosenOptionId === opt.id;
                    return (
                      <div
                        key={opt.id}
                        className={`p-4 rounded-xl border transition-all ${
                          isWinner
                            ? 'bg-emerald-950/20 border-emerald-600/60 shadow-md ring-1 ring-emerald-500/30'
                            : 'bg-zinc-900/50 border-zinc-800'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-xs font-semibold text-zinc-100 flex items-center gap-1.5">
                            {opt.title}
                            {isWinner && (
                              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-900 text-emerald-200">
                                SELECTED CHOICE
                              </span>
                            )}
                          </h4>
                          {selectedDecision.status === 'evaluating' && (
                            <button
                              onClick={() => {
                                setChosenOptionId(opt.id);
                              }}
                              className={`text-[10px] font-medium px-2 py-1 rounded-md border transition-all ${
                                chosenOptionId === opt.id
                                  ? 'bg-indigo-600 text-white border-indigo-500'
                                  : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700'
                              }`}
                            >
                              {chosenOptionId === opt.id ? 'Pick to Decide' : 'Select'}
                            </button>
                          )}
                        </div>

                        {/* Pros */}
                        <div className="space-y-1 mb-2.5">
                          <p className="text-[10px] font-mono uppercase text-emerald-400">Pros</p>
                          {opt.pros.length === 0 ? (
                            <p className="text-[11px] text-zinc-600 italic">None listed</p>
                          ) : (
                            opt.pros.map((p, i) => (
                              <p key={i} className="text-xs text-zinc-300 flex items-start gap-1">
                                <span className="text-emerald-400">+</span>
                                <span>{p}</span>
                              </p>
                            ))
                          )}
                        </div>

                        {/* Cons */}
                        <div className="space-y-1">
                          <p className="text-[10px] font-mono uppercase text-rose-400">Cons</p>
                          {opt.cons.length === 0 ? (
                            <p className="text-[11px] text-zinc-600 italic">None listed</p>
                          ) : (
                            opt.cons.map((c, i) => (
                              <p key={i} className="text-xs text-zinc-300 flex items-start gap-1">
                                <span className="text-rose-400">-</span>
                                <span>{c}</span>
                              </p>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* AI Architecture Insights Box (if analyzed) */}
              {selectedDecision.aiAnalysis && (
                <div className="p-5 rounded-2xl bg-indigo-950/20 border border-indigo-800/50 space-y-3">
                  <div className="flex items-center gap-2 text-indigo-300">
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                    <h4 className="text-xs font-semibold tracking-tight">
                      Decision Architecture Analysis
                    </h4>
                  </div>

                  <p className="text-xs text-zinc-300 leading-relaxed">
                    {selectedDecision.aiAnalysis.tradeoffSummary}
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                    <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80 space-y-1">
                      <p className="text-[10px] font-mono uppercase text-amber-400">
                        Hidden Assumptions Spotted
                      </p>
                      <ul className="text-xs text-zinc-300 space-y-1 list-disc list-inside">
                        {selectedDecision.aiAnalysis.hiddenAssumptions.map((a, i) => (
                          <li key={i}>{a}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80 space-y-1">
                      <p className="text-[10px] font-mono uppercase text-indigo-400">
                        Blind Spots & Tradeoffs
                      </p>
                      <ul className="text-xs text-zinc-300 space-y-1 list-disc list-inside">
                        {selectedDecision.aiAnalysis.blindSpots.map((b, i) => (
                          <li key={i}>{b}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-indigo-900/30 border border-indigo-700/40 text-xs text-indigo-200">
                    <span className="font-semibold">Recommended Mental Model:</span>{' '}
                    {selectedDecision.aiAnalysis.recommendedFramework}
                  </div>
                </div>
              )}

              {/* Final Verdict Section */}
              {selectedDecision.status === 'evaluating' && chosenOptionId && (
                <div className="p-4 rounded-xl bg-zinc-900 border border-indigo-500/40 space-y-3">
                  <div className="flex items-center gap-2 text-indigo-300">
                    <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                    <h4 className="text-xs font-semibold">Finalize Verdict</h4>
                  </div>

                  <div>
                    <label className="block text-[11px] text-zinc-400 mb-1">
                      Rationale for this verdict (Why are you picking this option?)
                    </label>
                    <textarea
                      rows={2}
                      value={verdictRationale}
                      onChange={(e) => setVerdictRationale(e.target.value)}
                      placeholder="e.g. After weighing burnout risk vs financial upside, autonomy is the decisive factor right now."
                      className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => setChosenOptionId('')}
                      className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleFinalizeVerdict}
                      className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm"
                    >
                      Confirm Verdict
                    </button>
                  </div>
                </div>
              )}

              {selectedDecision.status === 'decided' && (
                <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-800/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-emerald-300">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <h4 className="text-xs font-semibold">
                        Verdict Finalized:{' '}
                        {selectedDecision.options.find((o) => o.id === selectedDecision.chosenOptionId)?.title}
                      </h4>
                    </div>

                    <button
                      onClick={handleCreateActionPlanFromDecision}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-100 text-zinc-950 text-xs font-semibold hover:bg-white transition-all shadow-sm"
                    >
                      <span>Create Action Plan</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {selectedDecision.verdictRationale && (
                    <p className="text-xs text-zinc-300 italic pt-1">
                      &ldquo;{selectedDecision.verdictRationale}&rdquo;
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* Empty State */
            <div className="p-12 rounded-2xl bg-zinc-900/30 border border-zinc-800/60 text-center space-y-3">
              <Scale className="w-10 h-10 mx-auto text-zinc-600" />
              <h3 className="text-sm font-semibold text-zinc-200">No Decision Selected</h3>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                Pick a decision from the left directory or start a fresh evaluation to clarify your options.
              </p>
              <button
                onClick={handleStartCreate}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-100 text-zinc-950 text-xs font-semibold hover:bg-white"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Start New Decision</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
