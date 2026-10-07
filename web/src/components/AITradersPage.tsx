import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import useSWR from 'swr'
import { api } from '../lib/api'
import type {
  TraderInfo,
  CreateTraderRequest,
  AIModel,
  Exchange,
} from '../types'
import { useLanguage } from '../contexts/LanguageContext'
import { t, type Language } from '../i18n/translations'
import { useAuth } from '../contexts/AuthContext'
import { getExchangeIcon } from './ExchangeIcons'
import { TraderConfigModal } from './TraderConfigModal'
import { DeepVoidBackground } from './DeepVoidBackground'
import { ExchangeConfigModal } from './traders/ExchangeConfigModal'
import {
  Bot,
  Brain,
  Landmark,
  BarChart3,
  Trash2,
  Plus,
  Users,
  Pencil,
  Eye,
  EyeOff,
  Copy,
  Check,
  Tag,
} from 'lucide-react'
import { confirmToast } from '../lib/notify'
import { toast } from 'sonner'

// 获取友好的AI模型名称
function getModelDisplayName(modelId: string): string {
  switch (modelId.toLowerCase()) {
    case 'deepseek':
      return 'DeepSeek'
    case 'qwen':
      return 'Qwen'
    case 'claude':
      return 'Claude'
    default:
      return modelId.toUpperCase()
  }
}

// 提取下划线后面的名称部分
function getShortName(fullName: string): string {
  const parts = fullName.split('_')
  return parts.length > 1 ? parts[parts.length - 1] : fullName
}

// AI Provider configuration - default models and API links
const AI_PROVIDER_CONFIG: Record<string, {
  defaultModel: string
  apiUrl: string
  apiName: string
}> = {
  deepseek: {
    defaultModel: 'deepseek-chat',
    apiUrl: 'https://platform.deepseek.com/api_keys',
    apiName: 'DeepSeek',
  },
  qwen: {
    defaultModel: 'qwen3-max',
    apiUrl: 'https://dashscope.console.aliyun.com/apiKey',
    apiName: 'Alibaba Cloud',
  },
  openai: {
    defaultModel: 'gpt-5.2',
    apiUrl: 'https://platform.openai.com/api-keys',
    apiName: 'OpenAI',
  },
  claude: {
    defaultModel: 'claude-opus-4-6',
    apiUrl: 'https://console.anthropic.com/settings/keys',
    apiName: 'Anthropic',
  },
  gemini: {
    defaultModel: 'gemini-3-pro-preview',
    apiUrl: 'https://aistudio.google.com/app/apikey',
    apiName: 'Google AI Studio',
  },
  grok: {
    defaultModel: 'grok-3-latest',
    apiUrl: 'https://console.x.ai/',
    apiName: 'xAI',
  },
  kimi: {
    defaultModel: 'moonshot-v1-auto',
    apiUrl: 'https://platform.moonshot.ai/console/api-keys',
    apiName: 'Moonshot',
  },
  minimax: {
    defaultModel: 'MiniMax-M2.5',
    apiUrl: 'https://platform.minimax.io',
    apiName: 'MiniMax',
  },
}

interface AITradersPageProps {
  onTraderSelect?: (traderId: string) => void
}

// Helper function to get exchange display name from exchange ID (UUID)
function getExchangeDisplayName(exchangeId: string | undefined, exchanges: Exchange[]): string {
  if (!exchangeId) return 'Unknown'
  const exchange = exchanges.find(e => e.id === exchangeId)
  if (!exchange) return exchangeId.substring(0, 8).toUpperCase() + '...' // Show truncated UUID if not found
  const typeName = exchange.exchange_type?.toUpperCase() || exchange.name
  return exchange.account_name ? `${typeName} - ${exchange.account_name}` : typeName
}

// Helper function to check if exchange is a perp-dex type (wallet-based)
function isPerpDexExchange(exchangeType: string | undefined): boolean {
  if (!exchangeType) return false
  const perpDexTypes = ['hyperliquid', 'lighter', 'aster']
  return perpDexTypes.includes(exchangeType.toLowerCase())
}

// Helper function to get wallet address for perp-dex exchanges
function getWalletAddress(exchange: Exchange | undefined): string | undefined {
  if (!exchange) return undefined
  const type = exchange.exchange_type?.toLowerCase()
  switch (type) {
    case 'hyperliquid':
      return exchange.hyperliquidWalletAddr
    case 'lighter':
      return exchange.lighterWalletAddr
    case 'aster':
      return exchange.asterSigner
    default:
      return undefined
  }
}

// Helper function to truncate wallet address for display
function truncateAddress(address: string, startLen = 6, endLen = 4): string {
  if (address.length <= startLen + endLen + 3) return address
  return `${address.slice(0, startLen)}...${address.slice(-endLen)}`
}

