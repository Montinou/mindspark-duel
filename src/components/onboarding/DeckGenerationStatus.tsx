'use client';

import { motion } from 'framer-motion';
import { Sparkles, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { checkDeckStatus } from '@/app/actions/user';
import { Progress } from '@/components/ui/progress';

// Generation status interface (ONB-05)
interface GenerationStatus {
  status: string;
  total: number;
  completed: number;
  failed: number;
  current?: string; // Name of card being generated
}

// Constants (ONB-07)
const POLL_INTERVAL = 5000; // 5s (reduced from 2s)
const MAX_POLL_TIME = 10 * 60 * 1000; // 10 minutes max
const AVG_SECONDS_PER_CARD = 8; // ~8s per card for ETA

export function DeckGenerationStatus() {
  const router = useRouter();
  const [status, setStatus] = useState<GenerationStatus>({
    status: 'generating',
    total: 20,
    completed: 0,
    failed: 0,
  });
  const [error, setError] = useState<string | null>(null);
  const [shouldRedirect, setShouldRedirect] = useState(false);

  // Separate effect for redirect to avoid router dependency in polling
  useEffect(() => {
    if (shouldRedirect) {
      const timeout = setTimeout(() => {
        router.push('/dashboard');
      }, 1500);
      return () => clearTimeout(timeout);
    }
  }, [shouldRedirect, router]);

  useEffect(() => {
    const startTime = Date.now();

    const interval = setInterval(async () => {
      // Timeout check (ONB-07)
      if (Date.now() - startTime > MAX_POLL_TIME) {
        clearInterval(interval);
        setError('La generacion esta tomando mas tiempo del esperado. Por favor recarga la pagina.');
        return;
      }

      try {
        const result = await checkDeckStatus();

        if (result.status === 'completed' || result.status === 'completed_with_errors') {
          clearInterval(interval);
          setStatus({
            status: result.status,
            total: result.total || 20,
            completed: result.completed || 20,
            failed: result.failed || 0,
          });
          setShouldRedirect(true);
        } else {
          setStatus({
            status: result.status || 'generating',
            total: result.total || 20,
            completed: result.completed || 0,
            failed: result.failed || 0,
            current: result.current,
          });
        }
      } catch (err) {
        console.error("Failed to check deck status:", err);
      }
    }, POLL_INTERVAL);

    // Initial fetch immediately
    checkDeckStatus().then(result => {
      if (result.status === 'completed' || result.status === 'completed_with_errors') {
        setStatus({
          status: result.status,
          total: result.total || 20,
          completed: result.completed || 20,
          failed: result.failed || 0,
        });
        setShouldRedirect(true);
        clearInterval(interval);
      } else {
        setStatus({
          status: result.status || 'generating',
          total: result.total || 20,
          completed: result.completed || 0,
          failed: result.failed || 0,
          current: result.current,
        });
      }
    }).catch(console.error);

    return () => clearInterval(interval);
  }, []); // Empty array - runs only once

  const { total, completed, failed, current } = status;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
  const remaining = total - completed;
  const eta = Math.ceil(remaining * AVG_SECONDS_PER_CARD);
  const isCompleted = status.status === 'completed' || status.status === 'completed_with_errors';

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <div className="mb-6 p-4 rounded-full bg-red-500/20">
          <AlertTriangle className="text-red-400" size={48} />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Tiempo Excedido</h2>
        <p className="text-zinc-400 max-w-md mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-colors"
        >
          Recargar Pagina
        </button>
      </div>
    );
  }

  // Completed state
  if (isCompleted) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="mb-6 p-4 rounded-full bg-green-500/20"
        >
          <CheckCircle2 className="text-green-400" size={48} />
        </motion.div>
        <h2 className="text-2xl font-bold text-white mb-2">Mazo Listo!</h2>
        <p className="text-zinc-400 max-w-md mb-4">
          {failed > 0
            ? `${completed - failed} cartas generadas exitosamente. ${failed} carta(s) usaran alternativas.`
            : `Las ${completed} cartas de tu mazo estan listas para jugar.`
          }
        </p>
        <p className="text-sm text-zinc-500">Redirigiendo al dashboard...</p>
      </div>
    );
  }

  // Generating state (default)
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        className="mb-6 relative"
      >
        <div className="w-24 h-24 rounded-full border-4 border-blue-500/30 border-t-blue-500" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Sparkles className="text-blue-400 animate-pulse" size={32} />
        </div>
      </motion.div>

      <h2 className="text-2xl font-bold text-white mb-2">Creando Tu Mazo</h2>
      <p className="text-zinc-400 max-w-md mb-6">
        La IA esta generando cartas unicas para tu mazo. Este proceso asegura que cada carta sea especial.
      </p>

      {/* Progress info (ONB-05) */}
      <div className="w-full max-w-md space-y-3">
        <p className="text-lg font-medium text-white">
          {completed} de {total} cartas
        </p>

        {current && (
          <p className="text-sm text-blue-400">
            Generando: {current}...
          </p>
        )}

        <Progress value={progress} className="h-2" />

        <div className="flex justify-between text-xs text-zinc-500">
          <span>
            {remaining > 0 ? `~${eta}s restantes` : 'Finalizando...'}
          </span>
          <span>{progress}%</span>
        </div>

        {failed > 0 && (
          <div className="flex items-center gap-2 text-sm text-yellow-500 bg-yellow-500/10 rounded-lg p-2">
            <AlertTriangle size={16} />
            <span>{failed} carta(s) con error (se usaran alternativas)</span>
          </div>
        )}
      </div>
    </div>
  );
}
