import { Globe, Lock, Eye, EyeOff } from 'lucide-react'

interface PublishSettingsEditorProps {
  isPublic: boolean
  configVisible: boolean
  onIsPublicChange: (value: boolean) => void
  onConfigVisibleChange: (value: boolean) => void
  disabled?: boolean
  language: string
}

export function PublishSettingsEditor({
  isPublic,
  configVisible,
  onIsPublicChange,
  onConfigVisibleChange,
  disabled = false,
  language,
}: PublishSettingsEditorProps) {
  const t = (key: string) => {
    const translations: Record<string, Record<string, string>> = {
      publishToMarket: { zh: '发布到策略市场', en: 'Publish to Market' },
      publishDesc: { zh: '策略将在市场公开展示，其他用户可发现并使用', en: 'Strategy will be publicly visible in the marketplace' },
      showConfig: { zh: '公开配置参数', en: 'Show Config' },
      showConfigDesc: { zh: '允许他人查看和复制详细配置', en: 'Allow others to view and clone config details' },
      private: { zh: '私有', en: 'PRIVATE' },
      public: { zh: '公开', en: 'PUBLIC' },
      hidden: { zh: '隐藏', en: 'HIDDEN' },
      visible: { zh: '可见', en: 'VISIBLE' },
    }
    return translations[key]?.[language] || key
  }

  return (
    <div className="space-y-3">
      {/* 发布开关 */}
      <div
        className={`relative overflow-hidden rounded-xl p-4 transition-all duration-300 ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${
          isPublic
            ? 'bg-emerald-50/70 border border-emerald-300 shadow-sm'
            : 'bg-white border border-[#E2E8F0] shadow-sm hover:border-slate-300'
        }`}
        onClick={() => !disabled && onIsPublicChange(!isPublic)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-lg transition-all duration-300 ${
                isPublic ? 'bg-emerald-100/80 border border-emerald-200' : 'bg-slate-100 border border-slate-200'
              }`}
            >
              {isPublic ? (
                <Globe className="w-5 h-5 text-emerald-600" />
              ) : (
                <Lock className="w-5 h-5 text-slate-400" />
              )}
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-900">
                {t('publishToMarket')}
              </div>
              <div className="text-xs mt-0.5 text-slate-500">
                {t('publishDesc')}
              </div>
            </div>
          </div>

          {/* Toggle with status */}
          <div className="flex items-center gap-3">
            <span
              className={`text-xs font-mono font-bold tracking-wider ${
                isPublic ? 'text-emerald-600' : 'text-slate-400'
              }`}
            >
              {isPublic ? t('public') : t('private')}
            </span>
            <div
              className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${
                isPublic ? 'bg-emerald-500' : 'bg-slate-300'
              }`}
            >
              <div
                className="absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all duration-300"
                style={{
                  left: isPublic ? '28px' : '4px',
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 配置可见性开关 - 仅在公开时显示 */}
      {isPublic && (
        <div
          className={`relative overflow-hidden rounded-xl p-4 transition-all duration-300 ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${
            configVisible
              ? 'bg-purple-50/70 border border-purple-300 shadow-sm'
              : 'bg-white border border-[#E2E8F0] shadow-sm hover:border-slate-300'
          }`}
          onClick={() => !disabled && onConfigVisibleChange(!configVisible)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`p-2.5 rounded-lg transition-all duration-300 ${
                  configVisible ? 'bg-purple-100/80 border border-purple-200' : 'bg-slate-100 border border-slate-200'
                }`}
              >
                {configVisible ? (
                  <Eye className="w-5 h-5 text-purple-600" />
                ) : (
                  <EyeOff className="w-5 h-5 text-slate-400" />
                )}
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-900">
                  {t('showConfig')}
                </div>
                <div className="text-xs mt-0.5 text-slate-500">
                  {t('showConfigDesc')}
                </div>
              </div>
            </div>

            {/* Toggle with status */}
            <div className="flex items-center gap-3">
              <span
                className={`text-xs font-mono font-bold tracking-wider ${
                  configVisible ? 'text-purple-600' : 'text-slate-400'
                }`}
              >
                {configVisible ? t('visible') : t('hidden')}
              </span>
              <div
                className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${
                  configVisible ? 'bg-purple-600' : 'bg-slate-300'
                }`}
              >
                <div
                  className="absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all duration-300"
                  style={{
                    left: configVisible ? '28px' : '4px',
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PublishSettingsEditor
