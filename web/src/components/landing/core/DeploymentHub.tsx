import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Terminal, Copy, Check, ChevronRight, Server, Command, Shield } from 'lucide-react'

export default function DeploymentHub() {
    const [copied, setCopied] = useState(false)
    const installCmd = "docker compose up -d"

    const handleCopy = () => {
        navigator.clipboard.writeText(installCmd)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <section className="py-24 bg-nofx-bg relative overflow-hidden border-t border-slate-200/80">
            {/* Background Grids */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000008_1px,transparent_1px),linear-gradient(to_bottom,#00000008_1px,transparent_1px)] bg-[size:24px_24px]"></div>

            <div className="max-w-7xl mx-auto px-6 relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

                    {/* Left Column: Context */}
                    <div className="space-y-8">
                        <div className="flex items-center gap-2 text-nofx-gold font-mono text-xs tracking-[0.2em] uppercase">
                            <Server className="w-4 h-4" /> System Deployment
                        </div>

                        <h2 className="text-4xl md:text-6xl font-black text-nofx-text leading-tight">
                            DEPLOY <span className="text-nofx-gold">INSTANTLY</span>
                        </h2>

                        <p className="text-nofx-text-muted text-lg leading-relaxed font-light">
                            Initialize your own high-frequency trading node in seconds.
                            Launch autonomous quant agents and services with a single command.
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                            {[
                                { icon: Command, label: "One-Line Launch", desc: "Docker Compose ready" },
                                { icon: Shield, label: "Isolated Sandbox", desc: "Local database & encrypted keys" }
                            ].map((item, i) => (
                                <div key={i} className="flex gap-4 items-start p-4 rounded-xl bg-white border border-slate-200 shadow-sm hover:border-nofx-gold/50 transition-colors group">
                                    <div className="p-2 rounded-lg bg-blue-50 border border-blue-100 text-nofx-gold group-hover:bg-blue-100 transition-colors">
                                        <item.icon className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h4 className="text-nofx-text font-bold font-mono text-sm mb-1">{item.label}</h4>
                                        <p className="text-nofx-text-muted text-xs">{item.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right Column: Terminal */}
                    <motion.div
                        initial={{ opacity: 0, x: 50 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className="relative"
                    >
                        {/* Glow effect */}
                        <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 rounded-xl blur-xl opacity-50"></div>

                        <div className="relative rounded-xl overflow-hidden bg-slate-900 border border-slate-800 shadow-xl">
                            {/* Terminal Header */}
                            <div className="flex items-center justify-between px-4 py-3 bg-slate-950/80 border-b border-slate-800">
                                <div className="flex gap-2">
                                    <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                                    <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                                    <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
                                </div>
                                <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1.5">
                                    <Terminal className="w-3 h-3" />
                                    operator@bunny-trade:~
                                </div>
                            </div>

                            {/* Terminal Content */}
                            <div className="p-8 font-mono text-sm md:text-base bg-slate-950/90 min-h-[200px] flex flex-col justify-center">
                                <div className="mb-2 text-slate-400 text-xs tracking-wide"># Launch Bunny Trade Node</div>
                                <div
                                    className="group relative flex items-start gap-3 p-4 rounded-lg bg-slate-900 border border-slate-800 hover:border-nofx-gold/50 cursor-pointer transition-all"
                                    onClick={handleCopy}
                                >
                                    <span className="text-nofx-gold mt-1"><ChevronRight className="w-4 h-4" /></span>
                                    <code className="text-zinc-100 flex-1 break-all">
                                        {installCmd}
                                    </code>

                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <AnimatePresence mode='wait'>
                                            {copied ? (
                                                <motion.div
                                                    initial={{ scale: 0.5, opacity: 0 }}
                                                    animate={{ scale: 1, opacity: 1 }}
                                                    exit={{ scale: 0.5, opacity: 0 }}
                                                    className="flex items-center gap-1 text-green-400 bg-green-400/10 px-2 py-1 rounded text-xs font-bold"
                                                >
                                                    <Check className="w-3 h-3" />
                                                </motion.div>
                                            ) : (
                                                <div className="text-zinc-400 bg-zinc-800 p-1.5 rounded hover:text-white hover:bg-zinc-700">
                                                    <Copy className="w-4 h-4" />
                                                </div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>
                                <div className="mt-4 flex gap-2">
                                    <div className="w-2 h-4 bg-nofx-gold animate-pulse"></div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    )
}
