import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useSWR from 'swr'
import { api } from './lib/api'
import { TraderDashboardPage } from './pages/TraderDashboardPage'

import { AITradersPage } from './components/AITradersPage'
import { LoginPage } from './components/LoginPage'
import { RegisterPage } from './components/RegisterPage'
import { ResetPasswordPage } from './components/ResetPasswordPage'
import { CompetitionPage } from './components/CompetitionPage'
import { LandingPage } from './pages/LandingPage'
import { StrategyStudioPage } from './pages/StrategyStudioPage'
import { LoginRequiredOverlay } from './components/LoginRequiredOverlay'
import HeaderBar from './components/HeaderBar'
import { LanguageProvider, useLanguage } from './contexts/LanguageContext'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ConfirmDialogProvider } from './components/ConfirmDialog'
import { t } from './i18n/translations'
import { useSystemConfig } from './hooks/useSystemConfig'
import type {
  SystemStatus,
  AccountInfo,
  Position,
  DecisionRecord,
  Statistics,
  TraderInfo,
  Exchange,
} from './types'

type Page =
  | 'competition'
  | 'traders'
  | 'trader'
  | 'strategy'
  | 'login'
  | 'register'



function App() {
  const { language, setLanguage } = useLanguage()
  const { user, token, logout, isLoading } = useAuth()
  const { loading: configLoading } = useSystemConfig()
  const [route, setRoute] = useState(window.location.pathname)

  // Debug log
  useEffect(() => {
    console.log('[App] Mounted. Route:', window.location.pathname);
  }, []);

  // 从URL路径读取初始页面状态（支持刷新保持页面）
  const getInitialPage = (): Page => {
    const path = window.location.pathname
    const hash = window.location.hash.slice(1) // 去掉 #

    if (path === '/traders' || hash === 'traders') return 'traders'
    if (path === '/strategy' || hash === 'strategy') return 'strategy'
    if (path === '/dashboard' || hash === 'trader' || hash === 'details')
      return 'trader'
    return 'competition' // 默认为竞赛页面
  }

  // Login required overlay state
  const [loginOverlayOpen, setLoginOverlayOpen] = useState(false)
  const [loginOverlayFeature, setLoginOverlayFeature] = useState('')

  const handleLoginRequired = (featureName: string) => {
    setLoginOverlayFeature(featureName)
    setLoginOverlayOpen(true)
  }

  // Unified page navigation handler
  const navigateToPage = (page: Page) => {
    const pathMap: Partial<Record<Page, string>> = {
      'competition': '/competition',
      'traders': '/traders',
      'trader': '/dashboard',
      'strategy': '/strategy',
      'login': '/login',
      'register': '/register',
    }
    const path = pathMap[page]
    if (path) {
      window.history.pushState({}, '', path)
      setRoute(path)
      setCurrentPage(page)
    }
  }

  const [currentPage, setCurrentPage] = useState<Page>(getInitialPage())
  // 从 URL 参数读取初始 trader 标识（格式: name-id前4位）
  const [selectedTraderSlug, setSelectedTraderSlug] = useState<string | undefined>(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('trader') || undefined
  })
  const [selectedTraderId, setSelectedTraderId] = useState<string | undefined>()

  // 生成 trader URL slug（name + ID 前 4 位）
  const getTraderSlug = (trader: TraderInfo) => {
    const idPrefix = trader.trader_id.slice(0, 4)
    return `${trader.trader_name}-${idPrefix}`
  }

  // 从 slug 解析并匹配 trader
  const findTraderBySlug = (slug: string, traderList: TraderInfo[]) => {
    // slug 格式: name-xxxx (xxxx 是 ID 前 4 位)
    const lastDashIndex = slug.lastIndexOf('-')
    if (lastDashIndex === -1) {
      // 没有 dash，直接按 name 匹配
      return traderList.find(t => t.trader_name === slug)
    }
    const name = slug.slice(0, lastDashIndex)
    const idPrefix = slug.slice(lastDashIndex + 1)
    return traderList.find(t =>
      t.trader_name === name && t.trader_id.startsWith(idPrefix)
    )
  }
  const [lastUpdate, setLastUpdate] = useState<string>('--:--:--')
  const [decisionsLimit, setDecisionsLimit] = useState<number>(5)

  // 监听URL变化，同步页面状态
  useEffect(() => {
    const handleRouteChange = () => {
      const path = window.location.pathname
      const hash = window.location.hash.slice(1)
      const params = new URLSearchParams(window.location.search)
      const traderParam = params.get('trader')

      if (path === '/traders' || hash === 'traders') {
        setCurrentPage('traders')
      } else if (path === '/strategy' || hash === 'strategy') {
        setCurrentPage('strategy')
      } else if (
        path === '/dashboard' ||
        hash === 'trader' ||
        hash === 'details'
      ) {
        setCurrentPage('trader')
        // 如果 URL 中有 trader 参数（slug 格式），更新选中的 trader
        if (traderParam) {
          setSelectedTraderSlug(traderParam)
        }
      } else if (
        path === '/competition' ||
        hash === 'competition' ||
        hash === ''
      ) {
        setCurrentPage('competition')
      }
      setRoute(path)
    }

    window.addEventListener('hashchange', handleRouteChange)
    window.addEventListener('popstate', handleRouteChange)
    return () => {
      window.removeEventListener('hashchange', handleRouteChange)
      window.removeEventListener('popstate', handleRouteChange)
    }
  }, [])

  // 切换页面时更新URL hash (当前通过按钮直接调用setCurrentPage，这个函数暂时保留用于未来扩展)
  // const navigateToPage = (page: Page) => {
  //   setCurrentPage(page);
  //   window.location.hash = page === 'competition' ? '' : 'trader';
  // };

  // 获取trader列表（仅在用户登录时）
  const { data: traders, error: tradersError } = useSWR<TraderInfo[]>(
    user && token ? 'traders' : null,
    api.getTraders,
    {
      refreshInterval: 10000,
      shouldRetryOnError: false, // 避免在后端未运行时无限重试
    }
  )

  // 获取exchanges列表（用于显示交易所名称）
  const { data: exchanges } = useSWR<Exchange[]>(
    user && token ? 'exchanges' : null,
    api.getExchangeConfigs,
    {
      refreshInterval: 60000, // 1分钟刷新一次
      shouldRetryOnError: false,
    }
  )

  // 当获取到traders后，根据 URL 中的 trader slug 设置选中的 trader，或默认选中第一个
  useEffect(() => {
    if (traders && traders.length > 0 && !selectedTraderId) {
      if (selectedTraderSlug) {
        // 通过 slug 找到对应的 trader
        const trader = findTraderBySlug(selectedTraderSlug, traders)
        if (trader) {
          setSelectedTraderId(trader.trader_id)
        } else {
          // 如果找不到，选中第一个
          setSelectedTraderId(traders[0].trader_id)
        }
      } else {
        setSelectedTraderId(traders[0].trader_id)
      }
    }
  }, [traders, selectedTraderId, selectedTraderSlug])

  // 如果在trader页面，获取该trader的数据
  const { data: status } = useSWR<SystemStatus>(
    currentPage === 'trader' && selectedTraderId
      ? `status-${selectedTraderId}`
      : null,
    () => api.getStatus(selectedTraderId),
    {
      refreshInterval: 15000, // 15秒刷新（配合后端15秒缓存）
      revalidateOnFocus: false, // 禁用聚焦时重新验证，减少请求
      dedupingInterval: 10000, // 10秒去重，防止短时间内重复请求
    }
  )

  const { data: account } = useSWR<AccountInfo>(
    currentPage === 'trader' && selectedTraderId
      ? `account-${selectedTraderId}`
      : null,
    () => api.getAccount(selectedTraderId),
    {
      refreshInterval: 15000, // 15秒刷新（配合后端15秒缓存）
      revalidateOnFocus: false, // 禁用聚焦时重新验证，减少请求
      dedupingInterval: 10000, // 10秒去重，防止短时间内重复请求
    }
  )

  const { data: positions } = useSWR<Position[]>(
    currentPage === 'trader' && selectedTraderId
      ? `positions-${selectedTraderId}`
      : null,
    () => api.getPositions(selectedTraderId),
    {
      refreshInterval: 15000, // 15秒刷新（配合后端15秒缓存）
      revalidateOnFocus: false, // 禁用聚焦时重新验证，减少请求
      dedupingInterval: 10000, // 10秒去重，防止短时间内重复请求
    }
  )

  const { data: decisions } = useSWR<DecisionRecord[]>(
    currentPage === 'trader' && selectedTraderId
      ? `decisions/latest-${selectedTraderId}-${decisionsLimit}`
      : null,
    () => api.getLatestDecisions(selectedTraderId, decisionsLimit),
    {
      refreshInterval: 30000, // 30秒刷新（决策更新频率较低）
      revalidateOnFocus: false,
      dedupingInterval: 20000,
    }
  )

  const { data: stats } = useSWR<Statistics>(
    currentPage === 'trader' && selectedTraderId
      ? `statistics-${selectedTraderId}`
      : null,
    () => api.getStatistics(selectedTraderId),
    {
      refreshInterval: 30000, // 30秒刷新（统计数据更新频率较低）
      revalidateOnFocus: false,
      dedupingInterval: 20000,
    }
  )

  useEffect(() => {
    if (account) {
      const now = new Date().toLocaleTimeString()
      setLastUpdate(now)
    }
  }, [account])

  const selectedTrader = traders?.find((t) => t.trader_id === selectedTraderId)

  // Handle routing
  useEffect(() => {
    const handlePopState = () => {
      setRoute(window.location.pathname)
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  // Set current page based on route for consistent navigation state
  useEffect(() => {
    if (route === '/competition') {
      setCurrentPage('competition')
    } else if (route === '/traders') {
      setCurrentPage('traders')
    } else if (route === '/dashboard') {
      setCurrentPage('trader')
    }
  }, [route])

  // Show loading spinner while checking auth or config
  if (isLoading || configLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-nofx-bg text-nofx-text">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm font-medium text-nofx-text-muted">{t('loading', language)}</p>
        </div>
      </div>
    )
  }

  // Handle specific routes regardless of authentication
  if (route === '/login') {
    return <LoginPage />
  }
  if (route === '/register') {
    return <RegisterPage />
  }
  if (route === '/faq') {
    window.history.replaceState({}, '', '/')
    window.dispatchEvent(new PopStateEvent('popstate'))
    return null
  }
  if (route === '/reset-password') {
    return <ResetPasswordPage />
  }
  // Show landing page for root route
  if (route === '/' || route === '') {
    return <LandingPage />
  }

  // Redirect unauthenticated users to landing page
  if (!user || !token) {
    return <LandingPage />
  }

  return (
    <div className="min-h-screen bg-nofx-bg text-nofx-text">
      <HeaderBar
        isLoggedIn={!!user}
        currentPage={currentPage}
        language={language}
        onLanguageChange={setLanguage}
        user={user}
        onLogout={logout}
        onLoginRequired={handleLoginRequired}
        onPageChange={navigateToPage}
      />

      {/* Main Content with Page Transitions */}
      <main className="min-h-screen pt-16">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPage}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
          >
            {currentPage === 'competition' ? (
              <CompetitionPage />
            ) : currentPage === 'traders' ? (
              <AITradersPage
                onTraderSelect={(traderId) => {
                  setSelectedTraderId(traderId)
                  window.history.pushState({}, '', '/dashboard')
                  setRoute('/dashboard')
                  setCurrentPage('trader')
                }}
              />
            ) : currentPage === 'strategy' ? (
              <StrategyStudioPage />
            ) : (
              <TraderDashboardPage
                selectedTrader={selectedTrader}
                status={status}
                account={account}
                positions={positions}
                decisions={decisions}
                decisionsLimit={decisionsLimit}
                onDecisionsLimitChange={setDecisionsLimit}
                stats={stats}
                lastUpdate={lastUpdate}
                language={language}
                traders={traders}
                tradersError={tradersError}
                selectedTraderId={selectedTraderId}
                onTraderSelect={(traderId) => {
                  setSelectedTraderId(traderId)
                  // 更新 URL 参数（使用 slug: name-id前4位）
                  const trader = traders?.find(t => t.trader_id === traderId)
                  if (trader) {
                    const url = new URL(window.location.href)
                    url.searchParams.set('trader', getTraderSlug(trader))
                    window.history.replaceState({}, '', url.toString())
                  }
                }}
                onNavigateToTraders={() => {
                  window.history.pushState({}, '', '/traders')
                  setRoute('/traders')
                  setCurrentPage('traders')
                }}
                exchanges={exchanges}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="mt-16 bg-nofx-bg-lighter border-t border-slate-200/80">
        <div className="max-w-[1920px] mx-auto px-6 py-6 text-center text-sm">
          <p className="font-semibold text-nofx-text">{t('footerTitle', language)}</p>
          <p className="mt-1 text-xs text-slate-400 max-w-xl mx-auto">{t('footerWarning', language)}</p>
        </div>
      </footer>

      {/* Login Required Overlay */}
      <LoginRequiredOverlay
        isOpen={loginOverlayOpen}
        onClose={() => setLoginOverlayOpen(false)}
        featureName={loginOverlayFeature}
      />
    </div>
  )
}


// Wrap App with providers
export default function AppWithProviders() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <ConfirmDialogProvider>
          <App />
        </ConfirmDialogProvider>
      </AuthProvider>
    </LanguageProvider>
  )
}
