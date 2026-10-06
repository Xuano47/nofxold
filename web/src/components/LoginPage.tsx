import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import { t } from '../i18n/translations'
import { Eye, EyeOff } from 'lucide-react'
import { DeepVoidBackground } from './DeepVoidBackground'
// import { Input } from './ui/input' // Removed unused import
import { toast } from 'sonner'
import { useSystemConfig } from '../hooks/useSystemConfig'

export function LoginPage() {
  const { language } = useLanguage()
  const { login, loginAdmin } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [adminPassword, setAdminPassword] = useState('')
  const adminMode = false
  const { config: systemConfig } = useSystemConfig()
  const registrationEnabled = systemConfig?.registration_enabled !== false
  const [expiredToastId, setExpiredToastId] = useState<string | number | null>(null)

  // Show notification if user was redirected here due to 401
  useEffect(() => {
    if (sessionStorage.getItem('from401') === 'true') {
      const id = toast.warning(t('sessionExpired', language), {
        duration: Infinity // Keep showing until user dismisses or logs in
      })
      setExpiredToastId(id)
      sessionStorage.removeItem('from401')
    }
  }, [language])

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const result = await loginAdmin(adminPassword)
    if (!result.success) {
      const msg = result.message || t('loginFailed', language)
      setError(msg)
      toast.error(msg)
    } else {
      // Dismiss the "login expired" toast on successful login
      if (expiredToastId) {
        toast.dismiss(expiredToastId)
      }
    }
    setLoading(false)
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const result = await login(email, password)

    if (result.success) {
      // Dismiss the "login expired" toast on successful login.
      if (expiredToastId) {
        toast.dismiss(expiredToastId)
      }
    } else {
      const msg = result.message || t('loginFailed', language)
      setError(msg)
      toast.error(msg)
    }

    setLoading(false)
  }

  return (
    <DeepVoidBackground className="min-h-screen flex items-center justify-center py-12" disableAnimation>

      <div className="w-full max-w-md relative z-10 px-6">
        {/* Navigation - Top Bar (Mobile/Desktop Friendly) */}
        <div className="flex justify-between items-center mb-8">
          <button
            onClick={() => window.location.href = '/'}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors group px-3.5 py-1.5 rounded-lg border border-[#E2E8F0] bg-white shadow-sm"
          >
            <div className="w-2 h-2 rounded-full bg-slate-400 group-hover:bg-blue-600 transition-colors"></div>
            <span className="text-xs font-semibold uppercase tracking-wider">&lt; 返回首页</span>
          </button>
        </div>

        {/* Header */}
        <div className="mb-8 text-center">
          <div className="flex justify-center mb-3">
            <span className="text-3xl font-extrabold tracking-tight text-blue-600">
              Bunny Trade
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mb-1">
            用户登录
          </h1>
          <p className="text-slate-500 text-xs tracking-wider uppercase font-medium">
            Financial Trading Terminal
          </p>
        </div>

        {/* Form Container */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-xl relative group">
          {/* Window Bar */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-[#F8FAFC] border-b border-[#E2E8F0]">
            <div className="flex gap-1.5">
              <div
                className="w-2.5 h-2.5 rounded-full bg-slate-300 hover:bg-red-400 cursor-pointer transition-colors"
                onClick={() => window.location.href = '/'}
                title="关闭 / 返回首页"
              ></div>
              <div className="w-2.5 h-2.5 rounded-full bg-slate-200"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-slate-200"></div>
            </div>
            <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1 font-semibold">
              <span className="text-blue-600">●</span> SECURE AUTH
            </div>
          </div>

          <div className="p-6 md:p-8 relative">
            {adminMode ? (
              <form onSubmit={handleAdminLogin} className="space-y-5">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-slate-700 font-bold mb-1.5 ml-1">Admin Key</label>
                  <input
                    type="password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="w-full bg-white border border-[#E2E8F0] rounded-xl px-4 py-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 outline-none transition-all placeholder-slate-400 text-slate-900 font-mono"
                    placeholder="ENTER_ROOT_PASSWORD"
                    required
                  />
                </div>

                {error && (
                  <div className="text-xs bg-red-50 border border-red-200 text-red-600 px-3.5 py-2.5 rounded-xl font-medium">
                    [ERROR]: {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-xl text-sm tracking-wide uppercase hover:bg-blue-700 transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                >
                  {loading ? '正在验证...' : '确认登录'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-slate-700 mb-1.5 ml-1 font-bold">{t('email', language)}</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-white border border-[#E2E8F0] rounded-xl px-4 py-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 outline-none transition-all placeholder-slate-400 text-slate-900"
                      placeholder="user@bunny.trade"
                      required
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5 ml-1">
                      <label className="block text-xs uppercase tracking-wider text-slate-700 font-bold">{t('password', language)}</label>
                    </div>

                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-white border border-[#E2E8F0] rounded-xl px-4 py-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 outline-none transition-all placeholder-slate-400 text-slate-900 pr-10"
                        placeholder="••••••••••••"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    <div className="text-right mt-2">
                      <button
                        type="button"
                        onClick={() => window.location.href = '/reset-password'}
                        className="text-xs text-slate-500 hover:text-blue-600 transition-colors font-medium"
                      >
                        {t('forgotPassword', language)}
                      </button>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="text-xs bg-red-50 border border-red-200 text-red-600 px-3.5 py-2.5 rounded-xl font-medium flex gap-2 items-start">
                    <span>⚠</span> <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-xl text-sm tracking-wide hover:bg-blue-700 transition-all transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-md flex items-center justify-center gap-2 group"
                >
                  {loading ? (
                    <span className="animate-pulse">登录中...</span>
                  ) : (
                    <>
                      <span>登录</span>
                      <span className="group-hover:translate-x-1 transition-transform">-&gt;</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

          {/* Footer Info */}
          <div className="bg-[#F8FAFC] px-6 py-3 flex justify-between items-center text-[11px] font-mono text-slate-400 border-t border-[#E2E8F0]">
            <div>SSL ENCRYPTED CONNECTION</div>
            <div>{new Date().toISOString().split('T')[0]}</div>
          </div>
        </div>

        {/* Register Link */}
        {!adminMode && registrationEnabled && (
          <div className="text-center mt-6 space-y-3">
            <p className="text-xs text-slate-500">
              还没有账号？{' '}
              <button
                onClick={() => window.location.href = '/register'}
                className="text-blue-600 font-semibold hover:underline transition-colors ml-1"
              >
                立即注册
              </button>
            </p>
          </div>
        )}
      </div>
    </DeepVoidBackground>
  )
}
