import { useState } from 'react';
import {
  Settings,
  User as UserIcon,
  Bot,
  Download,
  Trash2,
  Shield,
  LogOut,
  Sparkles,
  Check,
  Smartphone,
  Laptop,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { PWAInstallButton } from '../components/PWAInstallButton';
import { MindMascot } from '../components/MindMascot';
import lumieImage from '../assets/images/mindspace_mascot_lumie_1788689700302.jpg';
import {
  exportAllUserData,
  deleteAllUserData,
} from '../services/firestoreService';
import type { AiStyle } from '../types';

export default function SettingsPage() {
  const { user, settings, updateSettings, logout } = useAuth();
  const { toast } = useToast();

  const [exporting, setExporting] = useState(false);
  const [clearing, setClearing] = useState(false);

  const AI_STYLES: Array<{ id: AiStyle; title: string; desc: string }> = [
    {
      id: 'Supportive',
      title: 'Supportive',
      desc: 'Warm, grounded, empathetic, and gently encouraging without empty fluff.',
    },
    {
      id: 'Concise',
      title: 'Concise',
      desc: 'Direct, crisp, high signal-to-noise ratio. Cuts straight to core observations.',
    },
    {
      id: 'Analytical',
      title: 'Analytical',
      desc: 'Deconstructs thoughts logically, identifies causal chains and decision trees.',
    },
    {
      id: 'Challenging',
      title: 'Challenging',
      desc: 'Respectfully questions assumptions, points out blind spots and counter-theses.',
    },
    {
      id: 'Creative',
      title: 'Creative',
      desc: 'Divergent analogies, fresh angles, lateral thinking, and metaphor exploration.',
    },
  ];

  const handleSelectStyle = async (style: AiStyle) => {
    try {
      await updateSettings({ aiStyle: style });
      toast(`Companion style set to "${style}"`, 'success');
    } catch (err) {
      toast('Failed to update style', 'error');
    }
  };

  const handleExportJson = async () => {
    if (!user) return;
    try {
      setExporting(true);
      const data = await exportAllUserData(user.uid);
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mindspace-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast('Full reflection archive downloaded as JSON', 'success');
    } catch (err: any) {
      toast('Failed to export data', 'error');
    } finally {
      setExporting(false);
    }
  };

  const handleClearAllData = async () => {
    if (!user) return;
    const confirmed = window.prompt(
      'Type "DELETE MY DATA" to permanently erase all your reflections, conversations, and goals:'
    );
    if (confirmed !== 'DELETE MY DATA') {
      toast('Action cancelled', 'info');
      return;
    }

    try {
      setClearing(true);
      await deleteAllUserData(user.uid);
      toast('All personal reflections have been permanently erased', 'info');
    } catch (err) {
      toast('Failed to wipe data', 'error');
    } finally {
      setClearing(false);
    }
  };

  return (
    <div id="settings-page" className="p-6 md:p-10 max-w-4xl mx-auto space-y-10">
      {/* Header */}
      <div className="pb-6 border-b border-zinc-800/80">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-zinc-800 text-zinc-300 flex items-center justify-center">
            <Settings className="w-4 h-4" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100">Settings & Preferences</h1>
        </div>
        <p className="text-sm text-zinc-400 mt-1">
          Customize your AI thinking companion persona, download your data archive, or manage your account.
        </p>
      </div>

      {/* Profile Card */}
      <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {user?.photoURL ? (
            <img
              src={user.photoURL}
              alt={user.displayName || 'Profile'}
              className="w-12 h-12 rounded-full border border-zinc-700 object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800 flex items-center justify-center font-bold text-base">
              {user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
            </div>
          )}
          <div>
            <h3 className="text-base font-semibold text-zinc-100">{user?.displayName || 'User'}</h3>
            <p className="text-xs text-zinc-400 mt-0.5">{user?.email}</p>
            <p className="text-[10px] text-zinc-400 font-mono mt-1">UID: {user?.uid}</p>
          </div>
        </div>

        <button
          onClick={logout}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>

      {/* AI Personality Style Selector */}
      <div className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
            <Bot className="w-4 h-4 text-indigo-400" />
            <span>AI Thinking Companion Persona</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Choose how Throughline frames questions, challenges, and summaries across all your sessions.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {AI_STYLES.map((style) => {
            const isSelected = settings.aiStyle === style.id;
            return (
              <button
                key={style.id}
                onClick={() => handleSelectStyle(style.id)}
                className={`p-4 rounded-xl text-left border transition-all ${
                  isSelected
                    ? 'bg-indigo-950/60 border-indigo-600/80 text-zinc-100 shadow-sm'
                    : 'bg-zinc-900/40 border-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/80'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-zinc-200">{style.title}</span>
                  {isSelected && <Check className="w-4 h-4 text-indigo-400" />}
                </div>
                <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">{style.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* AI Memory Scope */}
      <div className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span>AI Memory & Context Scope</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Control how much of your past thinking history AI features can access for synthesis.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            {
              id: 'all',
              title: 'Full Memory',
              desc: 'AI can synthesize insights, patterns, and answers across all historical reflections.',
            },
            {
              id: 'last_30_days',
              title: 'Last 30 Days',
              desc: 'AI only inspects recent entries to prioritize immediate clarity over long-term recall.',
            },
            {
              id: 'pinned_only',
              title: 'Strictly Pinned / Pinned Only',
              desc: 'AI only sees entries and ideas you have explicitly bookmarked or pinned.',
            },
          ].map((scope) => {
            const isSelected = (settings.aiScope || 'all') === scope.id;
            return (
              <button
                key={scope.id}
                onClick={async () => {
                  await updateSettings({ aiScope: scope.id as any });
                  toast(`Context scope set to ${scope.title}`, 'success');
                }}
                className={`p-4 rounded-xl text-left border transition-all ${
                  isSelected
                    ? 'bg-indigo-950/60 border-indigo-600/80 text-zinc-100 shadow-sm'
                    : 'bg-zinc-900/40 border-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/80'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-zinc-200">{scope.title}</span>
                  {isSelected && <Check className="w-4 h-4 text-indigo-400" />}
                </div>
                <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">{scope.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Multi-Device & PWA Install Section */}
      <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-indigo-400" />
              <span>Multi-Device Experience & App Installation</span>
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              Install Throughline on your iPhone, Android, iPad, Mac, or PC for a native full-screen experience with instant cloud synchronization.
            </p>
          </div>
          <div className="shrink-0">
            <PWAInstallButton />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800/60">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200 mb-1">
              <Laptop className="w-3.5 h-3.5 text-zinc-400" />
              <span>Desktop (Mac / PC)</span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Click the install icon in the address bar or use the install button above to run Throughline in a dedicated window.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800/60">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200 mb-1">
              <Smartphone className="w-3.5 h-3.5 text-zinc-400" />
              <span>iPhone & iPad (iOS)</span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Open in Safari, tap the <strong className="text-zinc-300">Share</strong> icon, and choose <strong className="text-zinc-300">"Add to Home Screen"</strong>.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800/60">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200 mb-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
              <span>Android & Chrome</span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Tap the install banner or browser menu to add the standalone app to your home screen with offline asset caching.
            </p>
          </div>
        </div>
      </div>

      {/* Meet Lumie: Throughline Mascot Card */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-950/40 via-zinc-900/60 to-zinc-950/80 border border-indigo-500/30 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative w-16 h-16 rounded-2xl overflow-hidden border border-indigo-500/40 shrink-0 bg-zinc-950 shadow-md">
              <img
                src={lumieImage}
                alt="Lumie - The Throughline Mascot"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                <span>Meet Lumie</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-teal-950/80 text-teal-300 border border-teal-800/60">
                  Official Mascot
                </span>
              </h3>
              <p className="text-xs text-zinc-400 mt-1 max-w-lg leading-relaxed">
                Lumie is your mindful thought companion. Born from a quiet spark of clarity, Lumie floats beside your writing to encourage patience, celebrate small breakthroughs, and help you pause with guided box breathing.
              </p>
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-3 p-2 rounded-2xl bg-zinc-950/80 border border-indigo-500/30">
            <MindMascot mood="idle" size="md" />
            <div className="text-left pr-2">
              <span className="text-[11px] font-medium text-zinc-200 block">Interactive Lumie</span>
              <span className="text-[10px] text-indigo-400">Click to interact</span>
            </div>
          </div>
        </div>
      </div>

      {/* Privacy & Cloud Architecture Note */}
      <div className="p-5 rounded-2xl bg-zinc-900/30 border border-zinc-800/80 space-y-2">
        <h3 className="text-xs font-mono uppercase text-emerald-400 font-semibold flex items-center gap-1.5">
          <Shield className="w-4 h-4" />
          Data Isolation Guarantee
        </h3>
        <p className="text-xs text-zinc-400 leading-relaxed">
          Throughline enforces zero insecure database defaults. All queries and mutations are isolated strictly to your
          personal Firebase UID via Cloud Firestore Security Rules (<code className="font-mono text-zinc-300">request.auth.uid == userId</code>). Your entries are not indexed or shared across users.
        </p>
      </div>

      {/* Data Export & Backup */}
      <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
            <Download className="w-4 h-4 text-zinc-400" />
            <span>Data Ownership & Export</span>
          </h3>
          <p className="text-xs text-zinc-400 mt-1">
            Export a complete machine-readable JSON archive containing all your reflection entries, companion chat histories,
            goals, and weekly reviews.
          </p>
        </div>

        <button
          onClick={handleExportJson}
          disabled={exporting}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors disabled:opacity-50"
        >
          <Download className="w-3.5 h-3.5" />
          <span>{exporting ? 'Generating Archive...' : 'Download JSON Archive'}</span>
        </button>
      </div>

      {/* Danger Zone */}
      <div className="p-6 rounded-2xl bg-rose-950/20 border border-rose-900/40 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-rose-300 flex items-center gap-2">
            <Trash2 className="w-4 h-4 text-rose-400" />
            <span>Danger Zone</span>
          </h3>
          <p className="text-xs text-zinc-400 mt-1">
            Permanently delete all journal entries, AI companion conversations, goals, and weekly reviews from Cloud
            Firestore. This action cannot be undone.
          </p>
        </div>

        <button
          onClick={handleClearAllData}
          disabled={clearing}
          className="px-4 py-2 rounded-xl bg-rose-900/40 hover:bg-rose-900/60 border border-rose-800/60 text-rose-200 text-xs font-medium transition-colors disabled:opacity-50"
        >
          {clearing ? 'Erasing...' : 'Erase All Reflection Data'}
        </button>
      </div>
    </div>
  );
}
