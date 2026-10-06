import { DeepVoidBackground } from '../components/DeepVoidBackground'
import { AlertCircle, Home } from 'lucide-react'

export function PageNotFound() {
    return (
        <DeepVoidBackground className="flex items-center justify-center text-center p-4">
            <div className="bg-white border border-slate-200 shadow-xl p-8 rounded-2xl max-w-md w-full relative overflow-hidden group">
                <div className="relative z-10 flex flex-col items-center gap-6">
                    <div className="relative">
                        <AlertCircle size={64} className="text-nofx-danger relative z-10" />
                    </div>

                    <div className="space-y-2">
                        <h1 className="text-4xl font-bold font-mono tracking-tighter text-slate-900">
                            404
                        </h1>
                        <div className="text-xs uppercase tracking-[0.3em] text-nofx-danger font-mono border-b border-nofx-danger/30 pb-2 inline-block">
                            SIGNAL_LOST
                        </div>
                    </div>

                    <p className="text-sm text-nofx-text-muted font-mono leading-relaxed">
                        The requested coordinates do not exist in the current sector. The page may have been moved, deleted, or never existed in this timeline.
                    </p>

                    <a
                        href="/"
                        className="flex items-center gap-2 px-6 py-3 bg-nofx-gold text-white font-bold text-sm uppercase tracking-widest rounded-lg hover:opacity-90 transition-all shadow-sm group mt-4"
                    >
                        <Home size={16} />
                        <span>RETURN_HOME</span>
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity -ml-2 group-hover:ml-0">-&gt;</span>
                    </a>
                </div>
            </div>
        </DeepVoidBackground>
    )
}
