"use client"

import * as React from "react"
import { Check, Languages } from "lucide-react"
import { useLanguage } from "@/contexts/language-context"

import { Button } from "@/components/ui/button"

type PopupPosition = {
  left: number
  bottom: number
}

export function LanguageSelector() {
  const { language, setLanguage, t } = useLanguage()
  const [isOpen, setIsOpen] = React.useState(false)
  const [position, setPosition] = React.useState<PopupPosition | null>(null)
  const popupRef = React.useRef<HTMLDivElement>(null)
  const buttonRef = React.useRef<HTMLButtonElement>(null)
  const options = [
    { id: "it" as const, label: t("lang.italian"), nativeLabel: "Italiano", code: "IT" },
    { id: "en" as const, label: t("lang.english"), nativeLabel: "English", code: "EN" },
  ]

  const syncPosition = React.useCallback(() => {
    const section = document.querySelector("main .section-enter")

    if (!(section instanceof HTMLElement)) return

    const rect = section.getBoundingClientRect()

    setPosition({
      left: rect.left,
      bottom: window.innerHeight - rect.bottom,
    })
  }, [])

  React.useEffect(() => {
    if (!isOpen) return

    syncPosition()
    window.addEventListener("resize", syncPosition)
    window.addEventListener("scroll", syncPosition, true)

    return () => {
      window.removeEventListener("resize", syncPosition)
      window.removeEventListener("scroll", syncPosition, true)
    }
  }, [isOpen, syncPosition])

  React.useEffect(() => {
    if (!isOpen) return

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node

      if (popupRef.current?.contains(target) || buttonRef.current?.contains(target)) {
        return
      }

      setIsOpen(false)
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false)
      }
    }

    document.addEventListener("pointerdown", handlePointerDown)
    document.addEventListener("keydown", handleKeyDown)

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen])

  return (
    <>
      <Button
        ref={buttonRef}
        variant="ghost"
        size="sm"
        className="h-9 w-9 rounded-xl px-0 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        onClick={() => {
          syncPosition()
          setIsOpen((open) => !open)
        }}
      >
        <Languages className="h-[1.15rem] w-[1.15rem]" />
        <span className="sr-only">Toggle language</span>
      </Button>

      {isOpen && position && (
        <div
          ref={popupRef}
          role="menu"
          aria-label="Toggle language"
          className="fixed z-50 w-[248px] rounded-[1.35rem] border border-white/[0.08] bg-[#11120f] p-2 text-white shadow-[0_20px_60px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.06)]"
          style={{
            left: position.left,
            bottom: position.bottom,
          }}
        >
          <div className="px-3 pb-2 pt-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/35">
              {t("lang.choose")}
            </p>
          </div>
          <div className="space-y-1">
            {options.map((option) => {
              const isActive = language === option.id

              return (
                <button
                  key={option.id}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setLanguage(option.id)
                    setIsOpen(false)
                  }}
                  className={`group flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-3 text-left outline-none transition-colors focus:bg-white/[0.07] ${
                    isActive ? "bg-white/[0.08]" : "hover:bg-white/[0.05]"
                  }`}
                >
                  <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border text-sm font-bold tracking-tight ${
                    isActive
                      ? "border-[#e6d5ff]/35 bg-[#e6d5ff] text-black"
                      : "border-white/[0.08] bg-black/20 text-white/55 group-hover:text-white"
                  }`}>
                    {option.code}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-white">
                      {option.label}
                    </span>
                    <span className="mt-0.5 block text-xs font-medium text-white/35">
                      {isActive ? t("lang.current") : option.nativeLabel}
                    </span>
                  </span>
                  <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full transition-opacity ${
                    isActive ? "bg-[#e6d5ff] text-black opacity-100" : "opacity-0"
                  }`}>
                    <Check className="h-3.5 w-3.5" />
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </>
  )
}
