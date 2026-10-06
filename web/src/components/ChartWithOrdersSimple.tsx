import { useEffect, useState } from 'react'
import { httpClient } from '../lib/httpClient'

interface ChartWithOrdersSimpleProps {
  symbol: string
  interval?: string
  traderID?: string
  height?: number
}

export function ChartWithOrdersSimple({
  symbol = 'BTCUSDT',
  interval = '5m',
  traderID,
  height = 500,
}: ChartWithOrdersSimpleProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [klineCount, setKlineCount] = useState(0)
  const [orderCount, setOrderCount] = useState(0)

  useEffect(() => {
    const loadData = async () => {
      console.log('[ChartSimple] Loading data for', symbol, interval, 'trader:', traderID)
      setLoading(true)
      setError(null)

      try {
        // 从我们自己的服务获取K线数据
        const limit = 100
        const klineUrl = `/api/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`

        console.log('[ChartSimple] Fetching klines from our service:', klineUrl)
        const klineResult = await httpClient.get(klineUrl)

        if (!klineResult.success || !klineResult.data) {
          throw new Error('Failed to fetch klines from our service')
        }

        console.log('[ChartSimple] Received klines:', klineResult.data.length)
        setKlineCount(klineResult.data.length)

        // 测试获取订单数据
        if (traderID) {
          const tradesUrl = `/api/trades?trader_id=${traderID}&symbol=${symbol}&limit=100`
          console.log('[ChartSimple] Fetching trades from:', tradesUrl)
          const tradesResult = await httpClient.get(tradesUrl)

          if (tradesResult.success && tradesResult.data) {
            console.log('[ChartSimple] Received trades:', tradesResult.data.length)
            setOrderCount(tradesResult.data.length)
          } else {
            console.warn('[ChartSimple] Failed to fetch trades:', tradesResult.message || 'Unknown error', tradesResult)
          }
        }

        setLoading(false)
      } catch (err: any) {
        console.error('[ChartSimple] Error:', err)
        setError(err.message || 'Failed to load data')
        setLoading(false)
      }
    }

    loadData()
  }, [symbol, interval, traderID])

  return (
    <div className="relative bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm" style={{ minHeight: height }}>
      {/* 标题栏 */}
      <div className="flex items-center justify-between p-4 border-b border-[#E2E8F0] bg-[#F8FAFC]">
        <div className="flex items-center gap-3">
          <span className="text-xl">📈</span>
          <h3 className="text-lg font-bold text-slate-900">
            {symbol} {interval} (测试模式)
          </h3>
        </div>
        {loading && (
          <div className="text-sm text-slate-500">
            加载中...
          </div>
        )}
      </div>

      {/* 测试信息 */}
      <div className="p-8 space-y-4">
        {error ? (
          <div className="text-center">
            <div className="text-2xl mb-2">⚠️</div>
            <div className="text-red-600 font-medium">{error}</div>
          </div>
        ) : (
          <>
            <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
              <div className="text-sm mb-2 text-slate-500">K线数据</div>
              <div className="text-2xl font-bold text-emerald-600">
                {klineCount} 根K线
              </div>
            </div>

            {traderID && (
              <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                <div className="text-sm mb-2 text-slate-500">历史订单数据</div>
                <div className="text-2xl font-bold text-blue-600">
                  {orderCount} 笔订单
                </div>
              </div>
            )}

            <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
              <div className="text-sm mb-2 text-slate-500">状态</div>
              <div className="text-lg text-slate-800">
                ✅ 数据获取正常，图表组件开发中
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
