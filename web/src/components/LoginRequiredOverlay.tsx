import { motion, AnimatePresence } from 'framer-motion'
import { LogIn, UserPlus, X, AlertTriangle, Terminal } from 'lucide-react'
import { DeepVoidBackground } from './DeepVoidBackground'
import { useLanguage } from '../contexts/LanguageContext'

interface LoginRequiredOverlayProps {
  isOpen: boolean
  onClose: () => void
  featureName?: string
}

export function LoginRequiredOverlay({ isOpen, onClose, featureName }: LoginRequiredOverlayProps) {
  const { language } = useLanguage()

  const texts = {
    zh: {
      title: '系统访问受限',
      subtitle: featureName ? `访问「${featureName}」需要更高权限` : '此模块需要授权访问',
      description: '初始化身份验证协议以解锁完整系统功能：AI 交易员配置、策略工作台、辩论竞技场。',
      benefits: [
        'AI 交易员控制权',
        '策略工作台',
        '辩论竞技场',
        '全系统数据可视化'
      ],
      login: '执行登录指令',
      register: '注册新用户 ID',
      later: '中止操作'
    },
    en: {
      title: 'SYSTEM ACCESS DENIED',
      subtitle: featureName ? `Module "${featureName}" requires elevated privileges` : 'Authorization required for this module',
      description: 'Initialize authentication protocol to unlock full system capabilities: AI Trader configuration and Strategy Studio.',
      benefits: [
        'AI Trader Control',
        'Strategy Studio',
        'Full System Visualization'
      ],
      login: 'EXECUTE LOGIN',
      register: 'REGISTER NEW ID',
      later: 'ABORT'
    },
    id: {
      title: 'AKSES SISTEM DITOLAK',
      subtitle: featureName ? `Modul "${featureName}" memerlukan hak akses lebih tinggi` : 'Otorisasi diperlukan untuk modul ini',
      description: 'Inisialisasi protokol autentikasi untuk membuka kemampuan sistem penuh: konfigurasi Trader AI dan Strategy Studio.',
      benefits: [
        'Kontrol Trader AI',
        'Strategy Studio',
        'Visualisasi Sistem Penuh'
      ],
      login: 'JALANKAN LOGIN',
      register: 'DAFTAR ID BARU',
      later: 'BATALKAN'
    }
  }

  const t = texts[language]

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50"
        >
          <DeepVoidBackground
            className="w-full h-full bg-nofx-bg/95 backdrop-blur-md flex items-center justify-center p-4 text-nofx-text"
            disableAnimation
            onClick={onClose}
          >

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              className="relative max-w-md w-full overflow-hidden bg-white border border-slate-200 shadow-xl rounded-xl group font-mono"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Terminal Window Header */}
              <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <Terminal size={12} className="text-nofx-gold" />
                  <span className="text-[10px] text-nofx-text-muted uppercase tracking-wider">auth_protocol</span>
                </div>
                <button
                  onClick={onClose}
                  className="text-nofx-text-muted hover:text-nofx-danger transition-colors"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Main Content */}
              <div className="p-8 relative">
                <div className="relative z-10">
                  {/* Access Prompt */}
                  <div className="flex justify-center mb-6">
                    <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-2 rounded-lg flex items-center gap-3">
                      <AlertTriangle size={18} />
                      <span className="font-bold tracking-widest text-xs uppercase">{language === 'zh' ? '需要登录' : 'AUTHENTICATION REQUIRED'}</span>
                    </div>
                  </div>

                  {/* Terminal Text */}
                  <div className="space-y-4 mb-8">
                    <div className="text-center">
                      <h2 className="text-xl font-bold text-nofx-text uppercase tracking-wider mb-2">{t.title}</h2>
                      <p className="text-nofx-gold text-xs uppercase tracking-widest border-b border-slate-200 pb-4 inline-block">{t.subtitle}</p>
                    </div>

                    <div className="bg-slate-50 border-l-2 border-nofx-gold p-3 my-4 rounded-r">
                      <p className="text-xs text-nofx-text-muted leading-relaxed font-mono">
                        <span className="text-nofx-gold mr-2">›</span>
                        {t.description}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {t.benefits.map((benefit, i) => (
                        <div key={i} className="flex items-center gap-2 text-[10px] text-nofx-text-muted uppercase tracking-wide">
                          <span className="text-nofx-gold">✓</span> {benefit}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-3">
                    <a
                      href="/login"
                      className="flex items-center justify-center gap-2 w-full py-3 bg-nofx-gold text-white font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-all rounded-lg shadow-sm group"
                    >
                      <LogIn size={14} />
                      <span>{t.login}</span>
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity -ml-2 group-hover:ml-0">-&gt;</span>
                    </a>

                    <a
                      href="/register"
                      className="flex items-center justify-center gap-2 w-full py-3 bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 font-bold text-xs uppercase tracking-widest transition-all rounded-lg"
                    >
                      <UserPlus size={14} />
                      <span>{t.register}</span>
                    </a>
                  </div>

                  <div className="mt-4 text-center">
                    <button
                      onClick={onClose}
                      className="text-[10px] text-nofx-text-muted hover:text-nofx-danger uppercase tracking-widest hover:underline decoration-red-500/30"
                    >
                      [ {t.later} ]
                    </button>
                  </div>

                </div>
              </div>

              {/* Corner Accents */}
              <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-nofx-gold"></div>
              <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-nofx-gold"></div>

            </motion.div>
          </DeepVoidBackground>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
