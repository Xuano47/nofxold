import { motion } from 'framer-motion'

export default function AgentTerminal() {
    return (
        <motion.div
            initial={{ opacity: 0, y: 30, rotate: 0 }}
            animate={{ opacity: 1, y: 0, rotate: 2 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="w-[380px] lg:w-[440px] relative group"
        >
            {/* Terminal frame */}
            <div className="relative bg-white rounded-2xl overflow-hidden shadow-xl border border-[#E2E8F0]">

                {/* Header bar - macOS style */}
                <div className="flex items-center justify-between px-4 py-2.5 bg-[#F8FAFC] border-b border-[#E2E8F0]">
                    {/* Window controls */}
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-[#ff5f57] hover:brightness-110 transition-all" />
                            <div className="w-3 h-3 rounded-full bg-[#febc2e] hover:brightness-110 transition-all" />
                            <div className="w-3 h-3 rounded-full bg-[#28c840] hover:brightness-110 transition-all" />
                        </div>
                    </div>
                    {/* Title */}
                    <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
                        <span className="text-slate-700 text-xs font-mono font-bold">Bunny Trade Terminal</span>
                    </div>
                    {/* Live indicator */}
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                        <span className="text-emerald-600 text-[10px] font-mono font-semibold uppercase tracking-wider">Live</span>
                    </div>
                </div>

                {/* Portfolio PnL Section */}
                <div className="p-4 border-b border-[#E2E8F0] bg-white">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-slate-400 text-xs font-mono uppercase tracking-wider font-semibold">Portfolio PnL</span>
                        <div className="flex gap-1">
                            <button className="px-2 py-0.5 bg-blue-50 border border-blue-200 rounded text-[10px] text-blue-600 font-mono font-bold">24H</button>
                            <button className="px-2 py-0.5 text-[10px] text-slate-500 font-mono hover:text-slate-800 transition-colors">7D</button>
                            <button className="px-2 py-0.5 text-[10px] text-slate-500 font-mono hover:text-slate-800 transition-colors">30D</button>
                        </div>
                    </div>
                    <div className="flex items-baseline gap-3">
                        <span className="text-3xl font-extrabold text-emerald-600 font-mono tracking-tight">+$12,847.50</span>
                        <span className="text-emerald-600 text-sm font-mono font-semibold">+8.42%</span>
                    </div>

                    {/* Chart Area */}
                    <div className="mt-3 h-16 rounded-lg overflow-hidden relative">
                        <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 400 64">
                            <defs>
                                <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                    <stop offset="0%" stopColor="#16A34A" stopOpacity="0.25" />
                                    <stop offset="100%" stopColor="#16A34A" stopOpacity="0" />
                                </linearGradient>
                            </defs>
                            <path
                                d="M0,56 C40,52 80,48 120,40 C160,32 200,28 240,24 C280,20 320,16 360,12 L400,8 L400,64 L0,64 Z"
                                fill="url(#chartGradient)"
                            />
                            <path
                                d="M0,56 C40,52 80,48 120,40 C160,32 200,28 240,24 C280,20 320,16 360,12 L400,8"
                                fill="none"
                                stroke="#16A34A"
                                strokeWidth="2"
                            />
                        </svg>
                    </div>
                </div>

                {/* Metrics Row */}
                <div className="grid grid-cols-3 divide-x divide-[#E2E8F0] border-b border-[#E2E8F0] bg-[#F8FAFC]">
                    <div className="p-3 text-center">
                        <div className="text-slate-400 text-[10px] font-mono uppercase tracking-wider mb-1 font-semibold">OI</div>
                        <div className="text-slate-900 font-bold font-mono">$847M</div>
                        <div className="text-emerald-600 text-[10px] font-mono font-semibold">↑ 2.1%</div>
                    </div>
                    <div className="p-3 text-center">
                        <div className="text-slate-400 text-[10px] font-mono uppercase tracking-wider mb-1 font-semibold">Netflow</div>
                        <div className="text-emerald-600 font-bold font-mono">+$124M</div>
                        <div className="text-slate-400 text-[10px] font-mono">24h inflow</div>
                    </div>
                    <div className="p-3 text-center">
                        <div className="text-slate-400 text-[10px] font-mono uppercase tracking-wider mb-1 font-semibold">L/S Ratio</div>
                        <div className="text-slate-900 font-bold font-mono">1.24</div>
                        <div className="flex gap-0.5 mt-1 px-2">
                            <div className="h-1 bg-emerald-500 rounded-l flex-[55]" />
                            <div className="h-1 bg-red-400 rounded-r flex-[45]" />
                        </div>
                    </div>
                </div>

                {/* Order Book */}
                <div className="p-4 border-b border-[#E2E8F0] bg-white">
                    <div className="flex items-center justify-between mb-2.5">
                        <span className="text-slate-700 text-xs font-mono font-bold uppercase tracking-wider">Order Book</span>
                        <span className="text-slate-400 text-[10px] font-mono">Spread: <span className="text-blue-600 font-bold">0.02%</span></span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        {/* Asks */}
                        <div className="space-y-1">
                            {[
                                { price: '97,289.50', amount: '2.451', depth: 70 },
                                { price: '97,267.00', amount: '1.832', depth: 55 },
                                { price: '97,251.00', amount: '0.945', depth: 30 },
                            ].map((ask, i) => (
                                <div key={i} className="relative flex justify-between text-[11px] py-1 px-1.5 rounded">
                                    <div className="absolute inset-0 bg-red-50 rounded-sm" style={{ width: `${ask.depth}%` }} />
                                    <span className="relative text-red-600 font-mono font-semibold">{ask.price}</span>
                                    <span className="relative text-slate-500 font-mono">{ask.amount}</span>
                                </div>
                            ))}
                        </div>
                        {/* Bids */}
                        <div className="space-y-1">
                            {[
                                { price: '97,244.50', amount: '3.127', depth: 85 },
                                { price: '97,221.00', amount: '4.592', depth: 100 },
                                { price: '97,198.00', amount: '1.845', depth: 50 },
                            ].map((bid, i) => (
                                <div key={i} className="relative flex justify-between text-[11px] py-1 px-1.5 rounded">
                                    <div className="absolute inset-0 bg-emerald-50 rounded-sm" style={{ width: `${bid.depth}%` }} />
                                    <span className="relative text-emerald-600 font-mono font-semibold">{bid.price}</span>
                                    <span className="relative text-slate-500 font-mono">{bid.amount}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Active Positions */}
                <div className="p-4 bg-white">
                    <div className="flex items-center justify-between mb-2.5">
                        <span className="text-slate-700 text-xs font-mono font-bold uppercase tracking-wider">Positions</span>
                        <span className="text-emerald-600 text-xs font-mono font-bold">+$12,847</span>
                    </div>
                    <div className="space-y-2">
                        {[
                            { coin: 'BTC', name: 'BTC-PERP', size: '0.5', profit: '+$6,420', percent: '+12.8%', color: '#F7931A' },
                            { coin: 'ETH', name: 'ETH-PERP', size: '3.2', profit: '+$4,127', percent: '+7.6%', color: '#627EEA' },
                            { coin: 'BNB', name: 'BNB-PERP', size: '8.5', profit: '+$2,300', percent: '+5.2%', color: '#F3BA2F' },
                        ].map((pos, i) => (
                            <div key={i} className="flex items-center justify-between py-2 px-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] hover:bg-slate-50 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div
                                        className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold border"
                                        style={{
                                            backgroundColor: pos.color + '15',
                                            borderColor: pos.color + '30',
                                            color: pos.color
                                        }}
                                    >
                                        {pos.coin}
                                    </div>
                                    <div>
                                        <div className="text-slate-800 text-sm font-mono font-bold">{pos.name}</div>
                                        <div className="flex items-center gap-2 text-[10px]">
                                            <span className="text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded font-mono font-bold">LONG</span>
                                            <span className="text-slate-500 font-mono">{pos.size} {pos.coin}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-emerald-600 font-mono font-bold">{pos.profit}</div>
                                    <div className="text-emerald-600/70 text-[10px] font-mono">{pos.percent}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer status bar */}
                <div className="px-4 py-2 bg-[#F8FAFC] border-t border-[#E2E8F0] flex items-center justify-between">
                    <div className="flex items-center gap-3 text-[10px] font-mono text-slate-500">
                        <span className="flex items-center gap-1 font-semibold text-emerald-600">
                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                            Connected
                        </span>
                        <span>Latency: 12ms</span>
                    </div>
                    <div className="text-[10px] font-mono text-slate-400">
                        mainnet • v2.4.0
                    </div>
                </div>
            </div>
        </motion.div>
    )
}
