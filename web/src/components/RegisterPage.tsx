import React, { useEffect, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import PasswordChecklist from 'react-password-checklist'
import { toast } from 'sonner'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import { t } from '../i18n/translations'
import { getSystemConfig } from '../lib/config'
import { DeepVoidBackground } from './DeepVoidBackground'
import { RegistrationDisabled } from './RegistrationDisabled'
import { WhitelistFullPage } from './WhitelistFullPage'

export function RegisterPage() {
  const { language } = useLanguage()
  const { register } = useAuth()
  const [view, setView] = useState<'register' | 'whitelist-full'>('register')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [betaCode, setBetaCode] = useState('')
  const [betaMode, setBetaMode] = useState(false)
  const [registrationEnabled, setRegistrationEnabled] = useState(true)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [passwordValid, setPasswordValid] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  useEffect(() => {
    getSystemConfig()
      .then((config) => {
        setBetaMode(config.beta_mode || false)
        setRegistrationEnabled(config.registration_enabled !== false)
      })
      .catch((err) => {
        console.error('Failed to fetch system config:', err)
      })
  }, [])

  if (!registrationEnabled) {
    return <RegistrationDisabled />
  }

  if (view === 'whitelist-full') {
    return <WhitelistFullPage onBack={() => setView('register')} />
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!passwordValid) {
      setError(t('passwordNotMeetRequirements', language))
      return
    }

    if (betaMode && !betaCode.trim()) {
      setError('内测期间，注册需要提供内测码')
      return
    }

    setLoading(true)
    try {
      const result = await register(email, password, betaCode.trim() || undefined)

      const isWhitelistError = (msg: string) => {
        const lowerMsg = msg.toLowerCase()
        return (
          lowerMsg.includes('whitelist') ||
          lowerMsg.includes('capacity') ||
          lowerMsg.includes('limit') ||
          lowerMsg.includes('permission denied') ||
          lowerMsg.includes('not on whitelist')
        )
      }

      if (!result.success) {
        const msg = result.message || t('registrationFailed', language)
        if (isWhitelistError(msg)) {
          setView('whitelist-full')
          return
        }
        setError(msg)
        toast.error(msg)
      }
      // success path is handled in AuthContext (auto login + navigation)
    } catch (e) {
      console.error('Registration error:', e)
      const errorMsg = e instanceof Error ? e.message : 'Registration failed due to server error'
      const lowerMsg = errorMsg.toLowerCase()
      if (
        lowerMsg.includes('whitelist') ||
        lowerMsg.includes('capacity') ||
        lowerMsg.includes('limit') ||
        lowerMsg.includes('permission denied') ||
        lowerMsg.includes('not on whitelist')
      ) {
        setView('whitelist-full')
        return
      }
      setError(errorMsg)
      toast.error(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <DeepVoidBackground className="min-h-screen flex items-center justify-center py-12" disableAnimation>
      <div className="w-full max-w-lg relative z-10 px-6">
        <div className="flex justify-between items-center mb-8">
          <button
            onClick={() => (window.location.href = '/')}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors group px-3.5 py-1.5 rounded-lg border border-[#E2E8F0] bg-white shadow-sm"
          >
            <div className="w-2 h-2 rounded-full bg-slate-400 group-hover:bg-blue-600 transition-colors"></div>
            <span className="text-xs font-semibold uppercase tracking-wider">&lt; 返回首页</span>
          </button>
        </div>

        <div className="mb-8 text-center">
          <div className="flex justify-center mb-3">
            <span className="text-3xl font-extrabold tracking-tight text-blue-600">
              Bunny Trade
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mb-1">
            注册新账户
          </h1>
          <p className="text-slate-500 text-xs tracking-wider uppercase font-medium">
            Financial Trading Terminal
          </p>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-xl relative group">
          <div className="flex items-center justify-between px-4 py-2.5 bg-[#F8FAFC] border-b border-[#E2E8F0]">
            <div className="flex gap-1.5">
              <div
                className="w-2.5 h-2.5 rounded-full bg-slate-300 hover:bg-red-400 cursor-pointer transition-colors"
                onClick={() => (window.location.href = '/')}
                title="关闭 / 返回首页"
              ></div>
              <div className="w-2.5 h-2.5 rounded-full bg-slate-200"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-slate-200"></div>
            </div>
            <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1 font-semibold">
              <span className="text-blue-600">●</span> NEW OPERATOR
            </div>
          </div>

          <div className="p-6 md:p-8 relative">
            <form onSubmit={handleRegister} className="space-y-5">
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-slate-700 mb-1.5 ml-1 font-bold">{t('password', language)}</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-white border border-[#E2E8F0] rounded-xl px-4 py-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 outline-none transition-all placeholder-slate-400 text-slate-900 pr-10"
                      placeholder="••••••••"
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
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-slate-700 mb-1.5 ml-1 font-bold">{t('confirmPassword', language)}</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-white border border-[#E2E8F0] rounded-xl px-4 py-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 outline-none transition-all placeholder-slate-400 text-slate-900 pr-10"
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-[#F8FAFC] p-4 rounded-xl border border-[#E2E8F0]">
                <div className="text-[11px] uppercase tracking-wider text-slate-500 mb-2 font-bold flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div>
                  密码安全要求
                </div>
                <div className="text-xs text-slate-600">
                  <PasswordChecklist
                    rules={['minLength', 'capital', 'lowercase', 'number', 'specialChar', 'match']}
                    minLength={8}
                    value={password}
                    valueAgain={confirmPassword}
                    messages={{
                      minLength: t('passwordRuleMinLength', language),
                      capital: t('passwordRuleUppercase', language),
                      lowercase: t('passwordRuleLowercase', language),
                      number: t('passwordRuleNumber', language),
                      specialChar: t('passwordRuleSpecial', language),
                      match: t('passwordRuleMatch', language),
                    }}
                    className="grid grid-cols-2 gap-x-4 gap-y-1.5"
                    onChange={(isValid) => setPasswordValid(isValid)}
                    iconSize={12}
                  />
                </div>
              </div>

              {betaMode && (
                <div>
                  <label className="block text-xs uppercase tracking-wider text-blue-600 mb-1.5 ml-1 font-bold">优先访问码</label>
                  <input
                    type="text"
                    value={betaCode}
                    onChange={(e) => setBetaCode(e.target.value.replace(/[^a-z0-9]/gi, '').toLowerCase())}
                    className="w-full bg-white border border-[#E2E8F0] rounded-xl px-4 py-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 outline-none transition-all placeholder-slate-400 text-slate-900 font-mono tracking-widest"
                    placeholder="XXXXXX"
                    maxLength={6}
                    required={betaMode}
                  />
                  <p className="text-[11px] text-slate-400 font-mono mt-1 ml-1">* 不区分大小写字母与数字</p>
                </div>
              )}

              {error && (
                <div className="text-xs bg-red-50 border border-red-200 text-red-600 px-3.5 py-2.5 rounded-xl font-medium">
                  [错误]: {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || (betaMode && !betaCode.trim()) || !passwordValid}
                className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-xl text-sm tracking-wide hover:bg-blue-700 transition-all transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-md flex items-center justify-center gap-2 group mt-4"
              >
                {loading ? (
                  <span className="animate-pulse">正在创建账户...</span>
                ) : (
                  <>
                    <span>创建账户</span>
                    <span className="group-hover:translate-x-1 transition-transform">-&gt;</span>
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="bg-[#F8FAFC] px-6 py-3 flex justify-between items-center text-[11px] font-mono text-slate-400 border-t border-[#E2E8F0]">
            <div>SSL ENCRYPTED CONNECTION</div>
            <div>SECURE_REGISTRY</div>
          </div>
        </div>

        <div className="text-center mt-6 space-y-3">
          <p className="text-xs text-slate-500">
            已有账户？{' '}
            <button
              onClick={() => (window.location.href = '/login')}
              className="text-blue-600 font-semibold hover:underline transition-colors ml-1"
            >
              直接登录
            </button>
          </p>
        </div>
      </div>
    </DeepVoidBackground>
  )
}
