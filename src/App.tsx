import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider, useToast } from './components/Toast';
import Navigation, { type NavTab } from './components/Navigation';
import LandingPage from './components/LandingPage';
import DashboardPage from './pages/DashboardPage';
import JournalPage from './pages/JournalPage';
import HistoryPage from './pages/HistoryPage';
import ThinkingMapPage from './pages/ThinkingMapPage';
import InsightsPage from './pages/InsightsPage';
import GoalsPage from './pages/GoalsPage';
import WeeklyReviewPage from './pages/WeeklyReviewPage';
import SavedPage from './pages/SavedPage';
import SettingsPage from './pages/SettingsPage';
import AskJournalPage from './pages/AskJournalPage';
import DecisionsPage from './pages/DecisionsPage';
import PatternsPage from './pages/PatternsPage';
import UnresolvedThoughtsPage from './pages/UnresolvedThoughtsPage';
import ActionPlansPage from './pages/ActionPlansPage';
import RewindPage from './pages/RewindPage';
import { FloatingMascot } from './components/FloatingMascot';
import { getJournalSession } from './services/firestoreService';
import type { JournalSession } from './types';
import { Sparkles } from 'lucide-react';

function AppContent() {
  const { user, loading } = useAuth();
  const { toast } = useToast();

  const [currentTab, setCurrentTab] = useState<NavTab>('home');
  const [activeSession, setActiveSession] = useState<JournalSession | null>(null);
  const [initialPrompt, setInitialPrompt] = useState<string | undefined>(undefined);
  const [initialGoalId, setInitialGoalId] = useState<string | undefined>(undefined);

  // Loading Screen
  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-zinc-400 space-y-3">
        <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 animate-pulse">
          <Sparkles className="w-5 h-5" />
        </div>
        <p className="text-xs font-mono tracking-wider uppercase text-zinc-500">
          Throughline &bull; Initializing Workspace
        </p>
      </div>
    );
  }

  // Not authenticated: Landing Page
  if (!user) {
    return <LandingPage />;
  }

  // Action: Start fresh reflection
  const handleStartReflection = (prompt?: string, goalId?: string) => {
    setActiveSession(null);
    setInitialPrompt(prompt);
    setInitialGoalId(goalId);
    setCurrentTab('journal');
  };

  // Action: Open an existing reflection
  const handleOpenSession = (session: JournalSession) => {
    setActiveSession(session);
    setInitialPrompt(undefined);
    setInitialGoalId(session.linkedGoalId);
    setCurrentTab('journal');
  };

  // Action: Open session by ID (e.g. from Saved / Bookmarks)
  const handleOpenSessionById = async (sessionId: string) => {
    if (!user) return;
    try {
      const session = await getJournalSession(user.uid, sessionId);
      if (session) {
        handleOpenSession(session);
      } else {
        toast('Reflection session could not be found', 'error');
      }
    } catch (err) {
      toast('Failed to load reflection', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col md:flex-row text-zinc-100 selection:bg-indigo-500/30">
      {/* Responsive Navigation Sidebar & Bars */}
      <Navigation
        currentTab={currentTab}
        onSelectTab={(tab) => setCurrentTab(tab)}
        onNewReflection={() => handleStartReflection()}
      />

      {/* Main View Area */}
      <main className="flex-1 min-w-0 overflow-y-auto pb-16 md:pb-0">
        {currentTab === 'home' && (
          <DashboardPage
            onStartReflection={handleStartReflection}
            onOpenSession={handleOpenSession}
            onNavigateTab={(tab) => setCurrentTab(tab)}
          />
        )}

        {currentTab === 'journal' && (
          <JournalPage
            key={activeSession?.id || 'new-session'}
            initialSession={activeSession}
            initialPrompt={initialPrompt}
            initialGoalId={initialGoalId}
            onBack={() => setCurrentTab('home')}
            onSessionSaved={(saved) => setActiveSession(saved)}
          />
        )}

        {currentTab === 'history' && (
          <HistoryPage
            onOpenSession={handleOpenSession}
            onNewReflection={() => handleStartReflection()}
          />
        )}

        {currentTab === 'thinking-map' && (
          <ThinkingMapPage onStartReflection={handleStartReflection} />
        )}

        {currentTab === 'ask-journal' && (
          <AskJournalPage onOpenSessionById={handleOpenSessionById} />
        )}

        {currentTab === 'decisions' && (
          <DecisionsPage onNavigateTab={(tab) => setCurrentTab(tab)} />
        )}

        {currentTab === 'patterns' && (
          <PatternsPage
            onStartReflection={handleStartReflection}
            onOpenSessionById={handleOpenSessionById}
          />
        )}

        {currentTab === 'unresolved' && (
          <UnresolvedThoughtsPage
            onStartReflection={handleStartReflection}
            onOpenSessionById={handleOpenSessionById}
          />
        )}

        {currentTab === 'action-plans' && (
          <ActionPlansPage
            onNavigateTab={(tab) => setCurrentTab(tab)}
            onStartReflection={handleStartReflection}
          />
        )}

        {currentTab === 'rewind' && (
          <RewindPage
            onOpenSessionById={handleOpenSessionById}
            onStartReflection={handleStartReflection}
          />
        )}

        {currentTab === 'insights' && (
          <InsightsPage onStartReflection={handleStartReflection} />
        )}

        {currentTab === 'goals' && (
          <GoalsPage onStartReflection={handleStartReflection} />
        )}

        {currentTab === 'weekly' && (
          <WeeklyReviewPage onStartReflection={handleStartReflection} />
        )}

        {currentTab === 'saved' && (
          <SavedPage onOpenSessionById={handleOpenSessionById} />
        )}

        {currentTab === 'settings' && <SettingsPage />}

        {/* Floating Desk Mascot Companion */}
        {currentTab !== 'journal' && (
          <FloatingMascot onStartReflection={handleStartReflection} />
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ToastProvider>
  );
}
