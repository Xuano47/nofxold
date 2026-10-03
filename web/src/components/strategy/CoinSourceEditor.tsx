import { useState } from 'react'
import { Plus, X, Ban } from 'lucide-react'
import type { CoinSourceConfig } from '../../types'

interface CoinSourceEditorProps {
  config: CoinSourceConfig
  onChange: (config: CoinSourceConfig) => void
  disabled?: boolean
  language: string
}

// 币种来源只剩手动列表：AI500 / OI 增减榜来自第三方付费数据源（已移除），
// Hyperliquid 筛选只存在于已移除的数据来源选择器里 —— 两者都已下线，
// 老配置由后端回退到手动列表（kernel/engine.go GetCandidateCoins）。
export function CoinSourceEditor({
  config,
  onChange,
  disabled,
  language,
}: CoinSourceEditorProps) {
  const [newCoin, setNewCoin] = useState('')
  const [newExcludedCoin, setNewExcludedCoin] = useState('')

  const t = (key: string) => {
    const translations: Record<string, Record<string, string>> = {
      staticCoins: { zh: '自定义币种', en: 'Custom Coins' },
      addCoin: { zh: '添加币种', en: 'Add Coin' },
      excludedCoins: { zh: '排除币种', en: 'Excluded Coins' },
      excludedCoinsDesc: {
        zh: '这些币种将从候选列表中排除，不会被交易',
        en: 'These coins are excluded from the candidate list and will not be traded',
      },
      addExcludedCoin: { zh: '添加排除', en: 'Add Excluded' },
    }
    return translations[key]?.[language] || key
  }

  // 任何编辑都把 source_type 归一化为 static —— 老配置里可能残留 ai500 / oi_top 等类型
  const update = (patch: Partial<CoinSourceConfig>) =>
    onChange({ ...config, source_type: 'static', ...patch })

  // xyz dex assets (stocks, forex, commodities) - should NOT get USDT suffix
  const xyzDexAssets = new Set([
    // Stocks
    'TSLA', 'NVDA', 'AAPL', 'MSFT', 'META', 'AMZN', 'GOOGL', 'AMD', 'COIN', 'NFLX',
    'PLTR', 'HOOD', 'INTC', 'MSTR', 'TSM', 'ORCL', 'MU', 'RIVN', 'COST', 'LLY',
    'CRCL', 'SKHX', 'SNDK',
    // Forex
    'EUR', 'JPY',
    // Commodities
    'GOLD', 'SILVER',
    // Index
    'XYZ100',
  ])

  const isXyzDexAsset = (symbol: string): boolean => {
    const base = symbol.toUpperCase().replace(/^XYZ:/, '').replace(/USDT$|USD$|-USDC$/, '')
    return xyzDexAssets.has(base)
  }

  const handleAddCoin = () => {
    if (!newCoin.trim()) return
    const symbol = newCoin.toUpperCase().trim()

    // For xyz dex assets (stocks, forex, commodities), use xyz: prefix without USDT
    let formattedSymbol: string
    if (isXyzDexAsset(symbol)) {
      // Remove xyz: prefix (case-insensitive) and any USD suffixes
      const base = symbol.replace(/^xyz:/i, '').replace(/USDT$|USD$|-USDC$/i, '')
      formattedSymbol = `xyz:${base}`
    } else {
      formattedSymbol = symbol.endsWith('USDT') ? symbol : `${symbol}USDT`
    }

    const currentCoins = config.static_coins || []
    if (!currentCoins.includes(formattedSymbol)) {
      update({ static_coins: [...currentCoins, formattedSymbol] })
    }
    setNewCoin('')
  }

  const handleRemoveCoin = (coin: string) => {
    update({
      static_coins: (config.static_coins || []).filter((c) => c !== coin),
    })
  }

  const handleAddExcludedCoin = () => {
    if (!newExcludedCoin.trim()) return
    const symbol = newExcludedCoin.toUpperCase().trim()

    // For xyz dex assets, use xyz: prefix without USDT
    let formattedSymbol: string
    if (isXyzDexAsset(symbol)) {
      const base = symbol.replace(/^xyz:/i, '').replace(/USDT$|USD$|-USDC$/i, '')
      formattedSymbol = `xyz:${base}`
    } else {
      formattedSymbol = symbol.endsWith('USDT') ? symbol : `${symbol}USDT`
    }

    const currentExcluded = config.excluded_coins || []
    if (!currentExcluded.includes(formattedSymbol)) {
      update({ excluded_coins: [...currentExcluded, formattedSymbol] })
    }
    setNewExcludedCoin('')
  }

  const handleRemoveExcludedCoin = (coin: string) => {
    update({
      excluded_coins: (config.excluded_coins || []).filter((c) => c !== coin),
    })
  }

  return (
    <div className="space-y-6">
      {/* 自定义币种 */}
      <div>
        <label className="block text-sm font-medium mb-3 text-nofx-text">
          {t('staticCoins')}
        </label>
        <div className="flex flex-wrap gap-2 mb-3">
          {(config.static_coins || []).map((coin) => (
            <span
              key={coin}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm bg-nofx-bg-lighter text-nofx-text"
            >
              {coin}
              {!disabled && (
                <button
                  onClick={() => handleRemoveCoin(coin)}
                  className="ml-1 hover:text-red-400 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </span>
          ))}
        </div>
        {!disabled && (
          <div className="flex gap-2">
            <input
              type="text"
              value={newCoin}
              onChange={(e) => setNewCoin(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddCoin()}
              placeholder="BTC, ETH, SOL..."
              className="flex-1 px-4 py-2 rounded-lg bg-nofx-bg border border-nofx-gold/20 text-nofx-text"
            />
            <button
              onClick={handleAddCoin}
              className="px-4 py-2 rounded-lg flex items-center gap-2 transition-colors bg-nofx-gold text-black hover:bg-yellow-500"
            >
              <Plus className="w-4 h-4" />
              {t('addCoin')}
            </button>
          </div>
        )}
      </div>

      {/* Excluded Coins */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Ban className="w-4 h-4 text-nofx-danger" />
          <label className="text-sm font-medium text-nofx-text">
            {t('excludedCoins')}
          </label>
        </div>
        <p className="text-xs mb-3 text-nofx-text-muted">
          {t('excludedCoinsDesc')}
        </p>
        <div className="flex flex-wrap gap-2 mb-3">
          {(config.excluded_coins || []).map((coin) => (
            <span
              key={coin}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm bg-nofx-danger/15 text-nofx-danger"
            >
              {coin}
              {!disabled && (
                <button
                  onClick={() => handleRemoveExcludedCoin(coin)}
                  className="ml-1 hover:text-white transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </span>
          ))}
          {(config.excluded_coins || []).length === 0 && (
            <span className="text-xs italic text-nofx-text-muted">
              {language === 'zh' ? '无' : 'None'}
            </span>
          )}
        </div>
        {!disabled && (
          <div className="flex gap-2">
            <input
              type="text"
              value={newExcludedCoin}
              onChange={(e) => setNewExcludedCoin(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddExcludedCoin()}
              placeholder="BTC, ETH, DOGE..."
              className="flex-1 px-4 py-2 rounded-lg text-sm bg-nofx-bg border border-nofx-gold/20 text-nofx-text"
            />
            <button
              onClick={handleAddExcludedCoin}
              className="px-4 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm bg-nofx-danger text-white hover:bg-red-600"
            >
              <Ban className="w-4 h-4" />
              {t('addExcludedCoin')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}