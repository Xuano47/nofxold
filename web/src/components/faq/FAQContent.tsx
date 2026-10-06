import { useEffect, useRef } from 'react'
import { t, type Language } from '../../i18n/translations'
import type { FAQCategory } from '../../data/faqData'

interface FAQContentProps {
  categories: FAQCategory[]
  language: Language
  onActiveItemChange: (itemId: string) => void
}

export function FAQContent({
  categories,
  language,
  onActiveItemChange,
}: FAQContentProps) {
  const sectionRefs = useRef<Map<string, HTMLElement>>(new Map())

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const itemId = entry.target.getAttribute('data-item-id')
            if (itemId) {
              onActiveItemChange(itemId)
            }
          }
        })
      },
      {
        rootMargin: '-100px 0px -80% 0px',
        threshold: 0,
      }
    )

    sectionRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref)
    })

    return () => {
      sectionRefs.current.forEach((ref) => {
        if (ref) observer.unobserve(ref)
      })
    }
  }, [onActiveItemChange])

  const setRef = (itemId: string, element: HTMLElement | null) => {
    if (element) {
      sectionRefs.current.set(itemId, element)
    } else {
      sectionRefs.current.delete(itemId)
    }
  }

  return (
    <div className="space-y-12">
      {categories.map((category) => (
        <div key={category.id} className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
          {/* Category Header */}
          <div className="flex items-center gap-3 mb-6 pb-3 border-b border-slate-200">
            <category.icon className="w-7 h-7 text-nofx-gold" />
            <h2 className="text-2xl font-bold text-nofx-text">
              {t(category.titleKey, language)}
            </h2>
          </div>

          {/* FAQ Items */}
          <div className="space-y-8">
            {category.items.map((item) => (
              <section
                key={item.id}
                id={item.id}
                data-item-id={item.id}
                ref={(el) => setRef(item.id, el)}
                className="scroll-mt-24"
              >
                {/* Question */}
                <h3 className="text-xl font-semibold mb-3 text-nofx-text">
                  {t(item.questionKey, language)}
                </h3>

                {/* Answer */}
                <div className="text-nofx-text-muted leading-relaxed">
                  <p className="text-base">{t(item.answerKey, language)}</p>
                </div>

                {/* Divider */}
                <div className="mt-6 h-px bg-slate-100" />
              </section>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
