import { useState } from 'react';
import {
  Sparkles,
  Shield,
  Bot,
  Network,
  ArrowRight,
  BrainCircuit,
  Lock,
  Compass,
  CheckCircle2,
  Cpu,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from './Toast';

export default function LandingPage() {
  const { login } = useAuth();
  const { toast } = useToast();
  const [signingIn, setSigningIn] = useState(false);

  const handleSignIn = async () => {
    setSigningIn(true);
    try {
      await login();
    } catch (err: any) {
      console.error(err);
      toast(err?.message || 'Authentication was interrupted. Please try again.', 'error');
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <div id="landing-container" className="min-h-screen bg-zinc-950 text-zinc-100 selection:bg-indigo-500/30">
      {/* Navigation Bar */}
      <header className="border-b border-zinc-800/60 backdrop-blur-md sticky top-0 z-40 bg-zinc-950/80">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500/20 to-teal-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-300">
              <Sparkles className="w-4 h-4 text-indigo-400" />
            </div>
            <span className="font-semibold tracking-tight text-lg text-zinc-100">Throughline</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-zinc-400 bg-zinc-900/80 border border-zinc-800 px-3 py-1.5 rounded-full">
              <Lock className="w-3 h-3 text-emerald-400" />
              <span>Isolated User-Scoped Data</span>
            </div>

            <button
              id="landing-signin-nav-btn"
              onClick={handleSignIn}
              disabled={signingIn}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 font-medium text-xs tracking-wide transition-all shadow-sm hover:shadow active:scale-95 disabled:opacity-50"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{signingIn ? 'Signing in...' : 'Sign In with Google'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-20 pb-16 px-6 max-w-5xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-950/70 border border-indigo-800/60 text-indigo-300 text-xs font-medium mb-6">
          <BrainCircuit className="w-3.5 h-3.5 text-indigo-400" />
          <span>Private AI-Powered Personal Reflection Workspace</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-zinc-100 max-w-3xl mx-auto leading-[1.15]">
          Think. Write. Reflect.{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-teal-200 to-sky-300">
            Move Forward.
          </span>
        </h1>

        <p className="mt-6 text-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed">
          Throughline is not another generic chatbot or static notes app. Write freely, unpack complex problems with an
          intelligent thinking companion, recognize recurring patterns over time, and turn reflection into meaningful action.
        </p>

        {/* Primary CTA */}
        <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            id="landing-hero-cta"
            onClick={handleSignIn}
            disabled={signingIn}
            className="w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-3.5 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 font-semibold text-sm transition-all shadow-md hover:shadow-lg active:scale-95 disabled:opacity-50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Start Reflecting with Google</span>
            <ArrowRight className="w-4 h-4 text-zinc-600" />
          </button>

          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <CheckCircle2 className="w-4 h-4 text-teal-400" />
            <span>No passwords stored &bull; Private Firestore isolation</span>
          </div>
        </div>

        {/* Live Product Preview Mockup */}
        <div className="mt-14 p-3 rounded-2xl bg-gradient-to-b from-zinc-800/80 to-zinc-900/40 border border-zinc-800 shadow-2xl">
          <div className="rounded-xl bg-zinc-950 border border-zinc-800/90 overflow-hidden text-left p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Mock: The Reflection Workspace */}
            <div className="lg:col-span-7 bg-zinc-900/40 rounded-xl p-6 border border-zinc-800/80 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800 text-xs text-zinc-400">
                  <span className="font-mono text-emerald-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Saved just now
                  </span>
                  <span>September 5, 2026 &bull; 142 words</span>
                </div>
                <h3 className="text-xl font-semibold text-zinc-100 mt-4">
                  Navigating the career crossroads: burnout vs. true misalignment
                </h3>
                <div className="flex gap-2 mt-3">
                  <span className="px-2 py-0.5 rounded text-xs bg-indigo-950/60 text-indigo-300 border border-indigo-800/50">
                    Career
                  </span>
                  <span className="px-2 py-0.5 rounded text-xs bg-zinc-800 text-zinc-300 border border-zinc-700">
                    Clarity
                  </span>
                  <span className="px-2 py-0.5 rounded text-xs bg-teal-950/60 text-teal-300 border border-teal-800/50">
                    Mood: Neutral
                  </span>
                </div>
                <p className="mt-4 text-sm text-zinc-300 leading-relaxed font-serif">
                  "I've been thinking about changing my career path, but I'm not sure whether I'm genuinely unhappy with
                  the craft itself or simply drained from an unsustainable sprint cycle. When I actually solve hard
                  technical problems in silence, I feel alive. It is the administrative ambiguity and endless alignment
                  meetings that leave me depleted..."
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-400">
                <span>Core Mode: Actionable Reflection</span>
                <span className="text-indigo-400 font-medium">Prompt: Today's Decision Paradox</span>
              </div>
            </div>

            {/* Right Mock: The AI Companion */}
            <div className="lg:col-span-5 bg-zinc-900/70 rounded-xl p-5 border border-zinc-800/80 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 pb-3 border-b border-zinc-800">
                  <div className="w-5 h-5 rounded-md bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                    <Sparkles className="w-3 h-3" />
                  </div>
                  <span className="text-xs font-semibold text-zinc-200">AI Thinking Companion</span>
                  <span className="ml-auto text-[10px] px-2 py-0.5 rounded bg-indigo-900/40 text-indigo-300 border border-indigo-700/50 font-mono">
                    CHALLENGE MODE
                  </span>
                </div>

                <div className="mt-4 space-y-3 text-xs leading-relaxed text-zinc-300">
                  <div className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/60">
                    <p className="font-semibold text-zinc-200 mb-1">Key Distinction Identified:</p>
                    <p className="text-zinc-400">
                      You distinguish between the <span className="text-zinc-200 font-medium">craft</span> (which
                      energizes you) and the <span className="text-zinc-200 font-medium">operational friction</span> (which
                      depletes you).
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-indigo-950/30 border border-indigo-800/40">
                    <p className="font-semibold text-indigo-200 mb-1">Catalytic Question:</p>
                    <p className="text-indigo-300/90">
                      "If you could protect 4 hours of uninterrupted deep work every morning, would you still feel the urge
                      to leave, or is the company's culture fundamentally incompatible with how you do your best work?"
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-zinc-800 flex items-center justify-between text-[11px] text-zinc-400">
                <span>Gemini 3.6 Flash Engine</span>
                <span className="text-teal-400 font-medium">Turn thoughts into action &rarr;</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Workflow Section */}
      <section className="py-16 px-6 border-t border-zinc-900 bg-zinc-950/60">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-xs uppercase tracking-widest font-mono text-indigo-400 mb-2">The Architecture of Clarity</h2>
            <p className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-100">
              The 5-Stage Reflection Cycle
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {[
              { step: '01', title: 'WRITE', desc: 'Dump thoughts freely into a serene, distraction-free canvas.' },
              { step: '02', title: 'REFLECT', desc: 'Unpack nuances and uncover underlying assumptions with AI companion modes.' },
              { step: '03', title: 'EXPLORE', desc: 'Diverge into possibilities, brainstorm angles, or challenge blind spots.' },
              { step: '04', title: 'UNDERSTAND', desc: 'Discover recurring themes through the visual Thinking Map over time.' },
              { step: '05', title: 'ACT', desc: 'Synthesize reflections into concrete next steps, goals, and weekly reviews.' },
            ].map((st, i) => (
              <div
                key={st.step}
                className="p-5 rounded-xl bg-zinc-900/40 border border-zinc-800/70 hover:border-zinc-700 transition-colors flex flex-col justify-between"
              >
                <div>
                  <span className="font-mono text-xs text-indigo-400 font-bold">{st.step}</span>
                  <h3 className="text-base font-semibold text-zinc-100 mt-2">{st.title}</h3>
                  <p className="text-xs text-zinc-400 mt-2 leading-relaxed">{st.desc}</p>
                </div>
                {i < 4 && (
                  <div className="hidden md:flex justify-end pt-3 text-zinc-700">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Highlights (Four Pillars) */}
      <section className="py-20 px-6 max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-xs uppercase tracking-widest font-mono text-teal-400 mb-2">Product Philosophy</h2>
          <p className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-100">
            Engineered for Deep Reflection, Not Surface Chatter
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Pillar 1 */}
          <div className="p-8 rounded-2xl bg-zinc-900/40 border border-zinc-800 flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-emerald-950/60 border border-emerald-800/60 flex items-center justify-center text-emerald-400 mb-5">
                <Shield className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold text-zinc-100">PRIVATE BY DEFAULT</h3>
              <p className="text-sm font-medium text-emerald-400/90 mt-1">Your journal belongs to you.</p>
              <p className="mt-3 text-sm text-zinc-400 leading-relaxed">
                Every reflection is isolated strictly to your authenticated Firebase UID. Cloud Firestore security rules
                guarantee that another user cannot read, query, or mutate your inner thoughts. Zero passwords stored.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-zinc-800/70 text-xs font-mono text-zinc-500">
              request.auth.uid == userId
            </div>
          </div>

          {/* Pillar 2 */}
          <div className="p-8 rounded-2xl bg-zinc-900/40 border border-zinc-800 flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-indigo-950/60 border border-indigo-800/60 flex items-center justify-center text-indigo-400 mb-5">
                <Bot className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold text-zinc-100">THINK WITH AI</h3>
              <p className="text-sm font-medium text-indigo-400/90 mt-1">Explore thoughts through conversation.</p>
              <p className="mt-3 text-sm text-zinc-400 leading-relaxed">
                6 specialized modes: Reflect, Summarize, Brainstorm, Challenge, Action, and Questions. The AI stays anchored
                to your current entry and conversation memory, offering perspective rather than clinical diagnoses.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-zinc-800/70 text-xs font-mono text-zinc-500">
              Multi-Turn Memory &bull; Gemini 3.6 Flash Fallback Ladder
            </div>
          </div>

          {/* Pillar 3 */}
          <div className="p-8 rounded-2xl bg-zinc-900/40 border border-zinc-800 flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-sky-950/60 border border-sky-800/60 flex items-center justify-center text-sky-400 mb-5">
                <Network className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold text-zinc-100">SEE THE PATTERNS</h3>
              <p className="text-sm font-medium text-sky-400/90 mt-1">Signature Thinking Map visualization.</p>
              <p className="mt-3 text-sm text-zinc-400 leading-relaxed">
                Throughline synthesizes your entries across weeks to extract recurring thematic clusters, lingering
                unresolved questions, and emotional weight without pretending psychological certainty.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-zinc-800/70 text-xs font-mono text-zinc-500">
              Interactive Thematic Graph &bull; Longitudinal Synthesis
            </div>
          </div>

          {/* Pillar 4 */}
          <div className="p-8 rounded-2xl bg-zinc-900/40 border border-zinc-800 flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-teal-950/60 border border-teal-800/60 flex items-center justify-center text-teal-400 mb-5">
                <Compass className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold text-zinc-100">TURN THOUGHTS INTO ACTION</h3>
              <p className="text-sm font-medium text-teal-400/90 mt-1">Convert reflection into practical momentum.</p>
              <p className="mt-3 text-sm text-zinc-400 leading-relaxed">
                Connect journal entries directly to active personal goals. Leverage AI to evaluate observed momentum and
                blockers, and generate an automated 7-pillar Weekly Review to start each Monday clear.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-zinc-800/70 text-xs font-mono text-zinc-500">
              Goal Feedback &bull; 7-Pillar Weekly Synthesis
            </div>
          </div>
        </div>
      </section>

      {/* Responsible AI Banner */}
      <section className="py-12 px-6 border-t border-zinc-900 bg-zinc-950/80">
        <div className="max-w-4xl mx-auto p-6 rounded-xl bg-zinc-900/30 border border-zinc-800 text-center">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-300 mb-2">
            <Cpu className="w-4 h-4 text-indigo-400" />
            <span>Responsible & Calm AI Philosophy</span>
          </div>
          <p className="text-xs text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            Throughline is designed as a productivity and cognitive clarity instrument. It is not a therapist, counselor, or
            medical diagnostic tool. We do not make clinical diagnoses or psychological claims. Your entries remain strictly
            your personal private intellectual property.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-zinc-900 text-center text-xs text-zinc-600">
        <div className="flex items-center justify-center gap-2 mb-2 text-zinc-400">
          <Sparkles className="w-4 h-4 text-indigo-400" />
          <span className="font-semibold text-zinc-300">Throughline</span>
          <span>&mdash; Think. Write. Reflect. Move Forward.</span>
        </div>
        <p>&copy; {new Date().getFullYear()} Throughline Inc. Secured with Google Cloud Run & Firebase.</p>
      </footer>
    </div>
  );
}
