import React, { useState } from 'react';
import { Download, Share, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'button' | 'menuItem';
  onActionComplete?: () => void;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'button',
  onActionComplete,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) return null;
  if (!isInstallable && !isIOS) return null;

  const handleClick = async () => {
    if (isInstallable) {
      await install();
      onActionComplete?.();
    } else if (isIOS) {
      setShowIOSGuide(true);
    }
  };

  return (
    <>
      {variant === 'menuItem' ? (
        <button
          type="button"
          role="menuitem"
          onClick={handleClick}
          className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left text-cyan-200 hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <Smartphone className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>{isIOS ? 'Aggiungi a Home (iOS)' : 'Installa App'}</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={handleClick}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-cyan-950/70 hover:bg-cyan-900/80 border border-cyan-500/40 text-cyan-200 transition-colors whitespace-nowrap cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
          <span>{isIOS ? 'Aggiungi a Home' : 'Installa App'}</span>
        </button>
      )}

      {showIOSGuide && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Installa Vexillum su iPhone o iPad"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4"
          onClick={() => setShowIOSGuide(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-xl bg-[#0D1524] border border-slate-700/80 shadow-2xl p-5 space-y-4"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-cyan-400 shrink-0" />
                <h3 className="font-display text-xl font-bold tracking-wide text-slate-50 leading-none">
                  Installa su iOS
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                aria-label="Chiudi"
                className="p-1.5 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <ol className="space-y-2.5 text-xs text-slate-300 leading-relaxed list-decimal pl-4">
              <li className="whitespace-normal">
                Tocca il pulsante{' '}
                <strong className="inline-flex items-center gap-1 text-cyan-300">
                  Condividi <Share className="w-3 h-3 inline" />
                </strong>{' '}
                nella barra inferiore di Safari.
              </li>
              <li className="whitespace-normal">
                Scorri il menu e seleziona{' '}
                <strong className="text-amber-300">Aggiungi alla schermata Home</strong>.
              </li>
              <li className="whitespace-normal">
                Conferma toccando <strong className="text-slate-100">Aggiungi</strong> per avviare{' '}
                <strong>Vexillum</strong> a schermo intero come un’app nativa.
              </li>
            </ol>

            <button
              type="button"
              onClick={() => {
                setShowIOSGuide(false);
                onActionComplete?.();
              }}
              className="w-full py-2.5 rounded-md text-xs font-semibold bg-amber-400 hover:bg-amber-300 text-slate-950 transition-colors cursor-pointer"
            >
              Ho Capito
            </button>
          </div>
        </div>
      )}
    </>
  );
};
