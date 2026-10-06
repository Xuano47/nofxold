import { useLanguage } from '../contexts/LanguageContext'
import { t } from '../i18n/translations'
import { Container } from './Container'

interface HeaderProps {
  simple?: boolean // For login/register pages
}

export function Header({ simple = false }: HeaderProps) {
  const { language, setLanguage } = useLanguage()

  return (
    <header className="sticky top-0 z-50 bg-nofx-bg-lighter border-b border-slate-200/80 backdrop-blur-xl">
      <Container className="py-4">
        <div className="flex items-center justify-between">
          {/* Left - Logo and Title */}
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-nofx-gold">
                {t('appTitle', language)}
              </h1>
              {!simple && (
                <p className="text-xs text-nofx-text-muted">
                  {t('subtitle', language)}
                </p>
              )}
            </div>
          </div>

          {/* Right - Language Toggle (always show) */}
          <div
            className="flex gap-1 rounded p-1 bg-slate-100 border border-slate-200"
          >
            <button
              onClick={() => setLanguage('zh')}
              className="px-3 py-1.5 rounded text-xs font-semibold transition-all"
              style={
                language === 'zh'
                  ? { background: 'var(--nofx-gold)', color: '#fff' }
                  : { background: 'transparent', color: 'var(--text-secondary)' }
              }
            >
              中文
            </button>
            <button
              onClick={() => setLanguage('en')}
              className="px-3 py-1.5 rounded text-xs font-semibold transition-all"
              style={
                language === 'en'
                  ? { background: 'var(--nofx-gold)', color: '#fff' }
                  : { background: 'transparent', color: 'var(--text-secondary)' }
              }
            >
              EN
            </button>
            <button
              onClick={() => setLanguage('id')}
              className="px-3 py-1.5 rounded text-xs font-semibold transition-all"
              style={
                language === 'id'
                  ? { background: 'var(--nofx-gold)', color: '#fff' }
                  : { background: 'transparent', color: 'var(--text-secondary)' }
              }
            >
              ID
            </button>
          </div>
        </div>
      </Container>
    </header>
  )
}
