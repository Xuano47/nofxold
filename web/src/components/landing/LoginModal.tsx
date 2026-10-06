import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import { t, Language } from '../../i18n/translations'
import { useSystemConfig } from '../../hooks/useSystemConfig'

interface LoginModalProps {
  onClose: () => void
  language: Language
}

export default function LoginModal({ onClose, language }: LoginModalProps) {
  const { config: systemConfig } = useSystemConfig()
  const registrationEnabled = systemConfig?.registration_enabled !== false

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="relative max-w-md w-full rounded-2xl p-8 bg-white border border-slate-200 shadow-2xl"
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        onClick={(e) => e.stopPropagation()}
      >
        <motion.button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <X className="w-6 h-6" />
        </motion.button>
        <h2 className="text-2xl font-bold mb-2 text-slate-900">
          {t('accessNofxPlatform', language)}
        </h2>
        <p className="text-sm mb-6 text-slate-500">
          {t('loginRegisterPrompt', language)}
        </p>
        <div className="space-y-3">
          <motion.button
            onClick={() => {
              window.history.pushState({}, '', '/login')
              window.dispatchEvent(new PopStateEvent('popstate'))
              onClose()
            }}
            className="block w-full px-6 py-3 rounded-xl font-bold text-center bg-nofx-gold text-white shadow-sm hover:opacity-90 transition-opacity"
            whileTap={{ scale: 0.98 }}
          >
            {t('signIn', language)}
          </motion.button>
          {registrationEnabled && (
            <motion.button
              onClick={() => {
                window.history.pushState({}, '', '/register')
                window.dispatchEvent(new PopStateEvent('popstate'))
                onClose()
              }}
              className="block w-full px-6 py-3 rounded-xl font-bold text-center bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 transition-colors"
              whileTap={{ scale: 0.98 }}
            >
              {t('registerNewAccount', language)}
            </motion.button>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