export function AITradersPage({ onTraderSelect }: AITradersPageProps) {
  const { language } = useLanguage()
  const { user, token } = useAuth()
  const navigate = useNavigate()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showModelModal, setShowModelModal] = useState(false)
  const [showExchangeModal, setShowExchangeModal] = useState(false)
  const [editingModel, setEditingModel] = useState<string | null>(null)
  const [editingExchange, setEditingExchange] = useState<string | null>(null)
  const [editingTrader, setEditingTrader] = useState<any>(null)
  const [allModels, setAllModels] = useState<AIModel[]>([])
  const [allExchanges, setAllExchanges] = useState<Exchange[]>([])
  const [supportedModels, setSupportedModels] = useState<AIModel[]>([])
  const [visibleTraderAddresses, setVisibleTraderAddresses] = useState<Set<string>>(new Set())
  const [visibleExchangeAddresses, setVisibleExchangeAddresses] = useState<Set<string>>(new Set())
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Toggle wallet address visibility for a trader
  const toggleTraderAddressVisibility = (traderId: string) => {
    setVisibleTraderAddresses(prev => {
      const next = new Set(prev)
      if (next.has(traderId)) {
        next.delete(traderId)
      } else {
        next.add(traderId)
      }
      return next
    })
  }

  // Toggle wallet address visibility for an exchange
  const toggleExchangeAddressVisibility = (exchangeId: string) => {
    setVisibleExchangeAddresses(prev => {
      const next = new Set(prev)
      if (next.has(exchangeId)) {
        next.delete(exchangeId)
      } else {
        next.add(exchangeId)
      }
      return next
    })
  }

  // Copy wallet address to clipboard
  const handleCopyAddress = async (id: string, address: string) => {
    try {
      await navigator.clipboard.writeText(address)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch (err) {
      console.error('Failed to copy address:', err)
    }
  }

  const { data: traders, mutate: mutateTraders, isLoading: isTradersLoading } = useSWR<TraderInfo[]>(
    user && token ? 'traders' : null,
    api.getTraders,
    { refreshInterval: 5000 }
  )

  // 加载AI模型和交易所配置
  useEffect(() => {
    const loadConfigs = async () => {
      if (!user || !token) {
        // 未登录时只加载公开的支持模型
        try {
          const supportedModels = await api.getSupportedModels()
          setSupportedModels(supportedModels)
        } catch (err) {
          console.error('Failed to load supported configs:', err)
        }
        return
      }

      try {
        const [
          modelConfigs,
          exchangeConfigs,
          supportedModels,
        ] = await Promise.all([
          api.getModelConfigs(),
          api.getExchangeConfigs(),
          api.getSupportedModels(),
        ])
        setAllModels(modelConfigs)
        setAllExchanges(exchangeConfigs)
        setSupportedModels(supportedModels)
      } catch (error) {
        console.error('Failed to load configs:', error)
      }
    }
    loadConfigs()
  }, [user, token])

  // 只显示已配置的模型和交易所
  // 注意：后端返回的数据不包含敏感信息（apiKey等），所以通过其他字段判断是否已配置
  const configuredModels =
    allModels?.filter((m) => {
      // 如果模型已启用，说明已配置
      // 或者有自定义API URL，也说明已配置
      return m.enabled || (m.customApiUrl && m.customApiUrl.trim() !== '')
    }) || []
  const configuredExchanges =
    allExchanges?.filter((e) => {
      // Aster 交易所检查特殊字段
      if (e.id === 'aster') {
        return e.asterUser && e.asterUser.trim() !== ''
      }
      // Hyperliquid 需要检查钱包地址（后端会返回这个字段）
      if (e.id === 'hyperliquid') {
        return e.hyperliquidWalletAddr && e.hyperliquidWalletAddr.trim() !== ''
      }
      // 其他交易所：如果已启用，说明已配置（后端返回的已配置交易所会有 enabled: true）
      return e.enabled
    }) || []

  // 只在创建交易员时使用已启用且配置完整的
  // 注意：后端返回的数据不包含敏感信息，所以只检查 enabled 状态和必要的非敏感字段
  const enabledModels = allModels?.filter((m) => m.enabled) || []
  const enabledExchanges =
    allExchanges?.filter((e) => {
      if (!e.enabled) return false

      // Aster 交易所需要特殊字段（后端会返回这些非敏感字段）
      if (e.id === 'aster') {
        return (
          e.asterUser &&
          e.asterUser.trim() !== '' &&
          e.asterSigner &&
          e.asterSigner.trim() !== ''
        )
      }

      // Hyperliquid 需要钱包地址（后端会返回这个字段）
      if (e.id === 'hyperliquid') {
        return e.hyperliquidWalletAddr && e.hyperliquidWalletAddr.trim() !== ''
      }

      // 其他交易所：如果已启用，说明已配置完整（后端只返回已配置的交易所）
      return true
    }) || []

  // 检查模型是否正在被运行中的交易员使用（用于UI禁用）
  const isModelInUse = (modelId: string) => {
    return traders?.some((t) => t.ai_model === modelId && t.is_running)
  }

  // 检查模型被哪些交易员使用
  const getModelUsageInfo = (modelId: string) => {
    const usingTraders = traders?.filter((t) => t.ai_model === modelId) || []
    const runningCount = usingTraders.filter((t) => t.is_running).length
    const totalCount = usingTraders.length
    return { runningCount, totalCount, usingTraders }
  }

  // 检查交易所是否正在被运行中的交易员使用（用于UI禁用）
  const isExchangeInUse = (exchangeId: string) => {
    return traders?.some((t) => t.exchange_id === exchangeId && t.is_running)
  }

  // 检查交易所被哪些交易员使用
  const getExchangeUsageInfo = (exchangeId: string) => {
    const usingTraders = traders?.filter((t) => t.exchange_id === exchangeId) || []
    const runningCount = usingTraders.filter((t) => t.is_running).length
    const totalCount = usingTraders.length
    return { runningCount, totalCount, usingTraders }
  }

  // 检查模型是否被任何交易员使用（包括停止状态的）
  const isModelUsedByAnyTrader = (modelId: string) => {
    return traders?.some((t) => t.ai_model === modelId) || false
  }

  // 检查交易所是否被任何交易员使用（包括停止状态的）
  const isExchangeUsedByAnyTrader = (exchangeId: string) => {
    return traders?.some((t) => t.exchange_id === exchangeId) || false
  }

  // 获取使用特定模型的交易员列表
  const getTradersUsingModel = (modelId: string) => {
    return traders?.filter((t) => t.ai_model === modelId) || []
  }

  // 获取使用特定交易所的交易员列表
  const getTradersUsingExchange = (exchangeId: string) => {
    return traders?.filter((t) => t.exchange_id === exchangeId) || []
  }

  const handleCreateTrader = async (data: CreateTraderRequest) => {
    try {
      const model = allModels?.find((m) => m.id === data.ai_model_id)
      const exchange = allExchanges?.find((e) => e.id === data.exchange_id)

      if (!model?.enabled) {
        toast.error(t('modelNotConfigured', language))
        return
      }

      if (!exchange?.enabled) {
        toast.error(t('exchangeNotConfigured', language))
        return
      }

      await toast.promise(api.createTrader(data), {
        loading: '正在创建…',
        success: '创建成功',
        error: '创建失败',
      })
      setShowCreateModal(false)
      // Immediately refresh traders list for better UX
      await mutateTraders()
    } catch (error) {
      console.error('Failed to create trader:', error)
      toast.error(t('createTraderFailed', language))
    }
  }

  const handleEditTrader = async (traderId: string) => {
    try {
      const traderConfig = await api.getTraderConfig(traderId)
      setEditingTrader(traderConfig)
      setShowEditModal(true)
    } catch (error) {
      console.error('Failed to fetch trader config:', error)
      toast.error(t('getTraderConfigFailed', language))
    }
  }

  const handleSaveEditTrader = async (data: CreateTraderRequest) => {
    console.log('🔥🔥🔥 handleSaveEditTrader CALLED with data:', data)
    if (!editingTrader) return

    try {
      const model = enabledModels?.find((m) => m.id === data.ai_model_id)
      const exchange = enabledExchanges?.find((e) => e.id === data.exchange_id)

      if (!model) {
        toast.error(t('modelConfigNotExist', language))
        return
      }

      if (!exchange) {
        toast.error(t('exchangeConfigNotExist', language))
        return
      }

      const request = {
        name: data.name,
        ai_model_id: data.ai_model_id,
        fallback_ai_model_id: data.fallback_ai_model_id,
        exchange_id: data.exchange_id,
        strategy_id: data.strategy_id,
        initial_balance: data.initial_balance,
        scan_interval_minutes: data.scan_interval_minutes,
        is_cross_margin: data.is_cross_margin,
        show_in_competition: data.show_in_competition,
      }

      console.log('🔥 handleSaveEditTrader - data:', data)
      console.log('🔥 handleSaveEditTrader - data.strategy_id:', data.strategy_id)
      console.log('🔥 handleSaveEditTrader - request:', request)

      await toast.promise(api.updateTrader(editingTrader.trader_id, request), {
        loading: '正在保存…',
        success: '保存成功',
        error: '保存失败',
      })
      setShowEditModal(false)
      setEditingTrader(null)
      // Immediately refresh traders list for better UX
      await mutateTraders()
    } catch (error) {
      console.error('Failed to update trader:', error)
      toast.error(t('updateTraderFailed', language))
    }
  }

  const handleDeleteTrader = async (traderId: string) => {
    {
      const ok = await confirmToast(t('confirmDeleteTrader', language))
      if (!ok) return
    }

    try {
      await toast.promise(api.deleteTrader(traderId), {
        loading: '正在删除…',
        success: '删除成功',
        error: '删除失败',
      })

      // Immediately refresh traders list for better UX
      await mutateTraders()
    } catch (error) {
      console.error('Failed to delete trader:', error)
      toast.error(t('deleteTraderFailed', language))
    }
  }

  const handleToggleTrader = async (traderId: string, running: boolean) => {
    try {
      if (running) {
        await toast.promise(api.stopTrader(traderId), {
          loading: '正在停止…',
          success: '已停止',
          error: '停止失败',
        })
      } else {
        await toast.promise(api.startTrader(traderId), {
          loading: '正在启动…',
          success: '已启动',
          error: '启动失败',
        })
      }

      // Immediately refresh traders list to update running status
      await mutateTraders()
    } catch (error) {
      console.error('Failed to toggle trader:', error)
      toast.error(t('operationFailed', language))
    }
  }

  const handleToggleCompetition = async (traderId: string, currentShowInCompetition: boolean) => {
    try {
      const newValue = !currentShowInCompetition
      await toast.promise(api.toggleCompetition(traderId, newValue), {
        loading: '正在更新…',
        success: newValue ? '已在竞技场显示' : '已在竞技场隐藏',
        error: '更新失败',
      })

      // Immediately refresh traders list to update status
      await mutateTraders()
    } catch (error) {
      console.error('Failed to toggle competition visibility:', error)
      toast.error(t('operationFailed', language))
    }
  }

  const handleModelClick = (modelId: string) => {
    if (!isModelInUse(modelId)) {
      setEditingModel(modelId)
      setShowModelModal(true)
    }
  }

  const handleExchangeClick = (exchangeId: string) => {
    if (!isExchangeInUse(exchangeId)) {
      setEditingExchange(exchangeId)
      setShowExchangeModal(true)
    }
  }

  // 通用删除配置处理函数
  const handleDeleteConfig = async <T extends { id: string }>(config: {
    id: string
    type: 'model' | 'exchange'
    checkInUse: (id: string) => boolean
    getUsingTraders: (id: string) => any[]
    cannotDeleteKey: string
    confirmDeleteKey: string
    allItems: T[] | undefined
    clearFields: (item: T) => T
    buildRequest: (items: T[]) => any
    updateApi: (request: any) => Promise<void>
    refreshApi: () => Promise<T[]>
    setItems: (items: T[]) => void
    closeModal: () => void
    errorKey: string
  }) => {
    // 检查是否有交易员正在使用
    if (config.checkInUse(config.id)) {
      const usingTraders = config.getUsingTraders(config.id)
      const traderNames = usingTraders.map((t) => t.trader_name).join(', ')
      toast.error(
        `${t(config.cannotDeleteKey, language)} · ${t('tradersUsing', language)}: ${traderNames} · ${t('pleaseDeleteTradersFirst', language)}`
      )
      return
    }

    {
      const ok = await confirmToast(t(config.confirmDeleteKey, language))
      if (!ok) return
    }

    try {
      const updatedItems =
        config.allItems?.map((item) =>
          item.id === config.id ? config.clearFields(item) : item
        ) || []

      const request = config.buildRequest(updatedItems)
      await toast.promise(config.updateApi(request), {
        loading: '正在更新配置…',
        success: '配置已更新',
        error: '更新配置失败',
      })

      // 重新获取用户配置以确保数据同步
      const refreshedItems = await config.refreshApi()
      config.setItems(refreshedItems)

      config.closeModal()
    } catch (error) {
      console.error(`Failed to delete ${config.type} config:`, error)
      toast.error(t(config.errorKey, language))
    }
  }

  const handleDeleteModelConfig = async (modelId: string) => {
    await handleDeleteConfig({
      id: modelId,
      type: 'model',
      checkInUse: isModelUsedByAnyTrader,
      getUsingTraders: getTradersUsingModel,
      cannotDeleteKey: 'cannotDeleteModelInUse',
      confirmDeleteKey: 'confirmDeleteModel',
      allItems: allModels,
      clearFields: (m) => ({
        ...m,
        apiKey: '',
        customApiUrl: '',
        customModelName: '',
        enabled: false,
      }),
      buildRequest: (models) => ({
        models: Object.fromEntries(
          models.map((model) => [
            model.provider,
            {
              enabled: model.enabled,
              api_key: model.apiKey || '',
              custom_api_url: model.customApiUrl || '',
              custom_model_name: model.customModelName || '',
            },
          ])
        ),
      }),
      updateApi: api.updateModelConfigs,
      refreshApi: api.getModelConfigs,
      setItems: (items) => {
        // 使用函数式更新确保状态正确更新
        setAllModels([...items])
      },
      closeModal: () => {
        setShowModelModal(false)
        setEditingModel(null)
      },
      errorKey: 'deleteConfigFailed',
    })
  }

  const handleSaveModelConfig = async (
    modelId: string,
    displayName: string,
    apiKey: string,
    customApiUrl?: string,
    customModelName?: string
  ) => {
    try {
      // 创建或更新用户的模型配置
      const existingModel = allModels?.find((m) => m.id === modelId)
      let updatedModels

      // 找到要配置的模型（优先从已配置列表，其次从支持列表）
      const modelToUpdate =
        existingModel || supportedModels?.find((m) => m.id === modelId)
      if (!modelToUpdate) {
        toast.error(t('modelNotExist', language))
        return
      }

      if (existingModel) {
        // 更新现有配置
        updatedModels =
          allModels?.map((m) =>
            m.id === modelId
              ? {
                ...m,
                name: displayName || m.name,
                apiKey,
                customApiUrl: customApiUrl || '',
                customModelName: customModelName || '',
                enabled: true,
              }
              : m
          ) || []
      } else {
        // 添加新配置
        const newModel = {
          ...modelToUpdate,
          name: displayName || modelToUpdate.name,
          apiKey,
          customApiUrl: customApiUrl || '',
          customModelName: customModelName || '',
          enabled: true,
        }
        updatedModels = [...(allModels || []), newModel]
      }

      const request = {
        models: Object.fromEntries(
          updatedModels.map((model) => [
            model.provider, // 使用 provider 而不是 id
            {
              name: model.name,
              enabled: model.enabled,
              api_key: model.apiKey || '',
              custom_api_url: model.customApiUrl || '',
              custom_model_name: model.customModelName || '',
            },
          ])
        ),
      }

      await toast.promise(api.updateModelConfigs(request), {
        loading: '正在更新模型配置…',
        success: '模型配置已更新',
        error: '更新模型配置失败',
      })

      // 重新获取用户配置以确保数据同步
      const refreshedModels = await api.getModelConfigs()
      setAllModels(refreshedModels)

      setShowModelModal(false)
      setEditingModel(null)
    } catch (error) {
      console.error('Failed to save model config:', error)
      toast.error(t('saveConfigFailed', language))
    }
  }

  const handleDeleteExchangeConfig = async (exchangeId: string) => {
    // 检查是否有trader在使用此交易所账户
    if (isExchangeUsedByAnyTrader(exchangeId)) {
      const tradersUsing = getTradersUsingExchange(exchangeId)
      toast.error(
        `${t('cannotDeleteExchangeInUse', language)}: ${tradersUsing.join(', ')}`
      )
      return
    }

    // 确认删除
    const ok = await confirmToast(t('confirmDeleteExchange', language))
    if (!ok) return

    try {
      await toast.promise(api.deleteExchange(exchangeId), {
        loading: language === 'zh' ? '正在删除交易所账户…' : 'Deleting exchange account...',
        success: language === 'zh' ? '交易所账户已删除' : 'Exchange account deleted',
        error: language === 'zh' ? '删除交易所账户失败' : 'Failed to delete exchange account',
      })

      // 重新获取用户配置以确保数据同步
      const refreshedExchanges = await api.getExchangeConfigs()
      setAllExchanges(refreshedExchanges)

      setShowExchangeModal(false)
      setEditingExchange(null)
    } catch (error) {
      console.error('Failed to delete exchange config:', error)
      toast.error(t('deleteExchangeConfigFailed', language))
    }
  }

  const handleSaveExchangeConfig = async (
    exchangeId: string | null, // null for creating new account
    exchangeType: string,
    accountName: string,
    apiKey: string,
    secretKey?: string,
    passphrase?: string,
    testnet?: boolean,
    hyperliquidWalletAddr?: string,
    asterUser?: string,
    asterSigner?: string,
    asterPrivateKey?: string,
    lighterWalletAddr?: string,
    lighterPrivateKey?: string,
    lighterApiKeyPrivateKey?: string,
    lighterApiKeyIndex?: number
  ) => {
    try {
      if (exchangeId) {
        // 更新现有账户配置
        const existingExchange = allExchanges?.find((e) => e.id === exchangeId)
        if (!existingExchange) {
          toast.error(t('exchangeNotExist', language))
          return
        }

        const request = {
          exchanges: {
            [exchangeId]: {
              enabled: true,
              api_key: apiKey || '',
              secret_key: secretKey || '',
              passphrase: passphrase || '',
              testnet: testnet || false,
              hyperliquid_wallet_addr: hyperliquidWalletAddr || '',
              aster_user: asterUser || '',
              aster_signer: asterSigner || '',
              aster_private_key: asterPrivateKey || '',
              lighter_wallet_addr: lighterWalletAddr || '',
              lighter_private_key: lighterPrivateKey || '',
              lighter_api_key_private_key: lighterApiKeyPrivateKey || '',
              lighter_api_key_index: lighterApiKeyIndex || 0,
            },
          },
        }

        await toast.promise(api.updateExchangeConfigsEncrypted(request), {
          loading: language === 'zh' ? '正在更新交易所配置…' : 'Updating exchange config...',
          success: language === 'zh' ? '交易所配置已更新' : 'Exchange config updated',
          error: language === 'zh' ? '更新交易所配置失败' : 'Failed to update exchange config',
        })
      } else {
        // 创建新账户
        const createRequest = {
          exchange_type: exchangeType,
          account_name: accountName,
          enabled: true,
          api_key: apiKey || '',
          secret_key: secretKey || '',
          passphrase: passphrase || '',
          testnet: testnet || false,
          hyperliquid_wallet_addr: hyperliquidWalletAddr || '',
          aster_user: asterUser || '',
          aster_signer: asterSigner || '',
          aster_private_key: asterPrivateKey || '',
          lighter_wallet_addr: lighterWalletAddr || '',
          lighter_private_key: lighterPrivateKey || '',
          lighter_api_key_private_key: lighterApiKeyPrivateKey || '',
          lighter_api_key_index: lighterApiKeyIndex || 0,
        }

        await toast.promise(api.createExchangeEncrypted(createRequest), {
          loading: language === 'zh' ? '正在创建交易所账户…' : 'Creating exchange account...',
          success: language === 'zh' ? '交易所账户已创建' : 'Exchange account created',
          error: language === 'zh' ? '创建交易所账户失败' : 'Failed to create exchange account',
        })
      }

      // 重新获取用户配置以确保数据同步
      const refreshedExchanges = await api.getExchangeConfigs()
      setAllExchanges(refreshedExchanges)

      setShowExchangeModal(false)
      setEditingExchange(null)
    } catch (error) {
      console.error('Failed to save exchange config:', error)
      toast.error(t('saveConfigFailed', language))
    }
  }

  const handleAddModel = () => {
    setEditingModel(null)
    setShowModelModal(true)
  }

  const handleAddExchange = () => {
    setEditingExchange(null)
    setShowExchangeModal(true)
  }

  return (
    <DeepVoidBackground className="py-8" disableAnimation>
      <div className="w-full px-4 md:px-8 space-y-8 animate-fade-in">
        {/* Header - Terminal Style */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
          <div className="flex items-center gap-4">
            <div className="relative group">
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl flex items-center justify-center bg-blue-50 border border-blue-200 text-blue-600 relative z-10 shadow-sm">
                <Bot className="w-6 h-6 md:w-7 md:h-7" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold font-mono tracking-tight text-slate-900 flex items-center gap-3 uppercase">
                {t('aiTraders', language)}
                <span className="text-xs font-mono font-normal px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 tracking-wider">
                  {traders?.length || 0} ACTIVE_NODES
                </span>
              </h1>
              <p className="text-xs font-mono text-slate-500 uppercase tracking-widest mt-1 ml-1 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                SYSTEM_READY
              </p>
            </div>
          </div>

          <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 hide-scrollbar">
            <button
              onClick={handleAddModel}
              className="px-4 py-2 rounded-lg text-xs font-mono uppercase tracking-wider transition-all border border-slate-300 bg-white text-slate-700 hover:text-slate-900 hover:border-slate-400 whitespace-nowrap shadow-sm"
            >
              <div className="flex items-center gap-2">
                <Plus className="w-3 h-3 text-blue-600" />
                <span>MODELS_CONFIG</span>
              </div>
            </button>

            <button
              onClick={handleAddExchange}
              className="px-4 py-2 rounded-lg text-xs font-mono uppercase tracking-wider transition-all border border-slate-300 bg-white text-slate-700 hover:text-slate-900 hover:border-slate-400 whitespace-nowrap shadow-sm"
            >
              <div className="flex items-center gap-2">
                <Plus className="w-3 h-3 text-blue-600" />
                <span>EXCHANGE_KEYS</span>
              </div>
            </button>

            <button
              onClick={() => setShowCreateModal(true)}
              disabled={configuredModels.length === 0 || configuredExchanges.length === 0}
              className="px-6 py-2 rounded-lg text-xs font-bold font-mono uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
            >
              <span className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                {t('createTrader', language)}
              </span>
            </button>
          </div>
        </div>

        {/* Configuration Status Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* AI Models Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
              <Brain className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold tracking-wider text-slate-900 uppercase">
                {t('aiModels', language)}
              </h3>
            </div>

            <div className="p-4 space-y-3">
              {configuredModels.map((model) => {
                const inUse = isModelInUse(model.id)
                const usageInfo = getModelUsageInfo(model.id)
                return (
                  <div
                    key={model.id}
                    className={`group relative flex items-center justify-between p-3 rounded-lg transition-all border border-slate-200 bg-slate-50 ${inUse ? 'opacity-80' : 'hover:bg-slate-100 hover:border-slate-300 cursor-pointer'
                      }`}
                    onClick={() => handleModelClick(model.id)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-50 border border-blue-200 text-blue-600 shadow-sm">
                          <Bot className="w-5 h-5" />
                        </div>
                      </div>

                      <div className="min-w-0">
                        <div className="font-mono text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                          {model.name || model.provider}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono flex items-center gap-2">
                          {model.customModelName || AI_PROVIDER_CONFIG[model.provider]?.defaultModel || ''}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      {usageInfo.totalCount > 0 ? (
                        <span className={`text-[10px] font-mono px-2 py-1 rounded border ${usageInfo.runningCount > 0
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                          : 'bg-amber-50 border-amber-200 text-amber-700'
                          }`}>
                          {usageInfo.runningCount}/{usageInfo.totalCount} ACTIVE
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                          {language === 'zh' ? '就绪' : 'STANDBY'}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}

              {configuredModels.length === 0 && (
                <div className="text-center py-10 border border-dashed border-slate-300 rounded-lg bg-slate-50">
                  <Brain className="w-8 h-8 mx-auto mb-3 text-slate-400" />
                  <div className="text-xs font-mono text-slate-500 uppercase tracking-widest">{t('noModelsConfigured', language)}</div>
                </div>
              )}
            </div>
          </div>

          {/* Exchanges Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
              <Landmark className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold tracking-wider text-slate-900 uppercase">
                {t('exchanges', language)}
              </h3>
            </div>

            <div className="p-4 space-y-3">
              {configuredExchanges.map((exchange) => {
                const inUse = isExchangeInUse(exchange.id)
                const usageInfo = getExchangeUsageInfo(exchange.id)
                return (
                  <div
                    key={exchange.id}
                    className={`group relative flex items-center justify-between p-3 rounded-lg transition-all border border-slate-200 bg-slate-50 ${inUse ? 'opacity-80' : 'hover:bg-slate-100 hover:border-slate-300 cursor-pointer'
                      }`}
                    onClick={() => handleExchangeClick(exchange.id)}
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="relative">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white border border-slate-200 shadow-sm">
                          {getExchangeIcon(exchange.exchange_type || exchange.id, { width: 20, height: 20 })}
                        </div>
                      </div>

                      <div className="min-w-0">
                        <div className="font-mono text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                          {exchange.exchange_type?.toUpperCase() || getShortName(exchange.name)}
                          <span className="text-[10px] text-slate-600 ml-2 border border-slate-300 bg-white px-1.5 py-0.5 rounded font-normal">
                            {exchange.account_name || 'DEFAULT'}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono flex items-center gap-2">
                          {exchange.type?.toUpperCase() || 'CEX'}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      {/* Wallet Address Display Logic */}
                      {(() => {
                        const walletAddr = exchange.hyperliquidWalletAddr || exchange.asterUser || exchange.lighterWalletAddr
                        if (exchange.type !== 'dex' || !walletAddr) return null
                        const isVisible = visibleExchangeAddresses.has(exchange.id)
                        const isCopied = copiedId === `exchange-${exchange.id}`

                        return (
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <span className="text-[10px] font-mono text-slate-700 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                              {isVisible ? walletAddr : truncateAddress(walletAddr)}
                            </span>
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleExchangeAddressVisibility(exchange.id) }}
                              className="text-slate-500 hover:text-slate-800"
                            >
                              {isVisible ? <EyeOff size={12} /> : <Eye size={12} />}
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleCopyAddress(`exchange-${exchange.id}`, walletAddr) }}
                              className="text-slate-500 hover:text-blue-600"
                            >
                              {isCopied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                            </button>
                          </div>
                        )
                      })()}

                      {usageInfo.totalCount > 0 ? (
                        <span className={`text-[10px] font-mono px-2 py-1 rounded border ${usageInfo.runningCount > 0
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                          : 'bg-amber-50 border-amber-200 text-amber-700'
                          }`}>
                          {usageInfo.runningCount}/{usageInfo.totalCount} ACTIVE
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                          {language === 'zh' ? '就绪' : 'STANDBY'}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
              {configuredExchanges.length === 0 && (
                <div className="text-center py-10 border border-dashed border-slate-300 rounded-lg bg-slate-50">
                  <Landmark className="w-8 h-8 mx-auto mb-3 text-slate-400" />
                  <div className="text-xs font-mono text-slate-500 uppercase tracking-widest">{t('noExchangesConfigured', language)}</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Traders List */}
        <div className="binance-card p-4 md:p-6">
          <div className="flex items-center justify-between mb-4 md:mb-5">
            <h2
              className="text-lg md:text-xl font-bold flex items-center gap-2"
              style={{ color: '#0F172A' }}
            >
              <Users
                className="w-5 h-5 md:w-6 md:h-6 text-blue-600"
              />
              {t('currentTraders', language)}
            </h2>
          </div>

          {isTradersLoading ? (
            /* Loading Skeleton */
            <div className="space-y-3 md:space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex flex-col md:flex-row md:items-center justify-between p-3 md:p-4 rounded-lg gap-3 md:gap-4 animate-pulse"
                  style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}
                >
                  <div className="flex items-center gap-3 md:gap-4">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-full skeleton"></div>
                    <div className="min-w-0 space-y-2">
                      <div className="skeleton h-5 w-32"></div>
                      <div className="skeleton h-3 w-24"></div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 md:gap-4">
                    <div className="skeleton h-6 w-16"></div>
                    <div className="skeleton h-6 w-16"></div>
                    <div className="skeleton h-8 w-20"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : traders && traders.length > 0 ? (
            <div className="space-y-3 md:space-y-4">
              {traders.map((trader) => (
                <div
                  key={trader.trader_id}
                  className="flex flex-col md:flex-row md:items-center justify-between p-3 md:p-4 rounded-xl transition-all gap-3 md:gap-4 bg-white"
                  style={{ border: '1px solid #E2E8F0', boxShadow: 'var(--shadow-sm)' }}
                >
                  <div className="flex items-center gap-3 md:gap-4">
                    <div className="min-w-0">
                      <div
                        className="font-bold text-base md:text-lg truncate"
                        style={{ color: '#0F172A' }}
                      >
                        {trader.trader_name}
                      </div>
                      <div
                        className="text-xs md:text-sm truncate font-mono text-slate-500"
                      >
                        {getModelDisplayName(
                          trader.ai_model.split('_').pop() || trader.ai_model
                        )}{' '}
                        Model • {getExchangeDisplayName(trader.exchange_id, allExchanges)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 md:gap-4 flex-wrap md:flex-nowrap">
                    {/* Wallet Address for Perp-DEX - placed before status for alignment */}
                    {(() => {
                      const exchange = allExchanges.find(e => e.id === trader.exchange_id)
                      const walletAddr = getWalletAddress(exchange)
                      const isPerpDex = isPerpDexExchange(exchange?.exchange_type)
                      if (!isPerpDex || !walletAddr) return null

                      const isVisible = visibleTraderAddresses.has(trader.trader_id)
                      const isCopied = copiedId === trader.trader_id

                      return (
                        <div
                          className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-50 border border-blue-200"
                        >
                          <span className="text-xs font-mono text-blue-700">
                            {isVisible ? walletAddr : truncateAddress(walletAddr)}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleTraderAddressVisibility(trader.trader_id)
                            }}
                            className="p-0.5 rounded text-blue-500 hover:text-blue-800 transition-colors"
                            title={isVisible ? (language === 'zh' ? '隐藏' : 'Hide') : (language === 'zh' ? '显示' : 'Show')}
                          >
                            {isVisible ? (
                              <EyeOff className="w-3 h-3" />
                            ) : (
                              <Eye className="w-3 h-3" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleCopyAddress(trader.trader_id, walletAddr)
                            }}
                            className="p-0.5 rounded text-blue-500 hover:text-blue-800 transition-colors"
                            title={language === 'zh' ? '复制' : 'Copy'}
                          >
                            {isCopied ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      )
                    })()}
                    {/* Status */}
                    <div className="text-center">
                      <div
                        className={`px-2.5 md:px-3 py-1 rounded-md text-xs font-bold border ${trader.is_running
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-red-50 text-red-700 border-red-200'
                          }`}
                      >
                        {trader.is_running
                          ? t('running', language)
                          : t('stopped', language)}
                      </div>
                    </div>

                    {/* Actions: 禁止换行，超出横向滚动 */}
                    <div className="flex gap-1.5 md:gap-2 flex-nowrap overflow-x-auto items-center">
                      <button
                        onClick={() => {
                          if (onTraderSelect) {
                            onTraderSelect(trader.trader_id)
                          } else {
                            // 使用 slug 格式: name-id前4位
                            const slug = `${trader.trader_name}-${trader.trader_id.slice(0, 4)}`
                            navigate(`/dashboard?trader=${encodeURIComponent(slug)}`)
                          }
                        }}
                        className="px-2.5 md:px-3 py-1.5 md:py-2 rounded-lg text-xs md:text-sm font-semibold transition-all flex items-center gap-1 whitespace-nowrap bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100"
                      >
                        <BarChart3 className="w-3.5 h-3.5" />
                        {t('view', language)}
                      </button>

                      <button
                        onClick={() => handleEditTrader(trader.trader_id)}
                        disabled={trader.is_running}
                        className="px-2.5 md:px-3 py-1.5 md:py-2 rounded-lg text-xs md:text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap flex items-center gap-1 bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        {t('edit', language)}
                      </button>

                      <button
                        onClick={() =>
                          handleToggleTrader(
                            trader.trader_id,
                            trader.is_running || false
                          )
                        }
                        className={`px-2.5 md:px-3 py-1.5 md:py-2 rounded-lg text-xs md:text-sm font-semibold transition-all whitespace-nowrap border ${
                          trader.is_running
                            ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                        }`}
                      >
                        {trader.is_running
                          ? t('stop', language)
                          : t('start', language)}
                      </button>

                      <button
                        onClick={() => handleToggleCompetition(trader.trader_id, trader.show_in_competition ?? true)}
                        className={`px-2.5 md:px-3 py-1.5 md:py-2 rounded-lg text-xs md:text-sm font-semibold transition-all whitespace-nowrap flex items-center gap-1 border ${
                          trader.show_in_competition !== false
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                        }`}
                        title={trader.show_in_competition !== false ? '在竞技场显示' : '在竞技场隐藏'}
                      >
                        {trader.show_in_competition !== false ? (
                          <Eye className="w-3.5 h-3.5" />
                        ) : (
                          <EyeOff className="w-3.5 h-3.5" />
                        )}
                      </button>

                      <button
                        onClick={() => handleDeleteTrader(trader.trader_id)}
                        className="px-2.5 md:px-3 py-1.5 md:py-2 rounded-lg text-xs md:text-sm font-semibold transition-all bg-red-50 text-red-700 border border-red-200 hover:bg-red-100"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div
              className="text-center py-12 md:py-16 text-slate-500"
            >
              <Bot className="w-16 h-16 md:w-24 md:h-24 mx-auto mb-3 md:mb-4 opacity-50" />
              <div className="text-base md:text-lg font-semibold mb-2">
                {t('noTraders', language)}
              </div>
              <div className="text-xs md:text-sm mb-3 md:mb-4">
                {t('createFirstTrader', language)}
              </div>
              {(configuredModels.length === 0 ||
                configuredExchanges.length === 0) && (
                  <div className="text-xs md:text-sm text-yellow-500">
                    {configuredModels.length === 0 &&
                      configuredExchanges.length === 0
                      ? t('configureModelsAndExchangesFirst', language)
                      : configuredModels.length === 0
                        ? t('configureModelsFirst', language)
                        : t('configureExchangesFirst', language)}
                  </div>
                )}
            </div>
          )}
        </div>

        {/* Create Trader Modal */}
        {showCreateModal && (
          <TraderConfigModal
            isOpen={showCreateModal}
            isEditMode={false}
            availableModels={enabledModels}
            availableExchanges={enabledExchanges}
            onSave={handleCreateTrader}
            onClose={() => setShowCreateModal(false)}
          />
        )}

        {/* Edit Trader Modal */}
        {showEditModal && editingTrader && (
          <TraderConfigModal
            isOpen={showEditModal}
            isEditMode={true}
            traderData={editingTrader}
            availableModels={enabledModels}
            availableExchanges={enabledExchanges}
            onSave={handleSaveEditTrader}
            onClose={() => {
              setShowEditModal(false)
              setEditingTrader(null)
            }}
          />
        )}

        {/* Model Configuration Modal */}
        {showModelModal && (
          <ModelConfigModal
            allModels={supportedModels}
            configuredModels={allModels}
            editingModelId={editingModel}
            onSave={handleSaveModelConfig}
            onDelete={handleDeleteModelConfig}
            onClose={() => {
              setShowModelModal(false)
              setEditingModel(null)
            }}
            language={language}
          />
        )}

        {/* Exchange Configuration Modal */}
        {showExchangeModal && (
          <ExchangeConfigModal
            allExchanges={allExchanges}
            editingExchangeId={editingExchange}
            onSave={handleSaveExchangeConfig}
            onDelete={handleDeleteExchangeConfig}
            onClose={() => {
              setShowExchangeModal(false)
              setEditingExchange(null)
            }}
            language={language}
          />
        )}
      </div>
    </DeepVoidBackground>
  )
}

// 8 Slots presets configuration
const SLOTS_PRESETS = [
  { provider: 'deepseek', defaultName: 'DeepSeek', defaultModel: 'deepseek-chat', apiUrl: 'https://platform.deepseek.com/api_keys' },
  { provider: 'openai', defaultName: 'OpenAI', defaultModel: 'gpt-5.1', apiUrl: 'https://platform.openai.com/api-keys' },
  { provider: 'qwen', defaultName: 'Qwen', defaultModel: 'qwen3-max', apiUrl: 'https://dashscope.console.aliyun.com/apiKey' },
  { provider: 'claude', defaultName: 'Claude', defaultModel: 'claude-opus-4-6', apiUrl: 'https://console.anthropic.com/settings/keys' },
  { provider: 'gemini', defaultName: 'Google Gemini', defaultModel: 'gemini-3-pro-preview', apiUrl: 'https://aistudio.google.com/app/apikey' },
  { provider: 'grok', defaultName: 'Grok', defaultModel: 'grok-3-latest', apiUrl: 'https://console.x.ai' },
  { provider: 'kimi', defaultName: 'Kimi', defaultModel: 'moonshot-v1-auto', apiUrl: 'https://platform.moonshot.ai/console/api-keys' },
  { provider: 'minimax', defaultName: 'MiniMax', defaultModel: 'MiniMax-M2.5', apiUrl: 'https://platform.minimaxi.com/user-center/basic-information/interface-key' },
]

// Model Configuration Modal Component
function ModelConfigModal({
  configuredModels,
  editingModelId,
  onSave,
  onDelete,
  onClose,
  language,
}: {
  allModels?: AIModel[]
  configuredModels: AIModel[]
  editingModelId: string | null
  onSave: (
    modelId: string,
    displayName: string,
    apiKey: string,
    baseUrl?: string,
    modelName?: string
  ) => void
  onDelete: (modelId: string) => void
  onClose: () => void
  language: Language
}) {
  const findSlotIndexForId = (id: string | null): number => {
    if (!id) return 0
    const conf = configuredModels?.find((m) => m.id === id || m.provider === id)
    const prov = conf?.provider || id
    const idx = SLOTS_PRESETS.findIndex(
      (s) => s.provider === prov || prov.endsWith(`_${s.provider}`) || prov.includes(s.provider)
    )
    return idx >= 0 ? idx : 0
  }

  const [selectedSlotIndex, setSelectedSlotIndex] = useState(() => findSlotIndexForId(editingModelId))
  const [displayName, setDisplayName] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [modelName, setModelName] = useState('')

  const currentPreset = SLOTS_PRESETS[selectedSlotIndex] || SLOTS_PRESETS[0]
  const currentConfigured = configuredModels?.find(
    (m) =>
      m.provider === currentPreset.provider ||
      m.id === currentPreset.provider ||
      m.id.endsWith(`_${currentPreset.provider}`)
  )

  useEffect(() => {
    if (currentConfigured) {
      setDisplayName(currentConfigured.name || currentPreset.defaultName)
      setApiKey(currentConfigured.apiKey || '')
      setBaseUrl(currentConfigured.customApiUrl || '')
      setModelName(currentConfigured.customModelName || '')
    } else {
      setDisplayName('')
      setApiKey('')
      setBaseUrl('')
      setModelName('')
    }
  }, [selectedSlotIndex, currentConfigured?.id])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!apiKey.trim()) {
      toast.error(language === 'zh' ? '请输入 API Key' : 'Please enter API Key')
      return
    }
    const saveId = currentConfigured?.id || currentPreset.provider
    onSave(
      saveId,
      displayName.trim() || currentPreset.defaultName,
      apiKey.trim(),
      baseUrl.trim() || undefined,
      modelName.trim() || undefined
    )
  }

  const handleDeleteCurrent = () => {
    if (currentConfigured) {
      onDelete(currentConfigured.id)
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div
        className="rounded-2xl w-full max-w-2xl relative my-8 shadow-2xl bg-white border border-[#E2E8F0]"
        style={{ maxHeight: 'calc(100vh - 4rem)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-xl font-bold text-slate-900">
              {language === 'zh' ? 'AI 模型配置' : 'AI Model Configuration'}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {language === 'zh'
                ? '支持 8 个独立插槽，可接入官方或任意第三方 OpenAI 兼容 API（硅基流动 / OneAPI / 本地 Ollama 等）'
                : '8 independent slots supporting official or third-party OpenAI-compatible APIs'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {currentConfigured && (
              <button
                type="button"
                onClick={handleDeleteCurrent}
                title={language === 'zh' ? '清空/删除当前插槽' : 'Delete/Clear current slot'}
                className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6" style={{ maxHeight: 'calc(100vh - 12rem)' }}>
          {/* Top: 8 Slots Selector */}
          <div>
            <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2.5">
              {language === 'zh' ? '选择插槽进行配置 (点击切换)' : 'Select Slot to Configure (Click to switch)'}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {SLOTS_PRESETS.map((slot, idx) => {
                const conf = configuredModels?.find(
                  (m) => m.provider === slot.provider || m.id.endsWith(`_${slot.provider}`) || m.id === slot.provider
                )
                const isSelected = selectedSlotIndex === idx
                const isConfigured = !!conf && conf.enabled
                const name = conf?.name || (language === 'zh' ? `插槽 ${idx + 1}` : `Slot ${idx + 1}`)

                return (
                  <button
                    key={slot.provider}
                    type="button"
                    onClick={() => setSelectedSlotIndex(idx)}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/70 shadow-sm ring-1 ring-blue-600'
                        : isConfigured
                          ? 'border-blue-200 bg-white hover:border-blue-300 shadow-sm'
                          : 'border-slate-200 bg-slate-50/60 hover:border-slate-300'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      isSelected
                        ? 'bg-blue-600 text-white'
                        : isConfigured
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-slate-200 text-slate-500'
                    }`}>
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-slate-900 truncate" title={name}>
                        {name}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                        <span>{language === 'zh' ? `插槽 ${idx + 1}` : `Slot ${idx + 1}`}</span>
                        {isConfigured && (
                          <span className="text-emerald-600 font-bold">✓</span>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Form for Current Selected Slot */}
          <form onSubmit={handleSubmit} className="space-y-4 pt-4 border-t border-slate-100">
            {/* Slot Current Info Banner */}
            <div className="p-3.5 rounded-xl flex items-center justify-between bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-blue-600 text-white shadow-sm">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <span>{language === 'zh' ? `插槽 ${selectedSlotIndex + 1}` : `Slot ${selectedSlotIndex + 1}`}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-normal">
                      {language === 'zh' ? `模板: ${currentPreset.defaultName}` : `Template: ${currentPreset.defaultName}`}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                    {language === 'zh' ? '默认官方模型: ' : 'Default Model: '}
                    <span className="font-semibold text-slate-700">{currentPreset.defaultModel}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Display Name / Alias */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                <Tag className="w-3.5 h-3.5 text-blue-600" />
                {t('modelDisplayName', language)}
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={t('modelDisplayNamePlaceholder', language)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E2E8F0] text-slate-900 text-sm focus:border-blue-500 focus:outline-none shadow-sm"
              />
              <div className="text-[11px] text-slate-500">
                {t('modelDisplayNameDesc', language)}
              </div>
            </div>

            {/* API Key */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
                API Key *
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={t('enterAPIKey', language)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E2E8F0] text-slate-900 text-sm focus:border-blue-500 focus:outline-none shadow-sm font-mono"
                required
              />
            </div>

            {/* Custom Base URL */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                {t('customBaseURL', language)}
              </label>
              <input
                type="url"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder={t('customBaseURLPlaceholder', language)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E2E8F0] text-slate-900 text-sm focus:border-blue-500 focus:outline-none shadow-sm font-mono"
              />
              <div className="text-[11px] text-slate-500">
                {t('leaveBlankForDefault', language)}
              </div>
            </div>

            {/* Custom Model Name */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                {t('customModelName', language)}
              </label>
              <input
                type="text"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                placeholder={t('customModelNamePlaceholder', language)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E2E8F0] text-slate-900 text-sm focus:border-blue-500 focus:outline-none shadow-sm font-mono"
              />
              <div className="text-[11px] text-slate-500">
                {t('leaveBlankForDefaultModel', language)}
              </div>
            </div>

            {/* Info Box */}
            <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-200">
              <div className="text-xs font-semibold mb-1.5 flex items-center gap-1.5 text-blue-900">
                <Brain className="w-3.5 h-3.5 text-blue-600" />
                {t('information', language)}
              </div>
              <div className="text-[11px] space-y-1 text-slate-600 leading-relaxed">
                <div>• {t('modelConfigInfo1', language)}</div>
                <div>• {t('modelConfigInfo2', language)}</div>
                <div>• {t('modelConfigInfo3', language)}</div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
              >
                {language === 'zh' ? '取消' : 'Cancel'}
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors shadow-sm"
              >
                {language === 'zh' ? '保存此插槽配置' : 'Save Slot Config'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
