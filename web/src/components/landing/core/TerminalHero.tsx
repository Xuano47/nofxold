import { motion } from 'framer-motion'
import { ArrowRight, Bot, ShieldCheck, Zap } from 'lucide-react'
import { useAuth } from '../../../contexts/AuthContext'
import { useLanguage } from '../../../contexts/LanguageContext'

interface TerminalHeroProps {
    onLoginClick?: () => void
}

export default function TerminalHero({ onLoginClick }: TerminalHeroProps) {
    const { user } = useAuth()
    const { language } = useLanguage()
    const isLoggedIn = !!user

    const handlePrimaryClick = () => {
        if (isLoggedIn) {
            window.location.href = '/traders'
        } else if (onLoginClick) {
            onLoginClick()
        } else {
            window.location.href = '/login'
        }
    }

    const features = language === 'zh' ? [
        {
            icon: Bot,
            title: '多模型智能驱动',
            desc: '支持 DeepSeek、Claude、OpenAI 多模型协同研判与自主策略决策'
        },
        {
            icon: Zap,
            title: '统一交易所接入',
            desc: '标准化统一调度，支持主流交易所全自动执行与资产同步'
        },
        {
            icon: ShieldCheck,
            title: '严密风控防护',
            desc: '实时账户净敞口监控、仓位限制与动态止损熔断保护'
        }
    ] : [
        {
            icon: Bot,
            title: 'Multi-Model Intelligence',
            desc: 'DeepSeek, Claude, and OpenAI collaborative strategy reasoning'
        },
        {
            icon: Zap,
            title: 'Unified Exchange Hub',
            desc: 'High-speed automated order execution across major exchanges'
        },
        {
            icon: ShieldCheck,
            title: 'Autonomous Risk Shield',
            desc: 'Real-time exposure tracking, position limits & circuit breakers'
        }
    ]

    return (
        <section className="relative w-full min-h-[calc(100vh-4rem)] bg-nofx-bg text-nofx-text overflow-hidden flex flex-col justify-center items-center py-16 md:py-24">
            {/* Background Subtle Pattern */}
            <div className="absolute inset-0 bg-grid-pattern opacity-[0.03] pointer-events-none"></div>
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none"></div>

            <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
                {/* Brand Tag */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="mb-8 inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full border border-blue-200 bg-white shadow-sm"
                >
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-xs font-mono font-bold text-blue-600 tracking-wider">
                        BUNNY TRADE QUANTITATIVE SYSTEM
                    </span>
                </motion.div>

                {/* Main Heading */}
                <motion.h1
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="text-5xl sm:text-6xl md:text-8xl font-black tracking-tight text-slate-900 mb-6 select-none"
                >
                    BUNNY <span className="text-blue-600">TRADE</span>
                </motion.h1>

                {/* Subtitle */}
                <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="max-w-2xl mx-auto text-base sm:text-lg md:text-xl text-slate-600 mb-10 leading-relaxed font-normal"
                >
                    {language === 'zh'
                        ? '自主多模型AI交易系统。'
                        : 'Autonomous Multi-Model AI Trading System.'}
                </motion.p>

                {/* Action Buttons */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    className="flex justify-center items-center mb-16"
                >
                    <button
                        onClick={handlePrimaryClick}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 font-bold font-mono text-sm tracking-wider rounded-xl shadow-md transition-all duration-200"
                    >
                        <span>{language === 'zh' ? '进入交易控制台' : 'ENTER DASHBOARD'}</span>
                        <ArrowRight className="w-4 h-4" />
                    </button>
                </motion.div>

                {/* 3 Core Highlights */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                    className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left max-w-4xl mx-auto"
                >
                    {features.map((feature, i) => (
                        <div
                            key={i}
                            className="p-6 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm hover:border-blue-300 transition-all duration-200"
                        >
                            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mb-4">
                                <feature.icon className="w-5 h-5" />
                            </div>
                            <h3 className="text-base font-bold text-slate-900 mb-2">
                                {feature.title}
                            </h3>
                            <p className="text-xs text-slate-500 leading-relaxed">
                                {feature.desc}
                            </p>
                        </div>
                    ))}
                </motion.div>
            </div>
        </section>
    )
}
