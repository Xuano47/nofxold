import { useState, useEffect } from 'react'
import type { AIModel, Exchange, CreateTraderRequest, Strategy } from '../types'
import { useLanguage } from '../contexts/LanguageContext'
import { t } from '../i18n/translations'
import { toast } from 'sonner'
import { Pencil, Plus, X as IconX, Sparkles, ExternalLink, UserPlus } from 'lucide-react'
import { httpClient } from '../lib/httpClient'

// 提取下划线后面的名称部分
function getShortName(fullName: string): string {
  const parts = fullName.split('_')
  return parts.length > 1 ? parts[parts.length - 1] : fullName
}

// 交易所官网链接配置
const EXCHANGE_REGISTRATION_LINKS: Record<string, { url: string; hasReferral?: boolean }> = {
  binance: { url: 'https://www.binance.com' },
  okx: { url: 'https://www.okx.com' },
  bybit: { url: 'https://www.bybit.com' },
  hyperliquid: { url: 'https://app.hyperliquid.xyz' },
  aster: { url: 'https://www.asterdex.com' },
  lighter: { url: 'https://app.lighter.xyz' },
}

import type { TraderConfigData } from '../types'

// 表单内部状态类型
interface FormState {
  trader_id?: string
  trader_name: string
  ai_model: string
  fallback_ai_model: string
  exchange_id: string
  strategy_id: string
  is_cross_margin: boolean
  show_in_competition: boolean
  scan_interval_minutes: number
  initial_balance?: number
}

interface TraderConfigModalProps {
  isOpen: boolean
  onClose: () => void
  traderData?: TraderConfigData | null
  isEditMode?: boolean
  availableModels?: AIModel[]
  availableExchanges?: Exchange[]
  onSave?: (data: CreateTraderRequest) => Promise<void>
}

