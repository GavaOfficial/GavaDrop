"use client"

import * as React from "react"
import { Check, Languages } from "lucide-react"
import { useLanguage } from "@/contexts/language-context"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function LanguageToggle() {
  const { language, setLanguage, t } = useLanguage()
  const options = [
    { id: "it" as const, label: t("lang.italian"), nativeLabel: "Italiano", code: "IT" },
    { id: "en" as const, label: t("lang.english"), nativeLabel: "English", code: "EN" },
  ]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-9 w-9 rounded-xl px-0 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        >
          <Languages className="h-[1.15rem] w-[1.15rem]" />
          <span className="sr-only">Toggle language</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        side="right"
        sideOffset={62}
        className="w-[248px] rounded-2xl border border-white/[0.08] bg-[#11120f] p-2 text-white shadow-[0_20px_60px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.06)]"
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
              <DropdownMenuItem
                key={option.id}
                onClick={() => setLanguage(option.id)}
                className={`group flex cursor-pointer items-center gap-3 rounded-xl px-3 py-3 outline-none transition-colors focus:bg-white/[0.07] ${
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
              </DropdownMenuItem>
            )
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
