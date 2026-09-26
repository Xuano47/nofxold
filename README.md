# nofxold — 自托管版 NOFX AI 交易系统

基于 NOFX（AGPL-3.0）的自托管 fork。**去除所有强制付费依赖**，仅保留免费/币安直连的数据链路，支持任何 BYOK（Bring Your Own Key）AI 提供商和主流交易所。

本项目与官方 NoFxAiOS 项目**无关**，官方 Docker 镜像和云端服务带有付费墙，请勿混用。

---

## 快速部署

Docker 一键启动，本地构建（不依赖官方预构建镜像）：

```bash
git clone https://github.com/Xuano47/nofxold.git
cd nofxold
cp .env.example .env
# 编辑 .env：设置 JWT_SECRET / DATA_ENCRYPTION_KEY / RSA_PRIVATE_KEY
docker compose up -d --build
```

浏览器打开 `http://YOUR_SERVER_IP:3000`。后端 API 在 `:8080`。

常用运维命令：

```bash
docker compose logs -f nofx          # 后端日志
docker compose logs -f nofx-frontend # 前端日志
docker compose restart               # 重启
docker compose down                  # 停止
docker compose up -d --build         # 改代码后重新构建
```

生产环境建议启用 HTTPS（`.env` 中 `TRANSPORT_ENCRYPTION=true`，配合 Cloudflare / Caddy / Nginx 反代）。

---

## 架构概览（数据流）

```
币安 fapi.binance.com
  ├── premiumIndex（资金费率，1h 缓存）
  └── klines（K 线 + 成交量）  ──┐
                                  ▼
                         本地计算指标
                         EMA20/EMA50 · MACD · RSI7/14
                         ATR14 · BOLL(20,2) · Volume
                                  │
                                  ▼
                       AI Prompt 渲染 → BYOK LLM
                                  │
                                  ▼
                            交易所下单
```

> **注意**：当前 K 线走的是 **CoinAnk 免费中转 API**（`provider/coinank`），而不是直接从币安 `fapi/v1/klines` 拉取。详见下方「待办」#2。

---

## 本 Fork 已做的改动

| 改动 | 说明 |
|------|------|
| **静态币列表为首选** | 支持手动配置 `static_coins` 列表。AI500 / OI Top / OI 指标等仍作为**可选项**保留在 UI 中（默认不启用，见下方"待办"）。 |
| **清除 Vergex** | 删除 `/vergex/*` 路由、前端看板 UI、`provider/vergex` 包。 |
| **清除官方文件** | 删除 install 脚本、Railway/Docker 生产构建、CI workflow、社区文档、CHANGELOG、CONTRIBUTING 等。fork 不再依赖官方仓库或付费渠道。 |
| **本地构建** | `docker-compose.yml` 改为从 `docker/Dockerfile.backend` 和 `docker/Dockerfile.frontend` 本地构建，不拉取官方 `ghcr.io/nofxaios` 镜像。 |

---

## 待办（将来要改的两个点）

当前版本在"强制付费墙"意义上是安全的——付费数据均为 UI 可选。但以下两处仍有**隐式付费服务依赖**，建议将来处理：

### #1 `engine.go` 无条件请求 nofxos.ai（最值得先改）

**位置**：`kernel/engine.go` 约第 270-285 行

每个交易周期都会执行 `engine.nofxosClient.GetOITopPositions()`，**不检查 UI 是否启用了 OI 数据**。虽然失败会被静默忽略，但每次跑都会向 `nofxos.ai`（含硬编码 API key `cm_568c67eae410d912c54c`）发起一次请求。

**建议处理**：加一个 `store.StrategyConfig` 级别的布尔开关（默认 `false`），只有用户显式开启时才调用。改动很小。

### #2 K 线改回币安直连

**现状**：所有 K 线通过 `market/getKlinesFromCoinAnk()` 从 CoinAnk 中转拉取，代码里**没有** `getKlinesFromBinance` 函数。但 `market/historical.go` 已有现成的币安直连实现 `GetKlinesRange()`（`fapi.binance.com/fapi/v1/klines`），可以直接复用。

**改回的好处**：
- 去掉 CoinAnk 这个第三方中转依赖
- 和"币安直连 + 本地算指标"的既定方案对齐

**改回的风险（实际评估）**：
- ⚠️ **多交易所支持会丢失**：CoinAnk 当前承担了非币安交易所（Bybit / OKX / Gate / Bitget / Aster）的 K 线拉取。改回后这些交易所的币会拉不到数据。如果你只用币安静态列表，这个风险为零。
- ✅ **网络前提已验证**：之前 Docker 部署时 `/api/klines` 已返回 200，说明服务器能直连币安数据。
- ✅ **Hyperliquid 不受影响**：它走独立的 `getKlinesFromHyperliquid`。

**结论**：如果你只用币安静态列表，改回币安直连风险很小、收益明确。

---

## 许可证

AGPL-3.0。继承自官方项目。参考 `LICENSE`。
