import { useLanguage } from '../contexts/LanguageContext'
import { t } from '../i18n/translations'

export function RegistrationDisabled() {
  const { language } = useLanguage()

  const handleBackToLogin = () => {
    window.history.pushState({}, '', '/login')
    window.dispatchEvent(new PopStateEvent('popstate'))
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-nofx-bg text-nofx-text">
      <div className="text-center max-w-md px-6">
        <div className="mb-4">
          <span className="text-2xl font-black tracking-tight text-nofx-gold">
            Bunny Trade
          </span>
        </div>
        <h1 className="text-2xl font-semibold mb-3">
          {t('registrationClosed', language)}
        </h1>
        <p className="text-sm text-nofx-text-muted">
          {t('registrationClosedMessage', language)}
        </p>
        <button
          className="mt-6 px-4 py-2 rounded text-sm font-semibold transition-colors hover:opacity-90 bg-nofx-gold text-white"
          onClick={handleBackToLogin}
        >
          {t('backToLogin', language)}
        </button>
      </div>
    </div>
  )
}
