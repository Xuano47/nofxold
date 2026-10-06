import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, ChevronDown } from 'lucide-react'
import { t, type Language } from '../i18n/translations'
import { useSystemConfig } from '../hooks/useSystemConfig'

type Page =
  | 'competition'
  | 'traders'
  | 'trader'
  | 'strategy'
  | 'faq'
  | 'login'
  | 'register'

interface HeaderBarProps {
  onLoginClick?: () => void
  isLoggedIn?: boolean
  isHomePage?: boolean
  currentPage?: Page
  language?: Language
  onLanguageChange?: (lang: Language) => void
  user?: { email: string } | null
  onLogout?: () => void
  onPageChange?: (page: Page) => void
  onLoginRequired?: (featureName: string) => void
}

export default function HeaderBar({
  isLoggedIn = false,
  isHomePage = false,
  currentPage,
  language = 'zh' as Language,
  onLanguageChange,
  user,
  onLogout,
  onPageChange,
  onLoginRequired,
}: HeaderBarProps) {
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [languageDropdownOpen, setLanguageDropdownOpen] = useState(false)
  const [userDropdownOpen, setUserDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const userDropdownRef = useRef<HTMLDivElement>(null)
  const { config: systemConfig } = useSystemConfig()
  const registrationEnabled = systemConfig?.registration_enabled !== false

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setLanguageDropdownOpen(false)
      }
      if (
        userDropdownRef.current &&
        !userDropdownRef.current.contains(event.target as Node)
      ) {
        setUserDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  return (
    <nav className="fixed top-0 w-full z-50 header-bar">
      <div className="flex items-center justify-between h-16 px-4 sm:px-6 max-w-[1920px] mx-auto">
        {/* Logo - Always go to home page */}
        <div
          onClick={() => {
            window.location.href = '/'
          }}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer"
        >
          <span className="text-xl font-extrabold tracking-tight text-nofx-gold">
            Bunny Trade
          </span>
        </div>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center justify-between flex-1 ml-8">
          {/* Left Side - Navigation Tabs - Always show all tabs */}
          <div className="flex items-center gap-2">
            {/* Navigation tabs configuration */}
            {(() => {
              // Define all navigation tabs
              const navTabs: { page: Page; path: string; label: string; requiresAuth: boolean }[] = [
                { page: 'traders', path: '/traders', label: t('configNav', language), requiresAuth: true },
                { page: 'trader', path: '/dashboard', label: t('dashboardNav', language), requiresAuth: true },
                { page: 'strategy', path: '/strategy', label: t('strategyNav', language), requiresAuth: true },
                { page: 'competition', path: '/competition', label: t('realtimeNav', language), requiresAuth: true },
              ]

              const handleNavClick = (tab: typeof navTabs[0]) => {
                // If requires auth and not logged in, show login prompt
                if (tab.requiresAuth && !isLoggedIn) {
                  onLoginRequired?.(tab.label)
                  return
                }
                // Navigate normally
                if (onPageChange) {
                  onPageChange(tab.page)
                }
                navigate(tab.path)
              }

              return navTabs.map((tab) => (
                <button
                  key={tab.page}
                  onClick={() => handleNavClick(tab)}
                  className={`text-sm font-semibold transition-all duration-200 relative px-3 py-2 rounded-lg
                    ${currentPage === tab.page ? 'text-blue-600 bg-blue-50 font-bold' : 'text-slate-600 hover:text-blue-600 hover:bg-slate-100'}`}
                >
                  {tab.label}
                </button>
              ))
            })()}
          </div>

          {/* Right Side - User Actions */}
          <div className="flex items-center gap-4">

            {/* User Info and Actions */}
            {isLoggedIn && user ? (
              <div className="flex items-center gap-3">
                {/* User Info with Dropdown */}
                <div className="relative" ref={userDropdownRef}>
                  <button
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors bg-slate-100 border border-[#E2E8F0] hover:bg-slate-200 text-slate-800"
                  >
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold bg-blue-600 text-white shadow-sm">
                      {user.email[0].toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-slate-700">
                      {user.email}
                    </span>
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  </button>

                  {userDropdownOpen && (
                    <div className="absolute right-0 top-full mt-2 w-48 rounded-xl shadow-lg overflow-hidden z-50 bg-white border border-[#E2E8F0]">
                      <div className="px-4 py-3 border-b border-[#F1F5F9]">
                        <div className="text-xs text-slate-400 font-medium">
                          {t('loggedInAs', language)}
                        </div>
                        <div className="text-sm font-semibold text-slate-900 truncate">
                          {user.email}
                        </div>
                      </div>
                      {onLogout && (
                        <button
                          onClick={() => {
                            onLogout()
                            setUserDropdownOpen(false)
                          }}
                          className="w-full px-4 py-2.5 text-sm font-semibold transition-colors text-center bg-red-50 text-red-600 hover:bg-red-100"
                        >
                          {t('exitLogin', language)}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Show login/register buttons when not logged in and not on login/register pages */
              currentPage !== 'login' &&
              currentPage !== 'register' && (
                <div className="flex items-center gap-3">
                  <a
                    href="/login"
                    className="px-3 py-2 text-sm font-semibold transition-colors rounded text-slate-600 hover:text-blue-600 hover:bg-slate-100"
                  >
                    {t('signIn', language)}
                  </a>
                  {registrationEnabled && (
                    <a
                      href="/register"
                      className="px-4 py-2 rounded-lg font-semibold text-sm transition-all hover:bg-blue-700 bg-blue-600 text-white shadow-sm"
                    >
                      {t('signUp', language)}
                    </a>
                  )}
                </div>
              )
            )}

            {/* Language Toggle - Always at the rightmost */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setLanguageDropdownOpen(!languageDropdownOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-slate-600 hover:bg-slate-100"
              >
                <span className="text-lg">
                  {language === 'zh' ? '🇨🇳' : '🇺🇸'}
                </span>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>

              {languageDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-32 rounded-xl shadow-lg overflow-hidden z-50 bg-white border border-[#E2E8F0]">
                  <button
                    onClick={() => {
                      onLanguageChange?.('zh')
                      setLanguageDropdownOpen(false)
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2 transition-colors
                      ${language === 'zh' ? 'bg-blue-50 text-blue-600 font-bold' : 'text-slate-700 hover:bg-slate-50'}`}
                  >
                    <span className="text-base">🇨🇳</span>
                    <span className="text-sm">中文</span>
                  </button>
                  <button
                    onClick={() => {
                      onLanguageChange?.('en')
                      setLanguageDropdownOpen(false)
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2 transition-colors
                      ${language === 'en' ? 'bg-blue-50 text-blue-600 font-bold' : 'text-slate-700 hover:bg-slate-50'}`}
                  >
                    <span className="text-base">🇺🇸</span>
                    <span className="text-sm">English</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Menu Button */}
        <motion.button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden text-nofx-text-muted hover:text-white"
          whileTap={{ scale: 0.9 }}
        >
          {mobileMenuOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <Menu className="w-6 h-6" />
          )}
        </motion.button>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 md:hidden bg-white/95 backdrop-blur-xl border-b border-[#E2E8F0]"
            style={{ top: '64px' }} // Below header
          >
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.3 }}
              className="flex flex-col h-[calc(100vh-64px)] overflow-y-auto px-6 py-8"
            >
              {/* Navigation Links */}
              <div className="flex flex-col gap-6 mb-12">
                {(() => {
                  const navTabs: { page: Page; path: string; label: string; requiresAuth: boolean }[] = [
                    { page: 'traders', path: '/traders', label: t('configNav', language), requiresAuth: true },
                    { page: 'trader', path: '/dashboard', label: t('dashboardNav', language), requiresAuth: true },
                    { page: 'strategy', path: '/strategy', label: t('strategyNav', language), requiresAuth: true },
                    { page: 'competition', path: '/competition', label: t('realtimeNav', language), requiresAuth: true },
                  ]

                  const handleMobileNavClick = (tab: typeof navTabs[0]) => {
                    if (tab.requiresAuth && !isLoggedIn) {
                      onLoginRequired?.(tab.label)
                      setMobileMenuOpen(false)
                      return
                    }
                    if (onPageChange) {
                      onPageChange(tab.page)
                    }
                    navigate(tab.path)
                    setMobileMenuOpen(false)
                  }

                  return navTabs.map((tab, i) => (
                    <motion.button
                      key={tab.page}
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.1 + i * 0.05 }}
                      onClick={() => handleMobileNavClick(tab)}
                      className={`text-2xl font-black tracking-tight text-left flex items-center gap-3
                        ${currentPage === tab.page ? 'text-blue-600' : 'text-slate-600 hover:text-blue-600'}`}
                    >
                      {currentPage === tab.page && (
                        <motion.div
                          layoutId="active-indicator"
                          className="w-2 h-2 rounded-full bg-blue-600"
                        />
                      )}
                      {tab.label}
                      {tab.requiresAuth && !isLoggedIn && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded border border-slate-200 text-slate-400 font-normal tracking-wide uppercase align-middle relative -top-1">
                          LOGIN_REQ
                        </span>
                      )}
                    </motion.button>
                  ))
                })()}

                {/* Original Page Links */}
                {isHomePage && (
                  <div className="pt-6 border-t border-slate-200 space-y-4">
                    {[
                      { key: 'features', label: t('features', language) },
                      { key: 'howItWorks', label: t('howItWorks', language) },
                    ].map((item, i) => (
                      <motion.a
                        key={item.key}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 + i * 0.1 }}
                        href={`#${item.key === 'features' ? 'features' : 'how-it-works'}`}
                        className="block text-lg font-medium text-slate-600 hover:text-blue-600"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        {'>'} {item.label}
                      </motion.a>
                    ))}
                  </div>
                )}
              </div>

              {/* Bottom Actions */}
              <div className="mt-auto space-y-8">

                {/* Account / Lang */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Lang Switcher */}
                  <div className="flex bg-slate-100 rounded-xl p-1 border border-slate-200">
                    {['zh', 'en'].map((lang) => (
                      <button
                        key={lang}
                        onClick={() => {
                          onLanguageChange?.(lang as Language)
                          setMobileMenuOpen(false)
                        }}
                        className={`flex-1 py-3 text-sm font-bold rounded-lg transition-colors ${language === lang
                          ? 'bg-white text-blue-600 shadow-sm'
                          : 'text-slate-600'
                          }`}
                      >
                        {lang === 'zh' ? '中文' : 'EN'}
                      </button>
                    ))}
                  </div>

                  {/* Auth Actions */}
                  {isLoggedIn && user ? (
                    <button
                      onClick={() => {
                        onLogout?.()
                        setMobileMenuOpen(false)
                      }}
                      className="bg-red-50 border border-red-200 text-red-600 rounded-xl font-bold text-sm hover:bg-red-100 transition-colors"
                    >
                      {t('exitLogin', language)}
                    </button>
                  ) : (
                    currentPage !== 'login' && currentPage !== 'register' && (
                      <a
                        href="/login"
                        className="flex items-center justify-center bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors shadow-sm"
                      >
                        {t('signIn', language)}
                      </a>
                    )
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}
