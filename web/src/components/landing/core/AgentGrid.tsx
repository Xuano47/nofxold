import { motion } from 'framer-motion'
import { TrendingUp, Layers, Zap, Hexagon, Crosshair } from 'lucide-react'
import { useAuth } from '../../../contexts/AuthContext'

const agents = [
    {
        name: "ALPHA-1",
        // ... (rest of agents array remains, but I can't skip lines in replacement content easily without context. Wait, let's just replace the top section)
        // Actually, I'll use multi_replace for targeted cleanup.
        class: "SCALPER",
        desc: "High-frequency microstructure exploitation.",
        apy: "142%",
        winRate: "68%",
        risk: "HIGH",
        color: "text-nofx-gold",
        border: "border-nofx-gold/50",
        bg_glow: "shadow-[0_0_30px_rgba(240,185,11,0.1)]",
        icon: Zap
    },
    {
        name: "BETA-X",
        class: "SWING_OPS",
        desc: "Multi-day trend extraction engine.",
        apy: "89%",
        winRate: "55%",
        risk: "MED",
        color: "text-blue-400",
        border: "border-blue-400/30",
        bg_glow: "shadow-[0_0_30px_rgba(96,165,250,0.1)]",
        icon: TrendingUp
    },
    {
        name: "GAMMA-RAY",
        class: "ARBITRAGE",
        desc: "Low-risk spatial price equalization.",
        apy: "24%",
        winRate: "99%",
        risk: "LOW",
        color: "text-purple-400",
        border: "border-purple-400/30",
        bg_glow: "shadow-[0_0_30px_rgba(192,132,252,0.1)]",
        icon: Layers
    },
]

export default function AgentGrid() {
    const { user } = useAuth()

    const handleInitialize = () => {
        if (user) {
            window.location.href = '/traders'
        } else {
            window.location.href = '/login'
        }
    }

    return (
        <section id="market-scanner" className="py-16 md:py-24 bg-nofx-bg relative overflow-hidden">

            {/* Background Details */}
            <div className="absolute top-0 right-0 p-10 opacity-20 pointer-events-none">
                <Hexagon className="w-64 h-64 text-zinc-800" strokeWidth={0.5} />
            </div>

            <div className="max-w-7xl mx-auto px-6 relative z-10">

                <div className="flex flex-col md:flex-row justify-between items-end mb-10 md:mb-16 gap-6">
                    <div>
                        <div className="flex items-center gap-2 text-blue-600 font-mono text-xs mb-2 tracking-widest uppercase font-bold">
                            <Crosshair className="w-4 h-4" /> 策略单元展示
                        </div>
                        <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">
                            STRATEGY <span className="text-blue-600">UNITS</span>
                        </h2>
                    </div>
                    <div className="font-mono text-right text-xs text-slate-500 max-w-xs">
                        自主量化交易策略单元，历经历史数据回测与实时环境验证。
                    </div>
                </div>

                {/* Grid Container */}
                <div className="flex flex-row md:grid md:grid-cols-3 gap-6 md:gap-8 overflow-x-auto md:overflow-visible pb-12 md:pb-0 snap-x snap-mandatory -mx-6 px-6 md:mx-0 md:px-0 scrollbar-hide">
                    {agents.map((agent, i) => {
                        const Icon = agent.icon

                        return (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1 }}
                                className="group relative bg-white border border-[#E2E8F0] shadow-sm hover:shadow-md hover:border-blue-400 overflow-hidden transition-all duration-300 min-w-[85vw] md:min-w-0 snap-center shrink-0 rounded-2xl p-7 flex flex-col justify-between"
                            >
                                <div>
                                    {/* Header */}
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="p-3 bg-slate-50 rounded-xl border border-[#E2E8F0]">
                                            <Icon className={`w-8 h-8 ${agent.color === 'text-nofx-gold' ? 'text-blue-600' : agent.color}`} />
                                        </div>
                                        <div className="text-right">
                                            <div className="text-[10px] font-mono text-slate-400 uppercase font-semibold">类型</div>
                                            <div className="font-bold font-mono text-xs tracking-wider text-slate-700">{agent.class}</div>
                                        </div>
                                    </div>

                                    {/* Name & Desc */}
                                    <h3 className="text-2xl font-bold text-slate-900 mb-2 tracking-tight group-hover:text-blue-600 transition-colors">{agent.name}</h3>
                                    <p className="text-slate-500 text-sm mb-6 leading-relaxed h-12">{agent.desc}</p>

                                    {/* Stats Grid */}
                                    <div className="grid grid-cols-3 gap-px bg-[#E2E8F0] border border-[#E2E8F0] rounded-xl overflow-hidden mb-6">
                                        <div className="bg-[#F8FAFC] p-3 text-center">
                                            <div className="text-[10px] text-slate-400 uppercase font-mono mb-1 font-semibold">年化预期</div>
                                            <div className="text-emerald-600 font-bold font-mono">{agent.apy}</div>
                                        </div>
                                        <div className="bg-[#F8FAFC] p-3 text-center">
                                            <div className="text-[10px] text-slate-400 uppercase font-mono mb-1 font-semibold">胜率</div>
                                            <div className="text-slate-900 font-bold font-mono">{agent.winRate}</div>
                                        </div>
                                        <div className="bg-[#F8FAFC] p-3 text-center">
                                            <div className="text-[10px] text-slate-400 uppercase font-mono mb-1 font-semibold">风险级别</div>
                                            <div className="text-blue-600 font-bold font-mono">{agent.risk}</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Action Btn */}
                                <button
                                    onClick={handleInitialize}
                                    className="w-full py-3.5 text-xs font-bold font-mono uppercase tracking-wider rounded-xl bg-blue-50 border border-blue-200 text-blue-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    <span>查看详情</span>
                                </button>
                            </motion.div>
                        )
                    })}
                </div>
            </div>
        </section>
    )
}
