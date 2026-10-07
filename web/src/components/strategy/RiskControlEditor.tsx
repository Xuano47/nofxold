import { Shield, AlertTriangle } from 'lucide-react'
import type { RiskControlConfig } from '../../types'

interface RiskControlEditorProps {
  config: RiskControlConfig
  onChange: (config: RiskControlConfig) => void
  disabled?: boolean
  language: string
}

export function RiskControlEditor({
  config,
  onChange,
  disabled,
  language,
}: RiskControlEditorProps) {
  const t = (key: string) => {
    const translations: Record<string, Record<string, string>> = {
      positionLimits: { zh: '仓位限制', en: 'Position Limits' },
      maxPositions: { zh: '最大持仓数量', en: 'Max Positions' },
      maxPositionsDesc: { zh: '同时持有的最大币种数量', en: 'Maximum coins held simultaneously' },
      // Trading leverage (exchange leverage)
      tradingLeverage: { zh: '交易杠杆（交易所杠杆）', en: 'Trading Leverage (Exchange)' },
      maxLeverage: { zh: '交易杠杆（交易所杠杆）', en: 'Trading Leverage (Exchange)' },
      maxLeverageDesc: { zh: '交易所开仓使用的最大杠杆倍数', en: 'Max exchange leverage for opening positions' },
      // Position value ratio (risk control) - CODE ENFORCED
      positionValueRatio: { zh: '单币最大持仓倍数（倍净值）', en: 'Max Position Multiplier (x Equity)' },
      positionValueRatioDesc: { zh: '单币最大名义价值 = 账户净值 × 该倍数，由代码强制执行上限', en: 'Single position notional value = equity × multiplier, enforced by code' },
      maxPositionValueRatio: { zh: '单币最大持仓倍数（倍净值）', en: 'Max Position Multiplier (x Equity)' },
      maxPositionValueRatioDesc: { zh: '单币最大名义价值 = 账户净值 × 该倍数', en: 'Max notional value = equity × this multiplier' },
      riskParameters: { zh: '风险参数', en: 'Risk Parameters' },
      minRiskReward: { zh: '最小风险回报比', en: 'Min Risk/Reward Ratio' },
      minRiskRewardDesc: { zh: '开仓要求的最低盈亏比', en: 'Minimum profit ratio for opening' },
      maxMarginUsage: { zh: '最大保证金使用率（代码强制）', en: 'Max Margin Usage (CODE ENFORCED)' },
      maxMarginUsageDesc: { zh: '保证金使用率上限，由代码强制执行', en: 'Maximum margin utilization, enforced by code' },
      entryRequirements: { zh: '开仓要求', en: 'Entry Requirements' },
      minPositionSize: { zh: '最小开仓金额', en: 'Min Position Size' },
      minPositionSizeDesc: { zh: 'USDT 最小名义价值', en: 'Minimum notional value in USDT' },
      minConfidence: { zh: '最小信心度', en: 'Min Confidence' },
      minConfidenceDesc: { zh: 'AI 开仓信心度阈值', en: 'AI confidence threshold for entry' },
    }
    return translations[key]?.[language] || key
  }

  const updateField = <K extends keyof RiskControlConfig>(
    key: K,
    value: RiskControlConfig[K]
  ) => {
    if (!disabled) {
      onChange({ ...config, [key]: value })
    }
  }

  const currentLeverage = config.max_leverage ?? config.altcoin_max_leverage ?? config.btc_eth_max_leverage ?? 5
  const currentPosRatio = config.max_position_value_ratio ?? config.altcoin_max_position_value_ratio ?? config.btc_eth_max_position_value_ratio ?? 1

  const handleLeverageChange = (val: number) => {
    if (disabled) return
    const newConfig: RiskControlConfig = {
      ...config,
      max_leverage: val,
      btc_eth_max_leverage: val,
      altcoin_max_leverage: val,
    }
    if (currentPosRatio > val) {
      newConfig.max_position_value_ratio = val
      newConfig.btc_eth_max_position_value_ratio = val
      newConfig.altcoin_max_position_value_ratio = val
    }
    onChange(newConfig)
  }

  const handlePosRatioChange = (val: number) => {
    if (disabled) return
    const clampedVal = Math.min(val, currentLeverage)
    onChange({
      ...config,
      max_position_value_ratio: clampedVal,
      btc_eth_max_position_value_ratio: clampedVal,
      altcoin_max_position_value_ratio: clampedVal,
    })
  }

  return (
    <div className="space-y-6">
      {/* Position Limits */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-slate-900">
            {t('positionLimits')}
          </h3>
        </div>

        <div className="grid grid-cols-1 gap-4 mb-4">
          <div className="p-4 rounded-xl bg-white border border-[#E2E8F0] shadow-sm">
            <label className="block text-sm font-semibold mb-1 text-slate-800">
              {t('maxPositions')}
            </label>
            <p className="text-xs mb-2 text-slate-500">
              {t('maxPositionsDesc')}
            </p>
            <input
              type="number"
              value={config.max_positions ?? 3}
              onChange={(e) =>
                updateField('max_positions', parseInt(e.target.value) || 3)
              }
              disabled={disabled}
              min={1}
              max={10}
              className="w-32 px-3 py-2 rounded-lg bg-white border border-[#E2E8F0] text-slate-900 focus:border-blue-500 focus:outline-none text-sm"
            />
          </div>
        </div>

        {/* Trading Leverage (Exchange) */}
        <div className="grid grid-cols-1 gap-4 mb-4">
          <div className="p-4 rounded-xl bg-white border border-[#E2E8F0] shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-semibold text-slate-800">
                {t('maxLeverage')}
              </label>
              <span className="font-mono font-bold text-blue-600 text-sm">
                {currentLeverage}x
              </span>
            </div>
            <p className="text-xs mb-2.5 text-slate-500">
              {t('maxLeverageDesc')}
            </p>
            <div className="flex items-center gap-2">
              <input
                type="range"
                value={currentLeverage}
                onChange={(e) => handleLeverageChange(parseInt(e.target.value) || 5)}
                disabled={disabled}
                min={1}
                max={20}
                className="flex-1 accent-blue-600"
              />
            </div>
          </div>
        </div>

        {/* Position Value Ratio (Risk Control - CODE ENFORCED) */}
        <div className="grid grid-cols-1 gap-4">
          <div className="p-4 rounded-xl bg-white border border-emerald-200 shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <label className="block text-sm font-semibold text-slate-800">
                  {t('maxPositionValueRatio')}
                </label>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                  {language === 'zh' ? '代码强制' : 'CODE ENFORCED'}
                </span>
              </div>
              <span className="font-mono font-bold text-emerald-600 text-sm">
                {Math.min(currentPosRatio, currentLeverage).toFixed(1)}× {language === 'zh' ? '净值' : 'Equity'}
              </span>
            </div>
            <p className="text-xs mb-2.5 text-slate-500">
              {t('maxPositionValueRatioDesc')}
              <span className="text-slate-400 ml-1">
                ({language === 'zh' ? `受限于当前 ${currentLeverage}x 交易杠杆，上限为 ${currentLeverage}× 净值` : `Capped at current ${currentLeverage}x leverage`})
              </span>
            </p>
            <div className="flex items-center gap-2">
              <input
                type="range"
                value={Math.min(currentPosRatio, currentLeverage)}
                onChange={(e) => handlePosRatioChange(parseFloat(e.target.value) || 1)}
                disabled={disabled}
                min={0.5}
                max={currentLeverage}
                step={0.5}
                className="flex-1 accent-emerald-600"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Risk Parameters */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          <h3 className="font-semibold text-slate-900">
            {t('riskParameters')}
          </h3>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-white border border-[#E2E8F0] shadow-sm">
            <label className="block text-sm font-semibold mb-1 text-slate-800">
              {t('minRiskReward')}
            </label>
            <p className="text-xs mb-2 text-slate-500">
              {t('minRiskRewardDesc')}
            </p>
            <div className="flex items-center">
              <span className="text-slate-500 font-semibold">1:</span>
              <input
                type="number"
                value={config.min_risk_reward_ratio ?? 3}
                onChange={(e) =>
                  updateField('min_risk_reward_ratio', parseFloat(e.target.value) || 3)
                }
                disabled={disabled}
                min={1}
                max={10}
                step={0.5}
                className="w-20 px-3 py-2 rounded-lg bg-white border border-[#E2E8F0] text-slate-900 focus:border-blue-500 focus:outline-none ml-2 text-sm"
              />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white border border-emerald-200 shadow-sm">
            <label className="block text-sm font-semibold mb-1 text-slate-800">
              {t('maxMarginUsage')}
            </label>
            <p className="text-xs mb-2 text-slate-500">
              {t('maxMarginUsageDesc')}
            </p>
            <div className="flex items-center gap-2">
              <input
                type="range"
                value={(config.max_margin_usage ?? 0.9) * 100}
                onChange={(e) =>
                  updateField('max_margin_usage', parseInt(e.target.value) / 100)
                }
                disabled={disabled}
                min={10}
                max={100}
                className="flex-1 accent-emerald-600"
              />
              <span className="w-12 text-center font-mono font-bold text-emerald-600">
                {Math.round((config.max_margin_usage ?? 0.9) * 100)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Entry Requirements */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-emerald-600" />
          <h3 className="font-semibold text-slate-900">
            {t('entryRequirements')}
          </h3>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-white border border-[#E2E8F0] shadow-sm">
            <label className="block text-sm font-semibold mb-1 text-slate-800">
              {t('minPositionSize')}
            </label>
            <p className="text-xs mb-2 text-slate-500">
              {t('minPositionSizeDesc')}
            </p>
            <div className="flex items-center">
              <input
                type="number"
                value={config.min_position_size ?? 12}
                onChange={(e) =>
                  updateField('min_position_size', parseFloat(e.target.value) || 12)
                }
                disabled={disabled}
                min={10}
                max={1000}
                className="w-24 px-3 py-2 rounded-lg bg-white border border-[#E2E8F0] text-slate-900 focus:border-blue-500 focus:outline-none text-sm"
              />
              <span className="ml-2 text-slate-500 text-xs font-semibold">
                USDT
              </span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white border border-[#E2E8F0] shadow-sm">
            <label className="block text-sm font-semibold mb-1 text-slate-800">
              {t('minConfidence')}
            </label>
            <p className="text-xs mb-2 text-slate-500">
              {t('minConfidenceDesc')}
            </p>
            <div className="flex items-center gap-2">
              <input
                type="range"
                value={config.min_confidence ?? 75}
                onChange={(e) =>
                  updateField('min_confidence', parseInt(e.target.value))
                }
                disabled={disabled}
                min={50}
                max={100}
                className="flex-1 accent-emerald-600"
              />
              <span className="w-12 text-center font-mono font-bold text-emerald-600">
                {config.min_confidence ?? 75}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
