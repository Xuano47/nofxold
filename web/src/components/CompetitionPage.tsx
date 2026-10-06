import { useState } from 'react'
import { Trophy } from 'lucide-react'
import useSWR from 'swr'
import { api } from '../lib/api'
import type { CompetitionData } from '../types'
import { ComparisonChart } from './ComparisonChart'
import { TraderConfigViewModal } from './TraderConfigViewModal'
import { getTraderColor } from '../utils/traderColors'
import { useLanguage } from '../contexts/LanguageContext'
import { t } from '../i18n/translations'
import { DeepVoidBackground } from './DeepVoidBackground'

export function CompetitionPage() {
  const { language } = useLanguage()
  const [selectedTrader, setSelectedTrader] = useState<any>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const { data: competition } = useSWR<CompetitionData>(
    'competition',
    api.getCompetition,
    {
      refreshInterval: 15000, // 15秒刷新（竞赛数据不需要太频繁更新）
      revalidateOnFocus: false,
      dedupingInterval: 10000,
    }
  )

  const handleTraderClick = async (traderId: string) => {
    try {
      const traderConfig = await api.getTraderConfig(traderId)
      setSelectedTrader(traderConfig)
      setIsModalOpen(true)
    } catch (error) {
      console.error('Failed to fetch trader config:', error)
      // 对于未登录用户，不显示详细配置，这是正常行为
      // 竞赛页面主要用于查看排行榜和基本信息
    }
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setSelectedTrader(null)
  }

  if (!competition) {
    return (
      <DeepVoidBackground className="py-8" disableAnimation>
        <div className="container mx-auto max-w-7xl px-4 md:px-8">
          <div className="space-y-6">
            <div className="animate-pulse bg-white border border-slate-200 rounded-xl p-8 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div className="space-y-3 flex-1">
                  <div className="h-8 w-64 bg-slate-100 rounded"></div>
                  <div className="h-4 w-48 bg-slate-100 rounded"></div>
                </div>
                <div className="h-12 w-32 bg-slate-100 rounded"></div>
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <div className="h-6 w-40 mb-4 bg-slate-100 rounded"></div>
              <div className="space-y-3">
                <div className="h-20 w-full bg-slate-100 rounded"></div>
                <div className="h-20 w-full bg-slate-100 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </DeepVoidBackground>
    )
  }

  // 如果有数据返回但没有交易员，显示空状态
  if (!competition.traders || competition.traders.length === 0) {
    return (
      <DeepVoidBackground className="py-8" disableAnimation>
        <div className="container mx-auto max-w-7xl px-4 md:px-8 space-y-8 animate-fade-in">
          {/* Competition Header - 精简版 */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 md:gap-0">
            <div className="flex items-center gap-3 md:gap-4">
              <div
                className="w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center bg-blue-50 border border-blue-200 shadow-sm"
              >
                <Trophy
                  className="w-6 h-6 md:w-7 md:h-7 text-blue-600"
                />
              </div>
              <div>
                <h1
                  className="text-xl md:text-2xl font-bold flex items-center gap-2 text-slate-900"
                >
                  {t('aiCompetition', language)}
                  <span
                    className="text-xs font-normal px-2 py-1 rounded bg-blue-50 text-blue-600 border border-blue-200"
                  >
                    0 {t('traders', language)}
                  </span>
                </h1>
                <p className="text-xs text-slate-500">
                  {t('liveBattle', language)}
                </p>
              </div>
            </div>
          </div>

          {/* Empty State */}
          <div className="bg-white border border-slate-200 rounded-xl p-16 text-center shadow-sm">
            <Trophy
              className="w-16 h-16 mx-auto mb-4 text-slate-300"
            />
            <h3 className="text-lg font-bold mb-2 text-slate-900">
              {t('noTraders', language)}
            </h3>
            <p className="text-sm text-slate-500">
              {t('createFirstTrader', language)}
            </p>
          </div>
        </div>
      </DeepVoidBackground>
    )
  }

  // 按收益率排序
  const sortedTraders = [...competition.traders].sort(
    (a, b) => b.total_pnl_pct - a.total_pnl_pct
  )

  // 找出领先者
  const leader = sortedTraders[0]

  return (
    <DeepVoidBackground className="py-8" disableAnimation>
      <div className="w-full px-4 md:px-8 space-y-8 animate-fade-in">
        {/* Competition Header - 精简版 */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 md:gap-0">
          <div className="flex items-center gap-3 md:gap-4">
            <div
              className="w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center bg-blue-50 border border-blue-200 shadow-sm"
            >
              <Trophy
                className="w-6 h-6 md:w-7 md:h-7 text-blue-600"
              />
            </div>
            <div>
              <h1
                className="text-xl md:text-2xl font-bold flex items-center gap-2 text-slate-900"
              >
                {t('aiCompetition', language)}
                <span
                  className="text-xs font-normal px-2 py-1 rounded bg-blue-50 text-blue-600 border border-blue-200"
                >
                  {competition.count} {t('traders', language)}
                </span>
              </h1>
              <p className="text-xs text-slate-500">
                {t('liveBattle', language)}
              </p>
            </div>
          </div>
          <div className="text-left md:text-right w-full md:w-auto">
            <div className="text-xs mb-1 text-slate-500">
              {t('leader', language)}
            </div>
            <div
              className="text-base md:text-lg font-bold text-blue-600"
            >
              {leader?.trader_name}
            </div>
            <div
              className="text-sm font-semibold"
              style={{
                color: (leader?.total_pnl ?? 0) >= 0 ? '#16A34A' : '#DC2626',
              }}
            >
              {(leader?.total_pnl ?? 0) >= 0 ? '+' : ''}
              {leader?.total_pnl_pct?.toFixed(2) || '0.00'}%
            </div>
          </div>
        </div>

        {/* Left/Right Split: Performance Chart + Leaderboard */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Performance Comparison Chart */}
          <div
            className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm animate-slide-in transition-colors"
            style={{ animationDelay: '0.1s' }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2
                className="text-lg font-bold flex items-center gap-2 text-slate-900"
              >
                {t('performanceComparison', language)}
              </h2>
              <div className="text-xs text-slate-500">
                {t('realTimePnL', language)}
              </div>
            </div>
            <ComparisonChart traders={sortedTraders.slice(0, 10)} />
          </div>

          {/* Right: Leaderboard */}
          <div
            className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm animate-slide-in transition-colors"
            style={{ animationDelay: '0.1s' }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2
                className="text-lg font-bold flex items-center gap-2 text-slate-900"
              >
                {t('leaderboard', language)}
              </h2>
              <div
                className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-600 border border-blue-200 shadow-sm"
              >
                {t('live', language)}
              </div>
            </div>
            <div className="space-y-2">
              {sortedTraders.map((trader, index) => {
                const isLeader = index === 0
                const traderColor = getTraderColor(
                  sortedTraders,
                  trader.trader_id
                )

                return (
                  <div
                    key={trader.trader_id}
                    onClick={() => handleTraderClick(trader.trader_id)}
                    className="rounded-lg p-3 transition-all duration-200 hover:translate-y-[-1px] cursor-pointer"
                    style={{
                      background: isLeader
                        ? 'linear-gradient(135deg, rgba(37, 99, 235, 0.04) 0%, #FFFFFF 100%)'
                        : '#FFFFFF',
                      border: `1px solid ${isLeader ? 'rgba(37, 99, 235, 0.3)' : '#E2E8F0'}`,
                      boxShadow: isLeader
                        ? '0 2px 8px rgba(37, 99, 235, 0.08)'
                        : '0 1px 3px rgba(0, 0, 0, 0.03)',
                    }}
                  >
                    <div className="flex items-center justify-between">
                      {/* Rank & Avatar & Name */}
                      <div className="flex items-center gap-3">
                        {/* Rank Badge */}
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                          style={{
                            background: index === 0
                              ? 'linear-gradient(135deg, #F0B90B 0%, #FCD535 100%)'
                              : index === 1
                                ? 'linear-gradient(135deg, #CBD5E1 0%, #E2E8F0 100%)'
                                : index === 2
                                  ? 'linear-gradient(135deg, #FDBA74 0%, #FED7AA 100%)'
                                  : '#F1F5F9',
                            color: index < 3 ? '#1E293B' : '#64748B',
                          }}
                        >
                          {index + 1}
                        </div>
                        <div>
                          <div
                            className="font-bold text-sm"
                            style={{ color: '#0F172A' }}
                          >
                            {trader.trader_name}
                          </div>
                          <div
                            className="text-xs mono font-semibold"
                            style={{ color: traderColor }}
                          >
                            {trader.ai_model.toUpperCase()} +{' '}
                            {trader.exchange.toUpperCase()}
                          </div>
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="flex items-center gap-2 md:gap-3 flex-wrap md:flex-nowrap">
                        {/* Total Equity */}
                        <div className="text-right">
                          <div className="text-xs" style={{ color: '#64748B' }}>
                            {t('equity', language)}
                          </div>
                          <div
                            className="text-xs md:text-sm font-bold mono"
                            style={{ color: '#0F172A' }}
                          >
                            {trader.total_equity?.toFixed(2) || '0.00'}
                          </div>
                        </div>

                        {/* P&L */}
                        <div className="text-right min-w-[70px] md:min-w-[90px]">
                          <div className="text-xs" style={{ color: '#64748B' }}>
                            {t('pnl', language)}
                          </div>
                          <div
                            className="text-base md:text-lg font-bold mono"
                            style={{
                              color:
                                (trader.total_pnl ?? 0) >= 0
                                  ? '#16A34A'
                                  : '#DC2626',
                            }}
                          >
                            {(trader.total_pnl ?? 0) >= 0 ? '+' : ''}
                            {trader.total_pnl_pct?.toFixed(2) || '0.00'}%
                          </div>
                          <div
                            className="text-xs mono"
                            style={{ color: '#64748B' }}
                          >
                            {(trader.total_pnl ?? 0) >= 0 ? '+' : ''}
                            {trader.total_pnl?.toFixed(2) || '0.00'}
                          </div>
                        </div>

                        {/* Positions */}
                        <div className="text-right">
                          <div className="text-xs" style={{ color: '#64748B' }}>
                            {t('pos', language)}
                          </div>
                          <div
                            className="text-xs md:text-sm font-bold mono"
                            style={{ color: '#0F172A' }}
                          >
                            {trader.position_count}
                          </div>
                          <div className="text-xs" style={{ color: '#64748B' }}>
                            {trader.margin_used_pct.toFixed(1)}%
                          </div>
                        </div>

                        {/* Status */}
                        <div>
                          <div
                            className="px-2 py-1 rounded text-xs font-bold"
                            style={
                              trader.is_running
                                ? {
                                  background: 'rgba(22, 163, 74, 0.1)',
                                  color: '#16A34A',
                                }
                                : {
                                  background: 'rgba(220, 38, 38, 0.1)',
                                  color: '#DC2626',
                                }
                            }
                          >
                            {trader.is_running ? '●' : '○'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Head-to-Head Stats */}
        {competition.traders.length === 2 && (
          <div
            className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm animate-slide-in"
            style={{ animationDelay: '0.3s' }}
          >
            <h2
              className="text-lg font-bold mb-6 flex items-center gap-2 text-slate-900"
            >
              {t('headToHead', language)}
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {sortedTraders.map((trader, index) => {
                const isWinning = index === 0
                const opponent = sortedTraders[1 - index]

                // Check if both values are valid numbers
                const hasValidData =
                  trader.total_pnl_pct != null &&
                  opponent.total_pnl_pct != null &&
                  !isNaN(trader.total_pnl_pct) &&
                  !isNaN(opponent.total_pnl_pct)

                const gap = hasValidData
                  ? trader.total_pnl_pct - opponent.total_pnl_pct
                  : NaN

                return (
                  <div
                    key={trader.trader_id}
                    className="p-4 rounded-xl transition-all duration-200 hover:scale-[1.01]"
                    style={
                      isWinning
                        ? {
                          background:
                            'linear-gradient(135deg, rgba(22, 163, 74, 0.05) 0%, #FFFFFF 100%)',
                          border: '2px solid rgba(22, 163, 74, 0.3)',
                          boxShadow: '0 2px 8px rgba(22, 163, 74, 0.08)',
                        }
                        : {
                          background: '#FFFFFF',
                          border: '1px solid #E2E8F0',
                          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                        }
                    }
                  >
                    <div className="text-center pt-2">
                      <div
                        className="text-sm md:text-base font-bold mb-2"
                        style={{
                          color: getTraderColor(sortedTraders, trader.trader_id),
                        }}
                      >
                        {trader.trader_name}
                      </div>
                      <div
                        className="text-lg md:text-2xl font-bold mono mb-1"
                        style={{
                          color:
                            (trader.total_pnl ?? 0) >= 0 ? '#16A34A' : '#DC2626',
                        }}
                      >
                        {trader.total_pnl_pct != null &&
                          !isNaN(trader.total_pnl_pct)
                          ? `${trader.total_pnl_pct >= 0 ? '+' : ''}${trader.total_pnl_pct.toFixed(2)}%`
                          : '—'}
                      </div>
                      {hasValidData && isWinning && gap > 0 && (
                        <div
                          className="text-xs font-semibold"
                          style={{ color: '#16A34A' }}
                        >
                          {t('leadingBy', language, { gap: gap.toFixed(2) })}
                        </div>
                      )}
                      {hasValidData && !isWinning && gap < 0 && (
                        <div
                          className="text-xs font-semibold"
                          style={{ color: '#DC2626' }}
                        >
                          {t('behindBy', language, {
                            gap: Math.abs(gap).toFixed(2),
                          })}
                        </div>
                      )}
                      {!hasValidData && (
                        <div
                          className="text-xs font-semibold"
                          style={{ color: '#64748B' }}
                        >
                          —
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Trader Config View Modal */}
        <TraderConfigViewModal
          isOpen={isModalOpen}
          onClose={closeModal}
          traderData={selectedTrader}
        />
      </div>
    </DeepVoidBackground>
  )
}
