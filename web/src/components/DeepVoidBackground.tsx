import React from 'react'

interface DeepVoidBackgroundProps extends React.HTMLAttributes<HTMLDivElement> {
    children?: React.ReactNode
    className?: string
    disableAnimation?: boolean
}

export function DeepVoidBackground({ children, className = '', disableAnimation = false, ...props }: DeepVoidBackgroundProps) {
    return (
        <div className={`relative w-full min-h-screen bg-nofx-bg text-nofx-text overflow-hidden flex flex-col ${className}`} {...props}>
            {/* Subtle Financial Canvas Grid Accent */}
            <div className="absolute inset-0 pointer-events-none fixed z-0 opacity-40">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000006_1px,transparent_1px),linear-gradient(to_bottom,#00000006_1px,transparent_1px)] bg-[size:32px_32px]"></div>
            </div>

            {/* Content Layer */}
            <div className="relative z-10 flex-1 flex flex-col h-full w-full">
                {children}
            </div>
        </div>
    )
}
