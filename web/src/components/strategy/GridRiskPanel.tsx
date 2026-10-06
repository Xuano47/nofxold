import { useState, useEffect, useCallback } from 'react'
import { Shield, TrendingUp, AlertTriangle, Activity, Box, ChevronDown, ChevronUp } from 'lucide-react'
import type { GridRiskInfo } from '../../types'

interface GridRiskPanelProps {
  traderId: string
  language?: string
  refreshInterval?: number // ms, default 5000
}

export function GridRiskPanel({
  traderId,
  language = 'en',
  refreshInterval = 5000,
}: GridRiskPanelProps) {
  const [riskInfo, setRiskInfo] = useState<GridRiskInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)

  const t = (key: string) => {
    const translations: Record<string, Record<string, string>> = {
      // Section titles
      gridRisk: { zh: '网格风控', en: 'Grid Risk' },
      leverageInfo: { zh: '杠杆', en: 'Leverage' },
      positionInfo: { zh: '仓位', en: 'Position' },
      liquidationInfo: { zh: '清算', en: 'Liquidation' },
      marketState: { zh: '市场', en: 'Market' },
      boxState: { zh: '箱体', en: 'Box' },

      // Leverage
      currentLeverage: { zh: '当前', en: 'Current' },
      effectiveLeverage: { zh: '有效', en: 'Effective' },
      recommendedLeverage: { zh: '建议', en: 'Recommend' },

      // Position
      currentPosition: { zh: '当前', en: 'Current' },
      maxPosition: { zh: '最大', en: 'Max' },
      positionPercent: { zh: '占比', en: 'Usage' },

      // Liquidation
      liquidationPrice: { zh: '清算价', en: 'Liq Price' },
      liquidationDistance: { zh: '距离', en: 'Distance' },

      // Market
      regimeLevel: { zh: '波动', en: 'Regime' },
      currentPrice: { zh: '价格', en: 'Price' },
      breakoutLevel: { zh: '突破', en: 'Breakout' },
      breakoutDirection: { zh: '方向', en: 'Direction' },

      // Box
      shortBox: { zh: '短期', en: 'Short' },
      midBox: { zh: '中期', en: 'Mid' },
      longBox: { zh: '长期', en: 'Long' },

      // Regime levels
      narrow: { zh: '窄幅', en: 'Narrow' },
      standard: { zh: '标准', en: 'Standard' },
      wide: { zh: '宽幅', en: 'Wide' },
      volatile: { zh: '剧烈', en: 'Volatile' },
      trending: { zh: '趋势', en: 'Trending' },

      // Breakout levels
      none: { zh: '无', en: 'None' },
      short: { zh: '短期', en: 'Short' },
      mid: { zh: '中期', en: 'Mid' },
      long: { zh: '长期', en: 'Long' },

      // Directions
      up: { zh: '↑', en: '↑' },
      down: { zh: '↓', en: '↓' },

      // Status
      loading: { zh: '加载中...', en: 'Loading...' },
      error: { zh: '加载失败', en: 'Load Failed' },
      noData: { zh: '暂无数据', en: 'No Data' },
    }
    return translations[key]?.[language] || key
  }

  const fetchRiskInfo = useCallback(async () => {
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch(`/api/traders/${traderId}/grid-risk`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()
      setRiskInfo(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [traderId])

  useEffect(() => {
    fetchRiskInfo()
    const interval = setInterval(fetchRiskInfo, refreshInterval)
    return () => clearInterval(interval)
  }, [fetchRiskInfo, refreshInterval])

  const getRegimeColor = (regime: string) => {
    switch (regime) {
      case 'narrow': return '#16A34A'
      case 'standard': return '#2563EB'
      case 'wide': return '#D97706'
      case 'volatile': return '#DC2626'
      case 'trending': return '#7C3AED'
      default: return '#64748B'
    }
  }

  const getBreakoutColor = (level: string) => {
    switch (level) {
      case 'none': return '#16A34A'
      case 'short': return '#2563EB'
      case 'mid': return '#D97706'
      case 'long': return '#DC2626'
      default: return '#64748B'
    }
  }

  const getPositionColor = (percent: number) => {
    if (percent < 50) return '#16A34A'
    if (percent < 80) return '#D97706'
    return '#DC2626'
  }

  const formatPrice = (price: number) => {
    if (price === 0) return '-'
    if (price >= 1000) return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    if (price >= 1) return price.toFixed(4)
    return price.toFixed(6)
  }

  const formatUSD = (value: number) => {
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
  }

  if (loading) {
    return (
      <div className="p-3 text-center text-xs text-slate-400">
        {t('loading')}
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-3 text-center text-xs text-red-600">
        {t('error')}: {error}
      </div>
    )
  }

  if (!riskInfo) {
    return (
      <div className="p-3 text-center text-xs text-slate-400">
        {t('noData')}
      </div>
    )
  }

  return (
    <div className="rounded-xl bg-white border border-[#E2E8F0] shadow-sm overflow-hidden">
      {/* Collapsible Header */}
      <div
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-blue-600" />
          <span className="font-semibold text-sm text-slate-900">
            {t('gridRisk')}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {/* Summary badges when collapsed */}
          <div className="flex items-center gap-2 text-xs">
            <span
              className="px-2 py-0.5 rounded font-medium"
              style={{ background: getRegimeColor(riskInfo.regime_level) + '15', color: getRegimeColor(riskInfo.regime_level) }}
            >
              {t(riskInfo.regime_level || 'standard')}
            </span>
            <span className="font-mono text-slate-700 font-semibold">
              {riskInfo.effective_leverage.toFixed(1)}x
            </span>
            <span
              className="font-mono font-bold"
              style={{ color: getPositionColor(riskInfo.position_percent) }}
            >
              {riskInfo.position_percent.toFixed(0)}%
            </span>
          </div>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="px-3 pb-3 space-y-3 pt-1 border-t border-[#F1F5F9]">
          {/* Row 1: Leverage & Position */}
          <div className="grid grid-cols-2 gap-3">
            {/* Leverage */}
            <div className="p-2.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
              <div className="flex items-center gap-1.5 mb-2">
                <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
                <span className="text-xs font-semibold text-slate-700">{t('leverageInfo')}</span>
              </div>
              <div className="grid grid-cols-3 gap-1 text-xs">
                <div>
                  <div className="text-slate-400 text-[11px]">{t('currentLeverage')}</div>
                  <div className="font-mono font-semibold text-slate-800">{riskInfo.current_leverage}x</div>
                </div>
                <div>
                  <div className="text-slate-400 text-[11px]">{t('effectiveLeverage')}</div>
                  <div className="font-mono font-semibold text-blue-600">{riskInfo.effective_leverage.toFixed(2)}x</div>
                </div>
                <div>
                  <div className="text-slate-400 text-[11px]">{t('recommendedLeverage')}</div>
                  <div
                    className="font-mono font-semibold"
                    style={{ color: riskInfo.current_leverage > riskInfo.recommended_leverage ? '#DC2626' : '#16A34A' }}
                  >
                    {riskInfo.recommended_leverage}x
                  </div>
                </div>
              </div>
            </div>

            {/* Position */}
            <div className="p-2.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
              <div className="flex items-center gap-1.5 mb-2">
                <Activity className="w-3.5 h-3.5 text-blue-600" />
                <span className="text-xs font-semibold text-slate-700">{t('positionInfo')}</span>
              </div>
              <div className="grid grid-cols-3 gap-1 text-xs">
                <div>
                  <div className="text-slate-400 text-[11px]">{t('currentPosition')}</div>
                  <div className="font-mono font-semibold text-slate-800">{formatUSD(riskInfo.current_position)}</div>
                </div>
                <div>
                  <div className="text-slate-400 text-[11px]">{t('maxPosition')}</div>
                  <div className="font-mono font-semibold text-slate-800">{formatUSD(riskInfo.max_position)}</div>
                </div>
                <div>
                  <div className="text-slate-400 text-[11px]">{t('positionPercent')}</div>
                  <div className="font-mono font-bold" style={{ color: getPositionColor(riskInfo.position_percent) }}>
                    {riskInfo.position_percent.toFixed(1)}%
                  </div>
                </div>
              </div>
              {/* Mini progress bar */}
              <div className="h-1.5 mt-2 rounded-full overflow-hidden bg-slate-200">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${Math.min(riskInfo.position_percent, 100)}%`, background: getPositionColor(riskInfo.position_percent) }}
                />
              </div>
            </div>
          </div>

          {/* Row 2: Market State & Liquidation */}
          <div className="grid grid-cols-2 gap-3">
            {/* Market State */}
            <div className="p-2.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
              <div className="flex items-center gap-1.5 mb-2">
                <Shield className="w-3.5 h-3.5 text-blue-600" />
                <span className="text-xs font-semibold text-slate-700">{t('marketState')}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <div className="text-slate-400 text-[11px]">{t('regimeLevel')}</div>
                  <div className="font-semibold" style={{ color: getRegimeColor(riskInfo.regime_level) }}>
                    {t(riskInfo.regime_level || 'standard')}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400 text-[11px]">{t('currentPrice')}</div>
                  <div className="font-mono font-semibold text-slate-800">{formatPrice(riskInfo.current_price)}</div>
                </div>
                <div>
                  <div className="text-slate-400 text-[11px]">{t('breakoutLevel')}</div>
                  <div className="font-semibold" style={{ color: getBreakoutColor(riskInfo.breakout_level) }}>
                    {t(riskInfo.breakout_level || 'none')}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400 text-[11px]">{t('breakoutDirection')}</div>
                  <div
                    className="font-bold"
                    style={{ color: riskInfo.breakout_direction === 'up' ? '#16A34A' : riskInfo.breakout_direction === 'down' ? '#DC2626' : '#64748B' }}
                  >
                    {riskInfo.breakout_direction ? t(riskInfo.breakout_direction) : '-'}
                  </div>
                </div>
              </div>
            </div>

            {/* Liquidation */}
            <div className="p-2.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
              <div className="flex items-center gap-1.5 mb-2">
                <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                <span className="text-xs font-semibold text-slate-700">{t('liquidationInfo')}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <div className="text-slate-400 text-[11px]">{t('liquidationPrice')}</div>
                  <div className="font-mono font-bold text-red-600">
                    {riskInfo.liquidation_price > 0 ? formatPrice(riskInfo.liquidation_price) : '-'}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400 text-[11px]">{t('liquidationDistance')}</div>
                  <div className="font-mono font-bold text-red-600">
                    {riskInfo.liquidation_distance > 0 ? `${riskInfo.liquidation_distance.toFixed(1)}%` : '-'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Row 3: Box State */}
          <div className="p-2.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
            <div className="flex items-center gap-1.5 mb-2">
              <Box className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-xs font-semibold text-slate-700">{t('boxState')}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="flex flex-col">
                <span className="text-slate-400 text-[11px]">{t('shortBox')}</span>
                <span className="font-mono text-slate-800 font-semibold">
                  {formatPrice(riskInfo.short_box_lower)} - {formatPrice(riskInfo.short_box_upper)}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-slate-400 text-[11px]">{t('midBox')}</span>
                <span className="font-mono text-slate-800 font-semibold">
                  {formatPrice(riskInfo.mid_box_lower)} - {formatPrice(riskInfo.mid_box_upper)}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-slate-400 text-[11px]">{t('longBox')}</span>
                <span className="font-mono text-slate-800 font-semibold">
                  {formatPrice(riskInfo.long_box_lower)} - {formatPrice(riskInfo.long_box_upper)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
