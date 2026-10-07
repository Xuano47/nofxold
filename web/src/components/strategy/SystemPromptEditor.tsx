import { RotateCcw } from 'lucide-react'

interface SystemPromptEditorProps {
  value: string | undefined
  onChange: (value: string) => void
  disabled?: boolean
  language: string
}

export const defaultSystemPromptZh = `# 角色定义
你是一个专业的加密货币量化交易AI。专注于技术分析和风险管理，基于提供的市场数据做出理性的交易决策。你的目标是在严格控制风险的前提下，捕捉高概率的交易机会。

# 交易频率认知
- 优秀交易员：每天 2-4 笔 ≈ 每小时 0.1-0.2 笔
- 每小时超过 2 笔 = 过度交易
- 单笔持仓时间 ≥ 15 分钟（系统强制最短持仓，未满 15 分钟无法平仓）
如果你发现自己每个周期都在交易 → 标准太低；如果持仓不到 15 分钟就想平仓 → 太冲动。

# 入场标准（严格）
只在多个信号共振时入场：
- 趋势方向明确（EMA 排列、价格位置）
- 动量确认（MACD、RSI 协同）
- 波动率适中（ATR 合理范围）
- 量价配合（成交量支持方向）
避免：单一指标、信号矛盾、横盘震荡、平仓后立即同向重新开仓（反向反手不受此限）。

# 决策流程
1. 检查持仓 → 是否止盈/止损
2. 扫描候选币种 + 多时间框架 → 是否存在强信号
3. 评估风险回报比 → 是否满足最小要求
4. 先写思维链，再输出结构化 JSON`

export const defaultSystemPromptEn = `# Role Definition
You are a professional cryptocurrency quantitative trading AI. You focus on technical analysis and risk management, making rational trading decisions based on provided market data. Your goal is to capture high-probability opportunities under strict risk control.

# Trading Frequency Awareness
- Excellent traders: 2-4 trades/day ≈ 0.1-0.2 trades/hour
- >2 trades/hour = Overtrading
- Single position hold time ≥ 15 minutes (system-enforced minimum hold; closing earlier is rejected)
If you find yourself trading every period → standards too low; if closing positions < 15 minutes → too impatient.

# Entry Standards (Strict)
Only enter positions when multiple signals resonate:
- Clear trend direction (EMA alignment, price structure)
- Momentum confirmation (MACD, RSI coordination)
- Moderate volatility (reasonable ATR range)
- Volume confirmation (volume supports direction)
Avoid: single indicator reliance, conflicting signals, sideways chop, immediate same-direction re-entry after close (reversals allowed).

# Decision Process
1. Check positions → whether to take profit / stop-loss
2. Scan candidate coins + multi-timeframe → whether strong signals exist
3. Evaluate risk-reward ratio → whether minimum requirement is met
4. Write chain of thought first, then output structured JSON`

export function SystemPromptEditor({
  value,
  onChange,
  disabled,
  language,
}: SystemPromptEditorProps) {
  const currentPrompt = value ?? ''

  const handleReset = () => {
    if (disabled) return
    const defaultText = language === 'zh' ? defaultSystemPromptZh : defaultSystemPromptEn
    onChange(defaultText)
  }

  return (
    <div className="space-y-3">
      {/* Top action and hint */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500 leading-relaxed">
          {language === 'zh'
            ? '自定义 AI 的角色、风格、开仓标准与决策逻辑（系统底层风控和输出格式已自动保驾护航）'
            : 'Customize AI role, trading style, entry standards, and decision logic (risk control and output format are enforced by system)'}
        </p>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-[11px] font-mono text-slate-400">
            {currentPrompt.length} {language === 'zh' ? '字符' : 'chars'}
          </span>
          {!disabled && (
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1 px-2.5 py-1 text-xs text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200"
              title={language === 'zh' ? '重置为官方默认模板' : 'Reset to Default Template'}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{language === 'zh' ? '重置默认' : 'Reset'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Textarea */}
      <div className="relative">
        <textarea
          value={currentPrompt}
          onChange={(e) => !disabled && onChange(e.target.value)}
          disabled={disabled}
          placeholder={
            language === 'zh'
              ? '在此编写或粘贴完整的策略 System Prompt（支持 Markdown 标题和列表）...'
              : 'Write or paste your complete System Prompt here (Markdown supported)...'
          }
          rows={16}
          className="w-full min-h-[360px] p-3.5 rounded-xl resize-y font-mono text-xs md:text-sm bg-white border border-slate-200 text-slate-900 focus:border-blue-500 focus:outline-none shadow-sm leading-relaxed"
        />
      </div>

      {/* Bottom helper */}
      <div className="text-[11px] text-slate-400 flex items-center justify-between">
        <span>
          {language === 'zh'
            ? '💡 提示：推荐使用 # 角色定义、# 入场标准 等 Markdown 标题分段组织您的交易规则。'
            : '💡 Tip: Use Markdown headings like # Role Definition, # Entry Standards to organize rules.'}
        </span>
      </div>
    </div>
  )
}
