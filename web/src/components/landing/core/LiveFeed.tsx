import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'

interface LogEntry {
    id: number
    time: string
    type: string
    msg: string
    color: string
}

const generateLog = (id: number): LogEntry => {
    const types = ['EXE', 'ARB', 'LIQ', 'NET', 'SYS']
    const pairs = ['BTC-USDT', 'ETH-PERP', 'SOL-USDT', 'BNB-BUSD']
    const actions = ['BUY', 'SELL', 'SHORT', 'LONG']
    const type = types[Math.floor(Math.random() * types.length)]

    let msg = ''
    let color = ''

    switch (type) {
        case 'EXE':
            msg = `BOT-${Math.floor(Math.random() * 99)} ${actions[Math.floor(Math.random() * 4)]} ${pairs[Math.floor(Math.random() * 4)]} @ ${Math.floor(Math.random() * 60000)}`
            color = 'text-green-500'
            break;
        case 'ARB':
            msg = `Spread detected: BINANCE <> BYBIT (${(Math.random()).toFixed(3)}%)`
            color = 'text-nofx-gold'
            break;
        case 'LIQ':
            msg = `Liquidation Alert: ${pairs[Math.floor(Math.random() * 4)]} $${Math.floor(Math.random() * 100)}k REKT`
            color = 'text-red-500'
            break;
        case 'NET':
            msg = `Block propagation latency < ${Math.floor(Math.random() * 10)}ms`
            color = 'text-zinc-500'
            break;
        default:
            msg = `System optimization cycle complete. Allocating resources.`
            color = 'text-blue-400'
    }

    return { id, time: new Date().toLocaleTimeString('en-US', { hour12: false }) + '.' + Math.floor(Math.random() * 999), type, msg, color }
}

export default function LiveFeed() {
    const [logs, setLogs] = useState<LogEntry[]>([])

    useEffect(() => {
        // Initial population
        const initialLogs = Array.from({ length: 8 }).map((_, i) => generateLog(i))
        setLogs(initialLogs)

        const interval = setInterval(() => {
            setLogs(prev => {
                const newLog = generateLog(Date.now())
                return [newLog, ...prev.slice(0, 7)]
            })
        }, 800) // Fast 800ms updates for HFT feel

        return () => clearInterval(interval)
    }, [])

    return (
        <section className="w-full bg-white border-y border-[#E2E8F0] py-2 overflow-hidden relative shadow-sm">
            <div className="max-w-[1920px] mx-auto px-6 flex flex-col md:flex-row gap-0 md:gap-8 items-stretch h-[240px] md:h-10 text-xs font-mono">

                {/* Left Status Bar (Static) */}
                <div className="hidden md:flex items-center gap-6 text-slate-500 border-r border-[#E2E8F0] pr-6 shrink-0">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                        <span className="font-bold text-slate-700 text-xs">WS_CONN: STABLE</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-blue-600 font-bold">TPS: 48,291</span>
                    </div>
                </div>

                {/* Right Scrolling Log - Vertical on mobile, Single line ticker on Desktop */}
                <div className="flex-1 overflow-hidden relative font-mono text-[11px] md:text-xs h-full flex items-center">

                    {/* Desktop View: Single Line Fade */}
                    <div className="hidden md:block w-full h-full relative">
                        {logs.slice(0, 1).map((log) => (
                            <motion.div
                                key={log.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="absolute inset-0 flex items-center gap-3"
                            >
                                <span className="text-slate-400 font-mono">[{log.time}]</span>
                                <span className={`font-bold w-12 text-center text-[10px] rounded ${
                                    log.type === 'LIQ' ? 'text-red-600 bg-red-50 border border-red-200' :
                                    log.type === 'ARB' ? 'text-blue-600 bg-blue-50 border border-blue-200' :
                                    log.type === 'EXE' ? 'text-emerald-600 bg-emerald-50 border border-emerald-200' :
                                    'text-slate-600 bg-slate-100 border border-slate-200'
                                }`}>{log.type}</span>
                                <span className="text-slate-700 font-medium">{log.msg}</span>
                            </motion.div>
                        ))}
                    </div>

                    {/* Mobile View: Vertical Stack */}
                    <div className="md:hidden flex flex-col gap-2 w-full p-2 h-full overflow-hidden">
                        {logs.map((log) => (
                            <div key={log.id} className="flex gap-2 w-full truncate border-b border-[#F1F5F9] pb-1 last:border-0 items-center">
                                <span className="text-slate-400 w-16 shrink-0 text-[10px]">{log.time.split('.')[0]}</span>
                                <span className={`font-bold w-10 text-center text-[9px] shrink-0 rounded ${
                                    log.type === 'LIQ' ? 'text-red-600 bg-red-50' :
                                    log.type === 'ARB' ? 'text-blue-600 bg-blue-50' :
                                    log.type === 'EXE' ? 'text-emerald-600 bg-emerald-50' :
                                    'text-slate-600 bg-slate-100'
                                }`}>{log.type}</span>
                                <span className="text-slate-700 truncate">{log.msg}</span>
                            </div>
                        ))}
                    </div>

                </div>

            </div>
        </section>
    )
}
