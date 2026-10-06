import type { TraderConfigData } from '../types'

// 提取下划线后面的名称部分
function getShortName(fullName: string): string {
  const parts = fullName.split('_')
  return parts.length > 1 ? parts[parts.length - 1] : fullName
}

interface TraderConfigViewModalProps {
  isOpen: boolean
  onClose: () => void
  traderData?: TraderConfigData | null
}

export function TraderConfigViewModal({
  isOpen,
  onClose,
  traderData,
}: TraderConfigViewModalProps) {
  if (!isOpen || !traderData) return null

  const InfoRow = ({
    label,
    value,
  }: {
    label: string
    value: string | number | boolean
  }) => (
    <div className="flex justify-between items-start py-2.5 border-b border-slate-100 last:border-b-0">
      <span className="text-sm text-slate-500 font-medium">{label}</span>
      <span className="text-sm text-slate-900 font-mono font-semibold text-right">
        {typeof value === 'boolean' ? (value ? '是' : '否') : value}
      </span>
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div
        className="bg-white border border-slate-200 rounded-2xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-slate-50/50">
          <div>
            <h2 className="text-xl font-bold text-slate-900">交易员配置</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              {traderData.trader_name} 的配置信息
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Running Status */}
            <div
              className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 border ${
                traderData.is_running
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-red-50 text-red-700 border-red-200'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${traderData.is_running ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
              {traderData.is_running ? '运行中' : '已停止'}
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors flex items-center justify-center font-bold"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
            <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              🤖 基础信息
            </h3>
            <div className="space-y-1">
              <InfoRow
                label="交易员名称"
                value={traderData.trader_name}
              />
              <InfoRow
                label="AI模型"
                value={getShortName(traderData.ai_model).toUpperCase()}
              />
              <InfoRow
                label="交易所"
                value={getShortName(traderData.exchange_id).toUpperCase()}
              />
              <InfoRow
                label="初始余额"
                value={`$${traderData.initial_balance.toLocaleString()}`}
              />
              <InfoRow
                label="保证金模式"
                value={traderData.is_cross_margin ? '全仓' : '逐仓'}
              />
              <InfoRow
                label="扫描间隔"
                value={`${traderData.scan_interval_minutes || 3} 分钟`}
              />
            </div>
          </div>

          {/* Strategy Info - only show if strategy is bound */}
          {traderData.strategy_id && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
              <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                📋 使用策略
              </h3>
              <div className="space-y-1">
                <InfoRow
                  label="策略名称"
                  value={traderData.strategy_name || traderData.strategy_id}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end p-5 border-t border-slate-200 bg-slate-50/50">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-white text-slate-700 rounded-lg hover:bg-slate-100 transition-all font-semibold border border-slate-300 shadow-sm"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  )
}
