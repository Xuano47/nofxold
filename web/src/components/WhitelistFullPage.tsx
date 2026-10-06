import { motion } from 'framer-motion'
import { ShieldAlert, ArrowLeft, Lock } from 'lucide-react'

interface WhitelistFullPageProps {
  onBack?: () => void
}

export function WhitelistFullPage({ onBack }: WhitelistFullPageProps) {
  const handleBackToLogin = () => {
    if (onBack) {
      onBack()
    } else {
      window.location.href = '/login'
    }
  }

  return (
    <div className="min-h-screen bg-nofx-bg text-slate-800 relative overflow-hidden flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-lg w-full relative z-10"
      >
        <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-xl relative group">

          {/* Top Bar */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-red-50 border-b border-red-100">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-slate-300"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-slate-300"></div>
            </div>
            <div className="text-[11px] text-red-600 font-mono tracking-wider font-semibold">
              ACCESS_DENIED // 403
            </div>
          </div>

          <div className="p-8 text-center">
            {/* Icon */}
            <div className="relative mx-auto mb-6 w-16 h-16 flex items-center justify-center">
              <div className="p-4 border border-red-200 rounded-full bg-red-50 shadow-sm">
                <ShieldAlert className="w-8 h-8 text-red-600" />
              </div>
            </div>

            {/* Title */}
            <h1 className="text-2xl font-bold mb-2 tracking-wide text-slate-900">
              访问受限
            </h1>

            {/* Description */}
            <p className="text-sm text-slate-600 mb-6 leading-relaxed px-4">
              当前账户不在允许的白名单列表中。如需访问，请联系管理员开通权限。
            </p>

            {/* Info Box */}
            <div className="bg-slate-50 border border-[#E2E8F0] p-4 rounded-xl mb-6 text-left">
              <div className="flex items-start gap-3">
                <Lock className="w-4 h-4 text-red-600 mt-0.5" />
                <div>
                  <h3 className="text-xs font-bold text-slate-800 uppercase mb-1">权限说明</h3>
                  <p className="text-xs text-slate-500 leading-normal">
                    系统目前处于内测阶段，名额分批开放。如果您已获得授权，请核对登录凭据或重新尝试。
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div>
              <button
                onClick={handleBackToLogin}
                className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all text-sm font-semibold shadow-md group"
              >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                返回登录页面
              </button>
            </div>

          </div>

          {/* Footer */}
          <div className="bg-[#F8FAFC] p-3 text-[11px] text-slate-400 text-center border-t border-[#E2E8F0] font-mono">
            SECURITY PROTOCOL ACTIVE
          </div>

        </div>
      </motion.div>
    </div>
  )
}
