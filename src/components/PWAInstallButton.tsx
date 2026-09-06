import { useState } from 'react';
import { Download, Smartphone, Share, X, Check, Laptop } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  compact?: boolean;
}

export function PWAInstallButton({ compact = false }: PWAInstallButtonProps) {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [installedNotice, setInstalledNotice] = useState(false);

  if (isInstalled) {
    return (
      <div className={`flex items-center gap-1.5 text-xs text-teal-400/90 font-mono ${compact ? 'px-2 py-1' : 'px-3 py-2'} rounded-lg bg-teal-950/30 border border-teal-800/40`}>
        <Check className="w-3.5 h-3.5" />
        <span>Installed App</span>
      </div>
    );
  }

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSGuide(true);
      return;
    }
    if (isInstallable) {
      const success = await install();
      if (success) {
        setInstalledNotice(true);
        setTimeout(() => setInstalledNotice(false), 4000);
      }
    } else {
      // Browser didn't trigger beforeinstallprompt yet (or desktop Safari / Firefox)
      setShowIOSGuide(true);
    }
  };

  return (
    <>
      <button
        id="pwa-install-app-btn"
        onClick={handleInstallClick}
        className={`flex items-center justify-center gap-2 rounded-xl font-medium transition-all ${
          compact
            ? 'px-2.5 py-1.5 text-xs bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30'
            : 'w-full px-3 py-2 text-xs bg-gradient-to-r from-indigo-600/20 to-teal-600/20 hover:from-indigo-600/30 hover:to-teal-600/30 text-indigo-200 border border-indigo-500/40 shadow-sm'
        }`}
        title="Install Throughline on this device"
      >
        <Download className="w-3.5 h-3.5 text-indigo-400" />
        <span>{compact ? 'Install' : 'Install on This Device'}</span>
      </button>

      {/* Guidance Modal for iOS or manual install */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-700/80 rounded-2xl max-w-sm w-full p-5 space-y-4 text-zinc-200 shadow-2xl relative">
            <button
              onClick={() => setShowIOSGuide(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-zinc-100">Multi-Device Installation</h3>
                <p className="text-xs text-zinc-400">Use Throughline as a native app</p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-zinc-300 bg-zinc-950/60 p-3.5 rounded-xl border border-zinc-800/80">
              <p className="font-medium text-zinc-200">For iPhone & iPad (Safari):</p>
              <ol className="list-decimal list-inside space-y-2 text-zinc-400 leading-relaxed">
                <li>
                  Tap the <strong className="text-zinc-200 inline-flex items-center gap-1"><Share className="w-3 h-3 inline" /> Share</strong> icon in the browser toolbar.
                </li>
                <li>
                  Scroll down and tap <strong className="text-zinc-200">"Add to Home Screen"</strong>.
                </li>
                <li>
                  Tap <strong className="text-zinc-200">Add</strong> in the top right corner.
                </li>
              </ol>

              <div className="pt-2 border-t border-zinc-800/80">
                <p className="font-medium text-zinc-200">For Android & Chrome Desktop:</p>
                <p className="text-zinc-400 mt-1">
                  Tap the browser menu (three dots) and select <strong className="text-zinc-200">"Install app"</strong> or <strong className="text-zinc-200">"Add to Home screen"</strong>.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-zinc-500 flex items-center gap-1">
                <Laptop className="w-3 h-3" />
                Works offline & syncs to cloud
              </span>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-white transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {installedNotice && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-emerald-950 border border-emerald-700 text-emerald-200 px-4 py-2 rounded-xl text-xs flex items-center gap-2 shadow-xl">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>Throughline successfully installed!</span>
        </div>
      )}
    </>
  );
}
