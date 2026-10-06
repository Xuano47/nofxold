import { useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import useSWR from 'swr'
import { api } from '../lib/api'
import { useLanguage } from '../contexts/LanguageContext'
import { useAuth } from '../contexts/AuthContext'
import { t } from '../i18n/translations'
import {
  AlertTriangle,
  BarChart3,
  DollarSign,
  Percent,
  TrendingUp as ArrowUp,
  TrendingDown as ArrowDown,
} from 'lucide-react'

interface EquityPoint {
  timestamp: string
  total_equity: number
  pnl: number
  pnl_pct: number
  cycle_number: number
}

interface EquityChartProps {
  traderId?: string
  embedded?: boolean // 嵌入模式（不显示外层卡片）
}

export function EquityChart({ traderId, embedded = false }: EquityChartProps) {
  const { language } = useLanguage()
  const { user, token } = useAuth()
  const [displayMode, setDisplayMode] = useState<'dollar' | 'percent'>('dollar')

  const { data: history, error, isLoading } = useSWR<EquityPoint[]>(
    user && token && traderId ? `equity-history-${traderId}` : null,
    () => api.getEquityHistory(traderId),
    {
      refreshInterval: 30000, // 30秒刷新（历史数据更新频率较低）
      revalidateOnFocus: false,
      dedupingInterval: 20000,
    }
  )

  const { data: account } = useSWR(
    user && token && traderId ? `account-${traderId}` : null,
    () => api.getAccount(traderId),
    {
      refreshInterval: 15000, // 15秒刷新（配合后端缓存）
      revalidateOnFocus: false,
      dedupingInterval: 10000,
    }
  )

  // Loading state - show skeleton
  if (isLoading) {
    return (
      <div className={embedded ? 'p-6' : 'binance-card p-6'}>
        {!embedded && (
          <h3 className="text-lg font-semibold mb-6" style={{ color: '#0F172A' }}>
            {t('accountEquityCurve', language)}
          </h3>
        )}
        <div className="animate-pulse">
          <div className="skeleton h-64 w-full rounded"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={embedded ? 'p-6' : 'binance-card p-6'}>
        <div
          className="flex items-center gap-3 p-4 rounded"
          style={{
            background: 'rgba(220, 38, 38, 0.08)',
            border: '1px solid rgba(220, 38, 38, 0.2)',
          }}
        >
          <AlertTriangle className="w-6 h-6" style={{ color: '#DC2626' }} />
          <div>
            <div className="font-semibold" style={{ color: '#DC2626' }}>
              {t('loadingError', language)}
            </div>
            <div className="text-sm" style={{ color: '#64748B' }}>
              {error.message}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 过滤掉无效数据：total_equity为0或小于1的数据点（API失败导致）
  const validHistory = history?.filter((point) => point.total_equity > 1) || []

  if (!validHistory || validHistory.length === 0) {
    return (
      <div className={embedded ? 'p-6' : 'binance-card p-6'}>
        {!embedded && (
          <h3 className="text-lg font-semibold mb-6" style={{ color: '#0F172A' }}>
            {t('accountEquityCurve', language)}
          </h3>
        )}
        <div className="text-center py-16" style={{ color: '#64748B' }}>
          <div className="mb-4 flex justify-center opacity-50">
            <BarChart3 className="w-16 h-16" />
          </div>
          <div className="text-lg font-semibold mb-2" style={{ color: '#0F172A' }}>
            {t('noHistoricalData', language)}
          </div>
          <div className="text-sm">{t('dataWillAppear', language)}</div>
        </div>
      </div>
    )
  }

  // 限制显示最近的数据点（性能优化）
  // 如果数据超过2000个点，只显示最近2000个
  const MAX_DISPLAY_POINTS = 2000
  const displayHistory =
    validHistory.length > MAX_DISPLAY_POINTS
      ? validHistory.slice(-MAX_DISPLAY_POINTS)
      : validHistory

  // 计算初始余额（优先从 account 获取配置的初始余额，备选从历史数据反推）
  const initialBalance =
    account?.initial_balance || // 从交易员配置读取真实初始余额
    (validHistory[0]
      ? validHistory[0].total_equity - validHistory[0].pnl
      : undefined) || // 备选：淨值 - 盈亏
    1000 // 默认值（与创建交易员时的默认配置一致）

  // 转换数据格式
  const chartData = displayHistory.map((point, index) => {
    const pnl = point.total_equity - initialBalance
    const pnlPct = ((pnl / initialBalance) * 100).toFixed(2)
    return {
      time: new Date(point.timestamp).toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      value: displayMode === 'dollar' ? point.total_equity : parseFloat(pnlPct),
      cycle: point.cycle_number ?? index + 1,
      raw_equity: point.total_equity,
      raw_pnl: pnl,
      raw_pnl_pct: parseFloat(pnlPct),
    }
  })

  const currentValue = chartData[chartData.length - 1]
  const isProfit = currentValue.raw_pnl >= 0

  // 计算Y轴范围
  const calculateYDomain = () => {
    if (displayMode === 'percent') {
      // 百分比模式：找到最大最小值，留20%余量
      const values = chartData.map((d) => d.value)
      const minVal = Math.min(...values)
      const maxVal = Math.max(...values)
      const range = Math.max(Math.abs(maxVal), Math.abs(minVal))
      const padding = Math.max(range * 0.2, 1) // 至少留1%余量
      return [Math.floor(minVal - padding), Math.ceil(maxVal + padding)]
    } else {
      // 美元模式：以初始余额为基准，上下留10%余量
      const values = chartData.map((d) => d.value)
      const minVal = Math.min(...values, initialBalance)
      const maxVal = Math.max(...values, initialBalance)
      const range = maxVal - minVal
      const padding = Math.max(range * 0.15, initialBalance * 0.01) // 至少留1%余量
      return [Math.floor(minVal - padding), Math.ceil(maxVal + padding)]
    }
  }

  // 自定义Tooltip - Clean Financial Style
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div
          className="rounded-lg p-3 shadow-lg"
          style={{ background: '#FFFFFF', border: '1px solid #E2E8F0' }}
        >
          <div className="text-xs mb-1" style={{ color: '#64748B' }}>
            Cycle #{data.cycle != null ? data.cycle : '—'}
          </div>
          <div className="font-bold mono text-base" style={{ color: '#0F172A' }}>
            {data.raw_equity.toFixed(2)} USDT
          </div>
          <div
            className="text-sm mono font-bold"
            style={{ color: data.raw_pnl >= 0 ? '#16A34A' : '#DC2626' }}
          >
            {data.raw_pnl >= 0 ? '+' : ''}
            {data.raw_pnl.toFixed(2)} USDT ({data.raw_pnl_pct >= 0 ? '+' : ''}
            {data.raw_pnl_pct}%)
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <div className={embedded ? 'p-3 sm:p-5' : 'binance-card p-3 sm:p-5 animate-fade-in'}>
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div className="flex-1">
          {!embedded && (
            <h3
              className="text-base sm:text-lg font-bold mb-2"
              style={{ color: '#0F172A' }}
            >
              {t('accountEquityCurve', language)}
            </h3>
          )}
          <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-4">
            <span
              className="text-2xl sm:text-3xl font-bold mono"
              style={{ color: '#0F172A' }}
            >
              {account?.total_equity.toFixed(2) || '0.00'}
              <span
                className="text-base sm:text-lg ml-1 font-normal"
                style={{ color: '#64748B' }}
              >
                USDT
              </span>
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="text-sm sm:text-lg font-bold mono px-2 sm:px-3 py-1 rounded flex items-center gap-1"
                style={{
                  color: isProfit ? '#16A34A' : '#DC2626',
                  background: isProfit
                    ? 'rgba(22, 163, 74, 0.08)'
                    : 'rgba(220, 38, 38, 0.08)',
                  border: `1px solid ${
                    isProfit
                      ? 'rgba(22, 163, 74, 0.25)'
                      : 'rgba(220, 38, 38, 0.25)'
                  }`,
                }}
              >
                {isProfit ? (
                  <ArrowUp className="w-4 h-4" />
                ) : (
                  <ArrowDown className="w-4 h-4" />
                )}
                {isProfit ? '+' : ''}
                {currentValue.raw_pnl_pct}%
              </span>
              <span
                className="text-xs sm:text-sm mono"
                style={{ color: '#64748B' }}
              >
                ({isProfit ? '+' : ''}
                {currentValue.raw_pnl.toFixed(2)} USDT)
              </span>
            </div>
          </div>
        </div>

        {/* Display Mode Toggle */}
        <div
          className="flex gap-0.5 sm:gap-1 rounded-lg p-0.5 sm:p-1 self-start sm:self-auto"
          style={{ background: '#F1F5F9', border: '1px solid #E2E8F0' }}
        >
          <button
            onClick={() => setDisplayMode('dollar')}
            className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-bold transition-all flex items-center gap-1"
            style={
              displayMode === 'dollar'
                ? {
                    background: '#2563EB',
                    color: '#FFFFFF',
                    boxShadow: '0 1px 3px rgba(37, 99, 235, 0.25)',
                  }
                : { background: 'transparent', color: '#64748B' }
            }
          >
            <DollarSign className="w-4 h-4" /> USDT
          </button>
          <button
            onClick={() => setDisplayMode('percent')}
            className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-bold transition-all flex items-center gap-1"
            style={
              displayMode === 'percent'
                ? {
                    background: '#2563EB',
                    color: '#FFFFFF',
                    boxShadow: '0 1px 3px rgba(37, 99, 235, 0.25)',
                  }
                : { background: 'transparent', color: '#64748B' }
            }
          >
            <Percent className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Chart */}
      <div
        className="my-2"
        style={{
          borderRadius: '8px',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* BUNNY TRADE Watermark */}
        <div
          style={{
            position: 'absolute',
            top: '15px',
            right: '15px',
            fontSize: '16px',
            fontWeight: 'bold',
            color: 'rgba(100, 116, 139, 0.12)',
            zIndex: 10,
            pointerEvents: 'none',
            letterSpacing: '0.05em',
          }}
        >
          BUNNY TRADE
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart
            data={chartData}
            margin={{ top: 10, right: 20, left: 5, bottom: 30 }}
          >
            <defs>
              <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2563EB" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.2} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
            <XAxis
              dataKey="time"
              stroke="#CBD5E1"
              tick={{ fill: '#64748B', fontSize: 11 }}
              tickLine={{ stroke: '#E2E8F0' }}
              interval={Math.floor(chartData.length / 10)}
              angle={-15}
              textAnchor="end"
              height={60}
            />
            <YAxis
              stroke="#CBD5E1"
              tick={{ fill: '#64748B', fontSize: 12 }}
              tickLine={{ stroke: '#E2E8F0' }}
              domain={calculateYDomain()}
              tickFormatter={(value) =>
                displayMode === 'dollar' ? `$${value.toFixed(0)}` : `${value}%`
              }
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine
              y={displayMode === 'dollar' ? initialBalance : 0}
              stroke="#94A3B8"
              strokeDasharray="3 3"
              label={{
                value:
                  displayMode === 'dollar'
                    ? t('initialBalance', language).split(' ')[0]
                    : '0%',
                fill: '#64748B',
                fontSize: 12,
              }}
            />
            <Line
              type="natural"
              dataKey="value"
              stroke="#2563EB"
              strokeWidth={2.5}
              dot={chartData.length > 50 ? false : { fill: '#2563EB', r: 3 }}
              activeDot={{
                r: 6,
                fill: '#1D4ED8',
                stroke: '#FFFFFF',
                strokeWidth: 2,
              }}
              connectNulls={true}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Footer Stats */}
      <div
        className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 pt-3"
        style={{ borderTop: '1px solid #E2E8F0' }}
      >
        <div
          className="p-2.5 rounded-lg transition-all"
          style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}
        >
          <div
            className="text-xs mb-1 uppercase tracking-wider font-medium"
            style={{ color: '#64748B' }}
          >
            {t('initialBalance', language)}
          </div>
          <div
            className="text-xs sm:text-sm font-bold mono"
            style={{ color: '#0F172A' }}
          >
            {initialBalance.toFixed(2)} USDT
          </div>
        </div>
        <div
          className="p-2.5 rounded-lg transition-all"
          style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}
        >
          <div
            className="text-xs mb-1 uppercase tracking-wider font-medium"
            style={{ color: '#64748B' }}
          >
            {t('currentEquity', language)}
          </div>
          <div
            className="text-xs sm:text-sm font-bold mono"
            style={{ color: '#0F172A' }}
          >
            {currentValue.raw_equity.toFixed(2)} USDT
          </div>
        </div>
        <div
          className="p-2.5 rounded-lg transition-all"
          style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}
        >
          <div
            className="text-xs mb-1 uppercase tracking-wider font-medium"
            style={{ color: '#64748B' }}
          >
            {t('historicalCycles', language)}
          </div>
          <div
            className="text-xs sm:text-sm font-bold mono"
            style={{ color: '#0F172A' }}
          >
            {validHistory.length} {t('cycles', language)}
          </div>
        </div>
        <div
          className="p-2.5 rounded-lg transition-all"
          style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}
        >
          <div
            className="text-xs mb-1 uppercase tracking-wider font-medium"
            style={{ color: '#64748B' }}
          >
            {t('displayRange', language)}
          </div>
          <div
            className="text-xs sm:text-sm font-bold mono"
            style={{ color: '#0F172A' }}
          >
            {validHistory.length > MAX_DISPLAY_POINTS
              ? `${t('recent', language)} ${MAX_DISPLAY_POINTS}`
              : t('allData', language)}
          </div>
        </div>
      </div>
    </div>
  )
}
