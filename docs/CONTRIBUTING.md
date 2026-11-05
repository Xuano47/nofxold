# NOFX 开发与贡献指南

本文档收录针对底层逻辑、提示词渲染、数据一致性及指标计算的二次开发规范与一致性检查清单。

---

## 1. 提示词分层机制与代码映射

系统提示词由两部分组成，修改方式与生效方式截然不同：

| 层级 | 内容 | 修改方式 | 生效方式 |
|---|---|---|---|
| **自定义策略核心（可编辑）** | 角色定义、交易频率认知、入场标准、决策流程 | Web UI 策略工作台 / 数据库 | 保存后热重载，下个交易周期生效 |
| **系统底层保障（不可编辑）** | 数据字典规范（`kernel/schema.go`）、根据实时净值计算的 Hard Constraints（最大持仓数、单币名义限额、统一杠杆）、交易节流与平仓规则（15分钟冷却/最短持仓）、技术指标清单及 JSON 输出 Schema | 修改源码 | 需重新构建容器（`docker compose up -d --build`） |

**运作机制与历史兼容**：
- **统一 Markdown 全文编辑**：Web UI 现已全面升级为统一的 Markdown 全文编辑器（`SystemPromptEditor`），右上角提供「重置默认」按钮可一键恢复最佳实践模板。
- **数据库优先**：新建策略时系统将当时默认模板写入数据库，此后策略仅读数据库副本。若修改代码中的默认模版，仅对**今后新建**的策略生效；已有策略需在 Web UI 中点击「重置默认」或手动编辑保存。

---

## 2. 提示词一致性检查清单（改动前必读）

同一个「事实」在本项目里通常存在于 **4 个地方**，改一处漏一处会导致静默不一致（AI 收到错误提示词或执行逻辑与提示词相悖）：

| 位置 | 示例 |
|---|---|
| 代码配置 / 常量 | `RiskControl.MaxMarginUsage = 0.9`；`autopilotMinHoldDuration = 15min`（`trader/auto_trader_throttle.go`） |
| 提示词文本 | `Max Total Margin Usage: ≤90% of equity`（`kernel/engine.go` 动态渲染）；节流规则文本 |
| UI 文案 | 「最大保证金使用率（**代码强制**）」（`web/src/components/strategy/RiskControlEditor.tsx`） |
| 数据字典 | `kernel/schema.go` 的 `DataDictionary`（字段含义与公式，随提示词一起下发给模型） |

**改动自查矩阵**：
- **改动风控配置字段**（`store/strategy.go` 的 `RiskControlConfig`）→ 确认提示词是否按新字段渲染（`kernel/engine.go` 的 `BuildSystemPrompt`）；UI 文案必须名副其实。
- **改动节流 / 开仓保护常量**（`trader/auto_trader_throttle.go`、`trader/auto_trader.go`）→ 提示词硬编码规则（`Min Hold Before Close` / `Re-entry Cooldown`）需同步，常量处保留交叉引用注释。
- **改动指标计算口径**（`market/data.go`）→ `DataDictionary` 里的公式描述同步更新。
- **改动数据字段语义** → 同步更新 `DataDictionary`，避免大模型误解盘面输入。

---

## 3. 数据一致性与订单同步底层说明

- **交易员生命周期隔离**：
  - 交易员创建时拼入 Unix 时间戳生成全局唯一 ID（`api/server.go`）。删除重建后必产生全新 ID，旧数据不会跨实例串台。
  - 删除交易员时，`store/trader.go` 执行级联物理删除名下所有持仓、订单、成交、决策记录与网格状态。
  - 服务启动时，`store/trader.go` 的 `CleanupOrphanRecords()` 自动扫描并清除所属交易员已不存在的历史孤儿记录。
- **订单同步与仓位构建（PositionBuilder）**：
  - 仓位历史严格依赖 `trader_positions` 中 `status=CLOSED` 的记录。
  - 无论平仓触发源自 AI、Web UI 还是交易所止损单，均由 `trader/<exchange>/order_sync.go` 捕获成交并调用 `PositionBuilder.handleClose()` 匹配开仓记录，完成盈亏归因与出场结算。
  - 币安基于 `trader_fills` 记录的水位时间戳进行增量拉取（`GetLastFillTimeByExchange`），服务停机重启不丢单；新建交易员则从当前时刻起跑。
