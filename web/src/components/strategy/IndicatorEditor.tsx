import { Clock, Activity, TrendingUp, BarChart2, Info, Lock } from 'lucide-react'
import type { IndicatorConfig } from '../../types'

interface IndicatorEditorProps {
  config: IndicatorConfig
  onChange: (config: IndicatorConfig) => void
  disabled?: boolean
  language: string
}

// 所有可用时间周期
const allTimeframes = [
  { value: '1m', label: '1m', category: 'scalp' },
  { value: '3m', label: '3m', category: 'scalp' },
  { value: '5m', label: '5m', category: 'scalp' },
  { value: '15m', label: '15m', category: 'intraday' },
  { value: '30m', label: '30m', category: 'intraday' },
  { value: '1h', label: '1h', category: 'intraday' },
  { value: '2h', label: '2h', category: 'swing' },
  { value: '4h', label: '4h', category: 'swing' },
  { value: '6h', label: '6h', category: 'swing' },
  { value: '8h', label: '8h', category: 'swing' },
  { value: '12h', label: '12h', category: 'swing' },
  { value: '1d', label: '1D', category: 'position' },
  { value: '3d', label: '3D', category: 'position' },
  { value: '1w', label: '1W', category: 'position' },
]

export function IndicatorEditor({
  config,
  onChange,
  disabled,
  language,
}: IndicatorEditorProps) {
  const t = (key: string) => {
    const translations: Record<string, Record<string, string>> = {
      // Section titles
      marketData: { zh: '市场数据', en: 'Market Data' },
      marketDataDesc: { zh: 'AI 分析所需的核心价格数据', en: 'Core price data for AI analysis' },
      technicalIndicators: { zh: '技术指标', en: 'Technical Indicators' },
      technicalIndicatorsDesc: { zh: '可选的技术分析指标，AI 可自行计算', en: 'Optional indicators, AI can calculate them' },
      marketSentiment: { zh: '市场情绪', en: 'Market Sentiment' },
      marketSentimentDesc: { zh: '持仓量、资金费率等市场情绪数据', en: 'OI, funding rate and market sentiment data' },

      // Timeframes
      timeframes: { zh: '时间周期', en: 'Timeframes' },
      timeframesDesc: { zh: '选择 K 线分析周期，★ 为主周期（双击设置）', en: 'Select K-line timeframes, ★ = primary (double-click)' },
      klineCount: { zh: 'K 线数量', en: 'K-line Count' },
      perTimeframeCount: { zh: '每周期数量', en: 'Per-timeframe Count' },
      perTimeframeCountDesc: { zh: '留空则使用上方默认值', en: 'Empty = use the default above' },
      scalp: { zh: '超短', en: 'Scalp' },
      intraday: { zh: '日内', en: 'Intraday' },
      swing: { zh: '波段', en: 'Swing' },
      position: { zh: '趋势', en: 'Position' },

      // Data types
      rawKlines: { zh: 'OHLCV 原始 K 线', en: 'Raw OHLCV K-lines' },
      rawKlinesDesc: { zh: '必须 - 开高低收量原始数据，AI 核心分析依据', en: 'Required - Open/High/Low/Close/Volume data for AI' },
      required: { zh: '必须', en: 'Required' },

      // Indicators
      ema: { zh: 'EMA 均线', en: 'EMA' },
      emaDesc: { zh: '指数移动平均线', en: 'Exponential Moving Average' },
      macd: { zh: 'MACD', en: 'MACD' },
      macdDesc: { zh: '异同移动平均线', en: 'Moving Average Convergence Divergence' },
      rsi: { zh: 'RSI', en: 'RSI' },
      rsiDesc: { zh: '相对强弱指标', en: 'Relative Strength Index' },
      atr: { zh: 'ATR', en: 'ATR' },
      atrDesc: { zh: '真实波幅均值', en: 'Average True Range' },
      boll: { zh: 'BOLL 布林带', en: 'Bollinger Bands' },
      bollDesc: { zh: '布林带指标（上中下轨）', en: 'Upper/Middle/Lower Bands' },
      orderFlow: { zh: '订单流 (Order Flow)', en: 'Order Flow' },
      orderFlowDesc: { zh: '1h/15m 主动买卖差 (Bar Delta)', en: '1h/15m taker buy/sell delta' },
      volume: { zh: '成交量', en: 'Volume' },
      volumeDesc: { zh: '交易量分析', en: 'Trading volume analysis' },
      oi: { zh: '持仓量', en: 'Open Interest' },
      oiDesc: { zh: '合约未平仓量', en: 'Futures open interest' },
      fundingRate: { zh: '资金费率', en: 'Funding Rate' },
      fundingRateDesc: { zh: '永续合约资金费率', en: 'Perpetual funding rate' },

      // Common settings
      duration: { zh: '周期', en: 'Duration' },
      limit: { zh: '数量', en: 'Limit' },

      // Tips
      aiCanCalculate: { zh: '💡 提示：AI 可自行计算这些指标，开启可减少 AI 计算量', en: '💡 Tip: AI can calculate these, enabling reduces AI workload' },
    }
    return translations[key]?.[language] || key
  }

  // 获取当前选中的时间周期
  const selectedTimeframes = config.klines.selected_timeframes || [config.klines.primary_timeframe]

  // 切换时间周期选择
  const toggleTimeframe = (tf: string) => {
    if (disabled) return
    const current = [...selectedTimeframes]
    const index = current.indexOf(tf)

    if (index >= 0) {
      if (current.length > 1) {
        current.splice(index, 1)
        const newPrimary = tf === config.klines.primary_timeframe ? current[0] : config.klines.primary_timeframe
        onChange({
          ...config,
          klines: {
            ...config.klines,
            selected_timeframes: current,
            primary_timeframe: newPrimary,
            enable_multi_timeframe: current.length > 1,
          },
        })
      }
    } else {
      current.push(tf)
      onChange({
        ...config,
        klines: {
          ...config.klines,
          selected_timeframes: current,
          enable_multi_timeframe: current.length > 1,
        },
      })
    }
  }

  // 设置主时间周期
  const setPrimaryTimeframe = (tf: string) => {
    if (disabled) return
    onChange({
      ...config,
      klines: {
        ...config.klines,
        primary_timeframe: tf,
      },
    })
  }

  const categoryColors: Record<string, string> = {
    scalp: '#F6465D',
    intraday: '#F0B90B',
    swing: '#0ECB81',
    position: '#60a5fa',
  }

  // Ensure enable_raw_klines is always true
  const ensureRawKlines = () => {
    if (!config.enable_raw_klines) {
      onChange({ ...config, enable_raw_klines: true })
    }
  }

  // Call on mount if needed
  if (config.enable_raw_klines === undefined || config.enable_raw_klines === false) {
    ensureRawKlines()
  }

  return (
    <div className="space-y-5">

      {/* ============================================ */}
      {/* Section 1: Market Data (Required)           */}
      {/* ============================================ */}
      <div className="rounded-xl overflow-hidden bg-white border border-[#E2E8F0] shadow-sm">
        <div className="px-4 py-2.5 flex items-center gap-2 bg-[#F8FAFC] border-b border-[#E2E8F0]">
          <BarChart2 className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-semibold text-slate-900">{t('marketData')}</span>
          <span className="text-xs text-slate-500">- {t('marketDataDesc')}</span>
        </div>

        <div className="p-3 space-y-4">
          {/* Raw Klines - Required, Always On */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50/70 border border-blue-200">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-100">
                <TrendingUp className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-900">{t('rawKlines')}</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-medium flex items-center gap-1 bg-blue-100 text-blue-700">
                    <Lock className="w-2.5 h-2.5" />
                    {t('required')}
                  </span>
                </div>
                <p className="text-xs mt-0.5 text-slate-500">{t('rawKlinesDesc')}</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={true}
              disabled={true}
              className="w-5 h-5 rounded accent-blue-600 cursor-not-allowed"
            />
          </div>

          {/* Timeframe Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-xs font-semibold text-slate-800">{t('timeframes')}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-500">{t('klineCount')}:</span>
                <input
                  type="number"
                  value={config.klines.primary_count}
                  onChange={(e) =>
                    !disabled &&
                    onChange({
                      ...config,
                      klines: { ...config.klines, primary_count: parseInt(e.target.value) || 30 },
                    })
                  }
                  disabled={disabled}
                  min={10}
                  max={200}
                  className="w-16 px-2 py-1 rounded text-xs text-center bg-white border border-[#E2E8F0] text-slate-900 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
            <p className="text-[10px] mb-2 text-slate-500">{t('timeframesDesc')}</p>

            {/* Timeframe Grid */}
            <div className="space-y-1.5">
              {(['scalp', 'intraday', 'swing', 'position'] as const).map((category) => {
                const categoryTfs = allTimeframes.filter((tf) => tf.category === category)
                return (
                  <div key={category} className="flex items-center gap-2">
                    <span className="text-[10px] w-10 flex-shrink-0 font-medium" style={{ color: categoryColors[category] }}>
                      {t(category)}
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {categoryTfs.map((tf) => {
                        const isSelected = selectedTimeframes.includes(tf.value)
                        const isPrimary = config.klines.primary_timeframe === tf.value
                        return (
                          <button
                            key={tf.value}
                            onClick={() => toggleTimeframe(tf.value)}
                            onDoubleClick={() => setPrimaryTimeframe(tf.value)}
                            disabled={disabled}
                            className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                              isSelected ? '' : 'opacity-60 hover:opacity-100 bg-white'
                            }`}
                            style={{
                              background: isSelected ? `${categoryColors[category]}15` : '#FFFFFF',
                              border: `1px solid ${isSelected ? categoryColors[category] : '#E2E8F0'}`,
                              color: isSelected ? categoryColors[category] : '#64748B',
                              boxShadow: isPrimary ? `0 0 0 2px ${categoryColors[category]}` : undefined,
                            }}
                            title={isPrimary ? `${tf.label} (Primary)` : tf.label}
                          >
                            {tf.label}
                            {isPrimary && <span className="ml-0.5 text-[8px]">★</span>}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="mt-3 pt-3 border-t border-[#E2E8F0]">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-semibold text-slate-800">{t('perTimeframeCount')}</span>
                <span className="text-[10px] text-slate-500">{t('perTimeframeCountDesc')}</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {selectedTimeframes.map((tf) => (
                  <div
                    key={tf}
                    className="flex items-center justify-between gap-1 px-2 py-1 rounded bg-[#F8FAFC] border border-[#E2E8F0]"
                  >
                    <span className="text-[10px] font-medium text-slate-600">{tf}</span>
                    <input
                      type="number"
                      value={config.klines.counts_by_timeframe?.[tf] ?? ''}
                      placeholder={String(config.klines.primary_count)}
                      onChange={(e) => {
                        if (disabled) return
                        const raw = e.target.value
                        const next = { ...(config.klines.counts_by_timeframe || {}) }
                        if (raw === '') {
                          delete next[tf]
                        } else {
                          next[tf] = parseInt(raw) || config.klines.primary_count
                        }
                        onChange({ ...config, klines: { ...config.klines, counts_by_timeframe: next } })
                      }}
                      disabled={disabled}
                      min={10}
                      max={200}
                      className="w-12 px-1 py-0.5 rounded text-[10px] text-center bg-white border border-[#E2E8F0] text-slate-900 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* Section 2: Technical Indicators (Optional)  */}
      {/* ============================================ */}
      <div className="rounded-xl overflow-hidden bg-white border border-[#E2E8F0] shadow-sm">
        <div className="px-4 py-2.5 flex items-center gap-2 bg-[#F8FAFC] border-b border-[#E2E8F0]">
          <Activity className="w-4 h-4 text-emerald-600" />
          <span className="text-sm font-semibold text-slate-900">{t('technicalIndicators')}</span>
          <span className="text-xs text-slate-500">- {t('technicalIndicatorsDesc')}</span>
        </div>

        <div className="p-3">
          {/* Tip */}
          <div className="flex items-start gap-2 mb-3 p-2 rounded bg-emerald-50/60 border border-emerald-200">
            <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-emerald-600" />
            <p className="text-[10px] text-emerald-800">{t('aiCanCalculate')}</p>
          </div>

          {/* Indicator Grid */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { key: 'enable_ema', label: 'ema', desc: 'emaDesc', color: '#2563EB', periodKey: 'ema_periods', defaultPeriods: '20,50' },
              { key: 'enable_macd', label: 'macd', desc: 'macdDesc', color: '#8B5CF6' },
              { key: 'enable_rsi', label: 'rsi', desc: 'rsiDesc', color: '#DC2626', periodKey: 'rsi_periods', defaultPeriods: '7,14' },
              { key: 'enable_atr', label: 'atr', desc: 'atrDesc', color: '#0284C7', periodKey: 'atr_periods', defaultPeriods: '14' },
              { key: 'enable_boll', label: 'boll', desc: 'bollDesc', color: '#DB2777', periodKey: 'boll_periods', defaultPeriods: '20' },
              { key: 'enable_order_flow', label: 'orderFlow', desc: 'orderFlowDesc', color: '#F59E0B' },
            ].map(({ key, label, desc, color, periodKey, defaultPeriods }) => (
              <div
                key={key}
                className="p-2.5 rounded-lg transition-all"
                style={{
                  background: config[key as keyof IndicatorConfig] ? `${color}08` : '#FFFFFF',
                  border: `1px solid ${config[key as keyof IndicatorConfig] ? `${color}40` : '#E2E8F0'}`,
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                    <span className="text-xs font-semibold text-slate-800">{t(label)}</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={config[key as keyof IndicatorConfig] as boolean || false}
                    onChange={(e) => !disabled && onChange({ ...config, [key]: e.target.checked })}
                    disabled={disabled}
                    className="w-4 h-4 rounded accent-blue-600"
                  />
                </div>
                <p className="text-[10px] mb-1.5 text-slate-500">{t(desc)}</p>
                {periodKey && config[key as keyof IndicatorConfig] && (
                  <input
                    type="text"
                    value={(config[periodKey as keyof IndicatorConfig] as number[])?.join(',') || defaultPeriods}
                    onChange={(e) => {
                      if (disabled) return
                      const periods = e.target.value
                        .split(',')
                        .map((s) => parseInt(s.trim()))
                        .filter((n) => !isNaN(n) && n > 0)
                      onChange({ ...config, [periodKey]: periods })
                    }}
                    disabled={disabled}
                    placeholder={defaultPeriods}
                    className="w-full px-2 py-1 rounded text-[10px] text-center bg-white border border-[#E2E8F0] text-slate-900 focus:border-blue-500 focus:outline-none"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* Section 3: Market Sentiment                 */}
      {/* ============================================ */}
      <div className="rounded-xl overflow-hidden bg-white border border-[#E2E8F0] shadow-sm">
        <div className="px-4 py-2.5 flex items-center gap-2 bg-[#F8FAFC] border-b border-[#E2E8F0]">
          <TrendingUp className="w-4 h-4 text-emerald-600" />
          <span className="text-sm font-semibold text-slate-900">{t('marketSentiment')}</span>
          <span className="text-xs text-slate-500">- {t('marketSentimentDesc')}</span>
        </div>

        <div className="p-3">
          <div className="grid grid-cols-2 gap-2">
            {[
              { key: 'enable_oi', label: 'oi', desc: 'oiDesc', color: '#059669' },
              { key: 'enable_funding_rate', label: 'fundingRate', desc: 'fundingRateDesc', color: '#D97706' },
            ].map(({ key, label, desc, color }) => (
              <div
                key={key}
                className="p-2.5 rounded-lg transition-all"
                style={{
                  background: config[key as keyof IndicatorConfig] ? `${color}08` : '#FFFFFF',
                  border: `1px solid ${config[key as keyof IndicatorConfig] ? `${color}40` : '#E2E8F0'}`,
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                    <span className="text-xs font-semibold text-slate-800">{t(label)}</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={config[key as keyof IndicatorConfig] as boolean || false}
                    onChange={(e) => !disabled && onChange({ ...config, [key]: e.target.checked })}
                    disabled={disabled}
                    className="w-4 h-4 rounded accent-blue-600"
                  />
                </div>
                <p className="text-[10px] text-slate-500">{t(desc)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
