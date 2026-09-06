import { useState } from 'react';
import {
  Compass,
  PenLine,
  Search,
  Scale,
  Network,
  Activity,
  HelpCircle,
  ListTodo,
  Target,
  Clock,
  CalendarCheck,
  History,
  BookmarkCheck,
  Settings,
  LogOut,
  Plus,
  Sparkles,
  Menu,
  X,
  Smartphone,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { PWAInstallButton } from './PWAInstallButton';
import { MindMascot } from './MindMascot';

export type NavTab =
  | 'home'
  | 'journal'
  | 'ask-journal'
  | 'decisions'
  | 'thinking-map'
  | 'patterns'
  | 'insights'
  | 'unresolved'
  | 'action-plans'
  | 'goals'
  | 'history'
  | 'weekly'
  | 'rewind'
  | 'saved'
  | 'settings';

interface NavigationProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onNewReflection: () => void;
}

interface NavSection {
  title: string;
  items: Array<{
    id: NavTab;
    label: string;
    icon: any;
    badge?: string;
  }>;
}

export default function Navigation({ currentTab, onSelectTab, onNewReflection }: NavigationProps) {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const sections: NavSection[] = [
    {
      title: 'CORE',
      items: [
        { id: 'home', label: 'Dashboard', icon: Compass },
        { id: 'journal', label: 'Write / Reflection', icon: PenLine },
      ],
    },
    {
      title: 'THINK',
      items: [
        { id: 'ask-journal', label: 'Ask My Journal', icon: Search, badge: 'AI' },
        { id: 'decisions', label: 'Decision Room', icon: Scale },
      ],
    },
    {
      title: 'UNDERSTAND',
      items: [
        { id: 'thinking-map', label: 'Thinking Map', icon: Network, badge: '2.0' },
        { id: 'patterns', label: 'Patterns & Clarity', icon: Activity },
        { id: 'unresolved', label: 'Unresolved Thoughts', icon: HelpCircle },
      ],
    },
    {
      title: 'ACT',
      items: [
        { id: 'action-plans', label: 'Action Plans', icon: ListTodo },
        { id: 'goals', label: 'Goals', icon: Target },
      ],
    },
    {
      title: 'REVIEW',
      items: [
        { id: 'history', label: 'History', icon: Clock },
        { id: 'weekly', label: 'Weekly Review', icon: CalendarCheck },
        { id: 'rewind', label: 'Reflection Rewind', icon: History },
      ],
    },
    {
      title: 'WORKSPACE',
      items: [
        { id: 'saved', label: 'Saved & Bookmarks', icon: BookmarkCheck },
        { id: 'settings', label: 'Settings & Privacy', icon: Settings },
      ],
    },
  ];

  const handleSelect = (tab: NavTab) => {
    onSelectTab(tab);
    setMobileMenuOpen(false);
  };

  return (
    <>
      {/* Desktop Left Sidebar */}
      <aside
        id="desktop-sidebar"
        className="hidden lg:flex flex-col w-64 bg-zinc-950 border-r border-zinc-800/80 p-4 h-screen sticky top-0 select-none z-30 flex-shrink-0"
      >
        {/* Brand Header with Lumie Mascot */}
        <div className="flex items-center gap-3 px-2 mb-4 pt-1">
          <div className="relative shrink-0 flex items-center justify-center p-0.5 rounded-xl bg-zinc-900 border border-indigo-500/30">
            <MindMascot mood="idle" size="sm" />
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-tight text-zinc-100 flex items-center gap-1.5">
              Throughline
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                V2
              </span>
            </h1>
            <p className="text-[11px] text-zinc-500 flex items-center gap-1">
              <span>with Lumie</span>
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
            </p>
          </div>
        </div>

        {/* Quick Action Button */}
        <button
          id="sidebar-new-reflection-btn"
          onClick={onNewReflection}
          className="w-full mb-3 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 font-medium text-xs transition-all shadow-sm active:scale-[0.98] min-h-[44px]"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Reflection</span>
        </button>

        {/* Multi-Device Sync Status */}
        <div className="px-2.5 py-1.5 rounded-lg bg-zinc-900/60 border border-zinc-800/60 mb-3 flex items-center justify-between text-[11px]">
          <span className="text-zinc-400 flex items-center gap-1.5 font-mono text-[10px]">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
            Cloud Synced
          </span>
          <span className="text-[10px] text-zinc-500 font-mono flex items-center gap-1">
            <Smartphone className="w-3 h-3 text-zinc-400" />
            All Devices
          </span>
        </div>

        {/* In-App PWA Install Banner */}
        <div className="mb-3">
          <PWAInstallButton />
        </div>

        {/* Grouped Navigation Links */}
        <nav className="flex-1 space-y-4 overflow-y-auto pr-1 text-xs custom-scrollbar">
          {sections.map((section) => (
            <div key={section.title} className="space-y-0.5">
              <p className="px-2.5 pb-1 text-[10px] font-mono tracking-wider uppercase text-zinc-500 font-semibold">
                {section.title}
              </p>
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    id={`nav-${item.id}`}
                    onClick={() => handleSelect(item.id)}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-zinc-800/90 text-zinc-100 shadow-inner'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
                    }`}
                  >
                    <Icon
                      className={`w-3.5 h-3.5 transition-colors ${
                        isActive ? 'text-indigo-400' : 'text-zinc-400'
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                    {item.badge && (
                      <span className="ml-auto text-[9px] px-1.5 py-0.2 rounded bg-indigo-950/80 text-indigo-300 border border-indigo-800/60">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* User Card & Logout */}
        <div className="pt-3 border-t border-zinc-800/80 mt-auto">
          <div className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-zinc-900/50">
            <div className="flex items-center gap-2 overflow-hidden">
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'User'}
                  className="w-7 h-7 rounded-full border border-zinc-700 object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800 flex items-center justify-center text-xs font-semibold">
                  {user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
                </div>
              )}
              <div className="truncate text-left">
                <p className="text-xs font-medium text-zinc-200 truncate">
                  {user?.displayName || 'Thinker'}
                </p>
                <p className="text-[10px] text-zinc-500 truncate">{user?.email}</p>
              </div>
            </div>

            <button
              id="sidebar-logout-btn"
              onClick={logout}
              title="Sign Out"
              className="p-1 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header
        id="mobile-header"
        className="lg:hidden sticky top-0 z-30 bg-zinc-950/90 border-b border-zinc-800/80 px-4 py-2.5 flex items-center justify-between backdrop-blur-md"
      >
        <div className="flex items-center gap-2">
          <div className="relative shrink-0 flex items-center justify-center p-0.5 rounded-lg bg-zinc-900 border border-indigo-500/30">
            <MindMascot mood="idle" size="xs" />
          </div>
          <div>
            <span className="font-semibold text-xs text-zinc-100 tracking-tight block">Throughline</span>
            <span className="text-[10px] text-teal-400 font-mono flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
              Synced &bull; Lumie Active
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <PWAInstallButton compact />
          <button
            id="mobile-new-reflection-btn"
            onClick={onNewReflection}
            className="flex items-center gap-1 min-h-[40px] px-3 rounded-lg bg-zinc-100 text-zinc-950 font-medium text-xs shadow-sm active:scale-95 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Write</span>
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle Navigation Menu"
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white transition-colors"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Mobile Full Menu Overlay */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-zinc-950/95 backdrop-blur-xl pt-16 pb-24 px-5 overflow-y-auto">
          <div className="max-w-md mx-auto space-y-5">
            {/* Multi-Device Install & Sync Info */}
            <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-300 font-medium flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-indigo-400" />
                  Multi-Device Workspace
                </span>
                <span className="text-[10px] font-mono text-teal-400 bg-teal-950/60 border border-teal-800/50 px-2 py-0.5 rounded-full">
                  Realtime Cloud Sync
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Access your thoughts and reflections seamlessly across iPhone, Android, iPad, Mac, and PC.
              </p>
              <div className="pt-1">
                <PWAInstallButton />
              </div>
            </div>

            {sections.map((section) => (
              <div key={section.title} className="space-y-1.5">
                <p className="text-[10px] font-mono tracking-wider uppercase text-zinc-500 font-semibold px-2">
                  {section.title}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleSelect(item.id)}
                        className={`flex items-center gap-2.5 px-3 min-h-[46px] rounded-xl text-xs font-medium transition-all ${
                          isActive
                            ? 'bg-zinc-800 text-zinc-100 border border-zinc-700 shadow-sm'
                            : 'bg-zinc-900/70 text-zinc-400 hover:text-zinc-200 border border-zinc-800/60'
                        }`}
                      >
                        <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-indigo-400' : 'text-zinc-400'}`} />
                        <span className="truncate">{item.label}</span>
                        {item.badge && (
                          <span className="ml-auto text-[9px] px-1.5 py-0.2 rounded bg-indigo-950/80 text-indigo-300 border border-indigo-800/60">
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            <div className="pt-4 border-t border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800 flex items-center justify-center text-xs font-semibold">
                  {user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="text-left">
                  <p className="text-xs font-medium text-zinc-200">{user?.displayName || 'User'}</p>
                  <p className="text-[10px] text-zinc-500 truncate max-w-[150px]">{user?.email}</p>
                </div>
              </div>
              <button
                onClick={logout}
                className="flex items-center gap-1.5 px-3 min-h-[40px] rounded-xl bg-zinc-900 text-rose-400 border border-rose-900/30 text-xs hover:bg-rose-950/30 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Quick Bar with Safe-Area insets */}
      <nav
        id="mobile-bottom-nav"
        style={{ paddingBottom: 'max(0.65rem, env(safe-area-inset-bottom))' }}
        className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-zinc-950/95 border-t border-zinc-800/90 px-2 pt-2 flex items-center justify-around backdrop-blur-lg shadow-lg"
      >
        <button
          onClick={() => handleSelect('home')}
          className={`flex flex-col items-center justify-center min-h-[44px] min-w-[48px] px-2 rounded-xl text-[10px] font-medium transition-colors ${
            currentTab === 'home' ? 'text-indigo-400 font-semibold' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Compass className="w-5 h-5 mb-0.5" />
          <span>Home</span>
        </button>
        <button
          onClick={() => handleSelect('journal')}
          className={`flex flex-col items-center justify-center min-h-[44px] min-w-[48px] px-2 rounded-xl text-[10px] font-medium transition-colors ${
            currentTab === 'journal' ? 'text-indigo-400 font-semibold' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <PenLine className="w-5 h-5 mb-0.5" />
          <span>Write</span>
        </button>
        <button
          onClick={() => handleSelect('ask-journal')}
          className={`flex flex-col items-center justify-center min-h-[44px] min-w-[48px] px-2 rounded-xl text-[10px] font-medium transition-colors ${
            currentTab === 'ask-journal' ? 'text-indigo-400 font-semibold' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Search className="w-5 h-5 mb-0.5" />
          <span>Ask</span>
        </button>
        <button
          onClick={() => handleSelect('thinking-map')}
          className={`flex flex-col items-center justify-center min-h-[44px] min-w-[48px] px-2 rounded-xl text-[10px] font-medium transition-colors ${
            currentTab === 'thinking-map' ? 'text-indigo-400 font-semibold' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Network className="w-5 h-5 mb-0.5" />
          <span>Map</span>
        </button>
        <button
          onClick={() => handleSelect('decisions')}
          className={`flex flex-col items-center justify-center min-h-[44px] min-w-[48px] px-2 rounded-xl text-[10px] font-medium transition-colors ${
            currentTab === 'decisions' ? 'text-indigo-400 font-semibold' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Scale className="w-5 h-5 mb-0.5" />
          <span>Decide</span>
        </button>
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="flex flex-col items-center justify-center min-h-[44px] min-w-[48px] px-2 rounded-xl text-[10px] font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <Menu className="w-5 h-5 mb-0.5" />
          <span>All</span>
        </button>
      </nav>
    </>
  );
}