export function TraderConfigModal({
  isOpen,
  onClose,
  traderData,
  isEditMode = false,
  availableModels = [],
  availableExchanges = [],
  onSave,
}: TraderConfigModalProps) {
  const { language } = useLanguage()
  const [formData, setFormData] = useState<FormState>({
    trader_name: '',
    ai_model: '',
    fallback_ai_model: '',
    exchange_id: '',
    strategy_id: '',
    is_cross_margin: true,
    show_in_competition: true,
    scan_interval_minutes: 3,
  })
  const [isSaving, setIsSaving] = useState(false)
  const [strategies, setStrategies] = useState<Strategy[]>([])
  const [isFetchingBalance, setIsFetchingBalance] = useState(false)
  const [balanceFetchError, setBalanceFetchError] = useState<string>('')

  // 获取用户的策略列表
  useEffect(() => {
    const fetchStrategies = async () => {
      try {
        const result = await httpClient.get<{ strategies: Strategy[] }>('/api/strategies')
        if (result.success && result.data?.strategies) {
          const strategyList = result.data.strategies
          setStrategies(strategyList)
          // 如果没有选择策略，默认选中激活的策略
          if (!formData.strategy_id && !isEditMode) {
            const activeStrategy = strategyList.find(s => s.is_active)
            if (activeStrategy) {
              setFormData(prev => ({ ...prev, strategy_id: activeStrategy.id }))
            } else if (strategyList.length > 0) {
              setFormData(prev => ({ ...prev, strategy_id: strategyList[0].id }))
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch strategies:', error)
      }
    }
    if (isOpen) {
      fetchStrategies()
    }
  }, [isOpen])

  useEffect(() => {
    if (traderData) {
      setFormData({
        ...traderData,
        strategy_id: traderData.strategy_id || '',
        fallback_ai_model: traderData.fallback_ai_model || '',
      })
    } else if (!isEditMode) {
      setFormData({
        trader_name: '',
        ai_model: availableModels[0]?.id || '',
        fallback_ai_model: '',
        exchange_id: availableExchanges[0]?.id || '',
        strategy_id: '',
        is_cross_margin: true,
        show_in_competition: true,
        scan_interval_minutes: 3,
      })
    }
  }, [traderData, isEditMode, availableModels, availableExchanges])

  if (!isOpen) return null

  const handleInputChange = (field: keyof FormState, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleFetchCurrentBalance = async () => {
    if (!isEditMode || !traderData?.trader_id) {
       setBalanceFetchError(t('fetchBalanceEditModeOnly', language))
      return
    }

    setIsFetchingBalance(true)
    setBalanceFetchError('')

    try {
      const result = await httpClient.get<{
        total_equity?: number
        balance?: number
      }>(`/api/account?trader_id=${traderData.trader_id}`)

      if (result.success && result.data) {
        const currentBalance =
          result.data.total_equity || result.data.balance || 0
        setFormData((prev) => ({ ...prev, initial_balance: currentBalance }))
        toast.success(t('balanceFetched', language))
      } else {
        throw new Error(result.message || t('balanceFetchFailed', language))
      }
    } catch (error) {
      console.error(t('balanceFetchFailed', language) + ':', error)
       setBalanceFetchError(t('balanceFetchNetworkError', language))
    } finally {
      setIsFetchingBalance(false)
    }
  }

  const handleSave = async () => {
    if (!onSave) return

    setIsSaving(true)
    try {
      const saveData: CreateTraderRequest = {
        name: formData.trader_name,
        ai_model_id: formData.ai_model,
        fallback_ai_model_id: formData.fallback_ai_model,
        exchange_id: formData.exchange_id,
        strategy_id: formData.strategy_id,
        is_cross_margin: formData.is_cross_margin,
        show_in_competition: formData.show_in_competition,
        scan_interval_minutes: formData.scan_interval_minutes,
      }

      // 只在编辑模式时包含initial_balance
      if (isEditMode && formData.initial_balance !== undefined) {
        saveData.initial_balance = formData.initial_balance
      }

      await toast.promise(onSave(saveData), {
        loading: t('saving', language),
        success: t('saveSuccess', language),
        error: t('saveFailed', language),
      })
      onClose()
    } catch (error) {
       console.error(t('saveFailed', language) + ':', error)
    } finally {
      setIsSaving(false)
    }
  }

  const selectedStrategy = strategies.find(s => s.id === formData.strategy_id)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto">
      <div
        className="bg-white border border-slate-200 rounded-2xl shadow-xl max-w-2xl w-full my-8"
        style={{ maxHeight: 'calc(100vh - 4rem)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-slate-50/50 sticky top-0 z-10 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              {isEditMode ? (
                <Pencil className="w-5 h-5" />
              ) : (
                <Plus className="w-5 h-5" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {isEditMode ? t('editTrader', language) : t('createTrader', language)}
              </h2>
              <p className="text-sm text-slate-500 mt-0.5">
                {isEditMode ? t('editTraderConfig', language) : t('selectStrategyAndConfigParams', language)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors flex items-center justify-center font-bold"
          >
            <IconX className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div
          className="p-6 space-y-6 overflow-y-auto"
          style={{ maxHeight: 'calc(100vh - 16rem)' }}
        >
          {/* Basic Info */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
            <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <span className="text-blue-600">1</span> {t('basicConfig', language)}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">
                  {t('traderNameRequired', language)}
                </label>
                <input
                  type="text"
                  value={formData.trader_name}
                  onChange={(e) =>
                    handleInputChange('trader_name', e.target.value)
                  }
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all shadow-sm"
                  placeholder={t('enterTraderNamePlaceholder', language)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1.5">
                    {t('aiModelRequired', language)}
                  </label>
                  <select
                    value={formData.ai_model}
                    onChange={(e) =>
                      handleInputChange('ai_model', e.target.value)
                    }
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all shadow-sm"
                  >
                    {availableModels.map((model) => (
                      <option key={model.id} value={model.id}>
                        {getShortName(model.name || model.id).toUpperCase()}
                      </option>
                    ))}
                  </select>

                  {/* 备用模型（可选）：主模型调用失败时接管 */}
                  <label className="text-sm font-medium text-slate-700 block mt-3 mb-1.5">
                    {language === 'zh' ? '备用模型（可选）' : 'Fallback Model (optional)'}
                  </label>
                  <select
                    value={formData.fallback_ai_model}
                    onChange={(e) =>
                      handleInputChange('fallback_ai_model', e.target.value)
                    }
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all shadow-sm"
                  >
                    <option value="">{language === 'zh' ? '不启用' : 'Disabled'}</option>
                    {availableModels
                      .filter((model) => model.id !== formData.ai_model)
                      .map((model) => (
                        <option key={model.id} value={model.id}>
                          {getShortName(model.name || model.id).toUpperCase()}
                        </option>
                      ))}
                  </select>
                  <p className="text-xs text-slate-500 mt-1">
                    {language === 'zh'
                      ? '主模型调用失败时接管（快速失败会先重试一次）'
                      : 'Takes over when the primary call fails (fast failures retry once first)'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1.5">
                    {t('exchangeRequired', language)}
                  </label>
                  <select
                    value={formData.exchange_id}
                    onChange={(e) =>
                      handleInputChange('exchange_id', e.target.value)
                    }
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all shadow-sm"
                  >
                    {availableExchanges.map((exchange) => (
                      <option key={exchange.id} value={exchange.id}>
                        {getShortName(exchange.name || exchange.exchange_type || exchange.id).toUpperCase()}
                        {exchange.account_name ? ` - ${exchange.account_name}` : ''}
                      </option>
                    ))}
                  </select>
                  {/* Exchange Registration Link */}
                  {formData.exchange_id && (() => {
                    // Find the selected exchange to get its type
                    const selectedExchange = availableExchanges.find(e => e.id === formData.exchange_id)
                    const exchangeType = selectedExchange?.exchange_type?.toLowerCase() || ''
                    const regLink = EXCHANGE_REGISTRATION_LINKS[exchangeType]
                    if (!regLink) return null
                    return (
                      <a
                        href={regLink.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 transition-colors"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>{t('noExchangeAccount', language)}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )
                  })()}
                </div>
              </div>
            </div>
          </div>

          {/* Strategy Selection */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
            <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <span className="text-blue-600">2</span> {t('selectTradingStrategy', language)}
              <Sparkles className="w-4 h-4 text-blue-600" />
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">
                  {t('useStrategy', language)}
                </label>
                <select
                  value={formData.strategy_id}
                  onChange={(e) =>
                    handleInputChange('strategy_id', e.target.value)
                  }
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all shadow-sm"
                >
                  <option value="">{t('noStrategyManual', language)}</option>
                  {strategies.map((strategy) => (
                    <option key={strategy.id} value={strategy.id}>
                      {strategy.name}
                      {strategy.is_active ? t('activeTag', language) : ''}
                      {strategy.is_default ? t('default', language) : ''}
                    </option>
                  ))}
                </select>
                {strategies.length === 0 && (
                  <p className="text-xs text-slate-500 mt-2">
                    {t('noStrategyHint', language)}
                  </p>
                )}
              </div>

              {/* Strategy Preview */}
              {selectedStrategy && (
                <div className="mt-3 p-4 bg-white border border-slate-200 rounded-lg shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-blue-600 text-sm font-semibold">
                      {t('strategyDetails', language)}
                    </span>
                    {selectedStrategy.is_active && (
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs rounded border border-emerald-200 font-medium">
                        {t('activating', language)}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-600 mb-2">
                    {selectedStrategy.description || (language === 'zh' ? '无描述' : 'No description')}
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
                    <div>
                      {t('coinSource', language)}: {selectedStrategy.config.coin_source.source_type === 'static' ? '固定币种' :
                        selectedStrategy.config.coin_source.source_type === 'ai500' ? 'AI500' :
                        selectedStrategy.config.coin_source.source_type === 'oi_top' ? 'OI Top' : '混合'}
                    </div>
                    <div>
                      {t('marginLimit', language)}: {((selectedStrategy.config.risk_control?.max_margin_usage || 0.9) * 100).toFixed(0)}%
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Trading Parameters */}
          <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-5">
            <h3 className="text-base font-semibold text-slate-900 mb-5 flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs font-bold">3</span> {t('tradingParams', language)}
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-2">
                    {t('marginMode', language)}
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleInputChange('is_cross_margin', true)}
                      className={`flex-1 px-3 py-2 rounded text-sm font-medium transition-colors ${
                        formData.is_cross_margin
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-white text-slate-600 border border-[#E2E8F0] hover:bg-slate-100'
                      }`}
                    >
                      {t('crossMargin', language)}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleInputChange('is_cross_margin', false)
                      }
                      className={`flex-1 px-3 py-2 rounded text-sm font-medium transition-colors ${
                        !formData.is_cross_margin
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-white text-slate-600 border border-[#E2E8F0] hover:bg-slate-100'
                      }`}
                    >
                      {t('isolatedMargin', language)}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-2">
                    {t('aiScanInterval', language)}
                  </label>
                  <input
                    type="number"
                    value={formData.scan_interval_minutes}
                    onChange={(e) => {
                      const parsedValue = Number(e.target.value)
                      const safeValue = Number.isFinite(parsedValue)
                        ? Math.max(3, parsedValue)
                        : 3
                      handleInputChange('scan_interval_minutes', safeValue)
                    }}
                    className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded text-slate-900 focus:border-blue-500 focus:outline-none"
                    min="3"
                    max="60"
                    step="1"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    {t('scanIntervalRecommend', language)}
                  </p>
                </div>
              </div>

              {/* Competition visibility */}
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">
                  {t('competitionDisplay', language)}
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleInputChange('show_in_competition', true)}
                    className={`flex-1 px-3 py-2 rounded text-sm font-medium transition-colors ${
                      formData.show_in_competition
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-white text-slate-600 border border-[#E2E8F0] hover:bg-slate-100'
                    }`}
                  >
                    {t('show', language)}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInputChange('show_in_competition', false)}
                    className={`flex-1 px-3 py-2 rounded text-sm font-medium transition-colors ${
                      !formData.show_in_competition
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-white text-slate-600 border border-[#E2E8F0] hover:bg-slate-100'
                    }`}
                  >
                    {t('hide', language)}
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {t('hiddenInCompetition', language)}
                </p>
              </div>

              {/* Initial Balance (Edit mode only) */}
              {isEditMode && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-slate-700">
                      {t('initialBalanceLabel', language)}
                    </label>
                    <button
                      type="button"
                      onClick={handleFetchCurrentBalance}
                      disabled={isFetchingBalance}
                      className="px-3 py-1 text-xs bg-blue-50 text-blue-600 border border-blue-200 rounded hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                    >
                      {isFetchingBalance ? t('fetching', language) : t('fetchCurrentBalance', language)}
                    </button>
                  </div>
                  <input
                    type="number"
                    value={formData.initial_balance || 0}
                    onChange={(e) =>
                      handleInputChange(
                        'initial_balance',
                        Number(e.target.value)
                      )
                    }
                    className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded text-slate-900 focus:border-blue-500 focus:outline-none"
                    min="100"
                    step="0.01"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    {t('balanceUpdateHint', language)}
                  </p>
                  {balanceFetchError && (
                    <p className="text-xs text-red-500 mt-1">
                      {balanceFetchError}
                    </p>
                  )}
                </div>
              )}

              {/* Create mode info */}
              {!isEditMode && (
                <div className="p-3 bg-blue-50/60 border border-blue-100 rounded flex items-center gap-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-4 h-4 text-blue-600"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" x2="12" y1="8" y2="12" />
                    <line x1="12" x2="12.01" y1="16" y2="16" />
                  </svg>
                  <span className="text-sm text-slate-600">
                    {t('autoFetchBalanceInfo', language)}
                  </span>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-[#E2E8F0] bg-white sticky bottom-0 z-10 rounded-b-xl">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-all duration-200 border border-slate-300 font-medium text-sm"
          >
            {t('cancel', language)}
          </button>
          {onSave && (
            <button
              onClick={handleSave}
              disabled={
                isSaving ||
                !formData.trader_name ||
                !formData.ai_model ||
                !formData.exchange_id
              }
              className="px-8 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm shadow-sm"
            >
              {isSaving ? t('saving', language) : isEditMode ? t('editTrader', language) : t('createTraderButton', language)}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
