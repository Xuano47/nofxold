import { Shield, Activity, BarChart2 } from 'lucide-react'
import { t, Language } from '../../i18n/translations'

interface FooterSectionProps {
  language: Language
}

export default function FooterSection({ language }: FooterSectionProps) {
  const navLinks = [
    { name: t('dashboardNav', language), href: '/dashboard' },
    { name: t('strategyNav', language), href: '/strategy' },
    { name: t('realtimeNav', language), href: '/competition' },
    { name: t('faqNav', language), href: '/faq' },
  ]

  return (
    <footer className="bg-nofx-bg-lighter border-t border-slate-200/80 text-nofx-text-muted">
      <div className="max-w-6xl mx-auto px-4 py-10 md:py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl font-extrabold tracking-tight text-nofx-gold">
                Bunny Trade
              </span>
            </div>
            <p className="text-xs leading-relaxed text-nofx-text-muted mb-4">
              {language === 'zh'
                ? '新一代多模型量化交易与自主策略系统。'
                : 'Next-generation multi-model quant trading & autonomous strategy system.'}
            </p>
            <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>ENGINE: ONLINE</span>
            </div>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-nofx-text mb-3">
              {t('links', language)}
            </h4>
            <ul className="space-y-2">
              {navLinks.map((link) => (
                <li key={link.name}>
                  <a
                    href={link.href}
                    className="text-xs text-nofx-text-muted hover:text-nofx-gold transition-colors"
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* System Specs */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-nofx-text mb-3">
              {language === 'zh' ? '架构特性' : 'Architecture'}
            </h4>
            <ul className="space-y-2 text-xs text-nofx-text-muted">
              <li className="flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 text-nofx-gold" />
                <span>{language === 'zh' ? '本地私钥加密存储' : 'Local Key Vault'}</span>
              </li>
              <li className="flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-nofx-gold" />
                <span>{language === 'zh' ? '低延迟多模型驱动' : 'Low Latency Execution'}</span>
              </li>
              <li className="flex items-center gap-2">
                <BarChart2 className="w-3.5 h-3.5 text-nofx-gold" />
                <span>{language === 'zh' ? '双向对冲与风险自愈' : 'Risk Management Guardrails'}</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="pt-6 border-t border-slate-200/80 text-center text-xs space-y-2">
          <p className="font-medium text-nofx-text">
            {t('footerTitle', language)}
          </p>
          <p className="text-[11px] text-slate-400 max-w-2xl mx-auto leading-normal">
            {t('footerWarning', language)}
          </p>
        </div>
      </div>
    </footer>
  )
}
