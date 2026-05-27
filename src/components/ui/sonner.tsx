"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      position="bottom-right"
      richColors
      closeButton
      gap={10}
      visibleToasts={4}
      offset={{
        right: "max(24px, calc((100vw - 1440px) / 2 + 24px))",
        bottom: 24,
      }}
      mobileOffset={{ left: 16, right: 16, bottom: 96 }}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group/toast min-h-14 w-[360px] max-w-[calc(100vw-32px)] rounded-xl border border-white/[0.1] bg-[#11130f]/95 px-4 py-3 text-white shadow-[0_18px_45px_-18px_rgba(0,0,0,0.75)] backdrop-blur-md",
          title: "text-sm font-semibold leading-5 text-white",
          description: "text-xs font-medium text-white/55",
          icon: "text-[#dff36b]",
          closeButton:
            "border-white/10 bg-white/10 text-white/70 hover:bg-white/15 hover:text-white",
          success: "border-[#dff36b]/20",
          error: "border-red-400/25",
          info: "border-[#c9a6ff]/20",
          warning: "border-orange-300/25",
        },
      }}
      style={
        {
          "--normal-bg": "#11130f",
          "--normal-text": "#ffffff",
          "--normal-border": "rgba(255,255,255,0.08)",
          "--success-bg": "#11130f",
          "--success-text": "#ffffff",
          "--success-border": "rgba(223,243,107,0.2)",
          "--error-bg": "#11130f",
          "--error-text": "#ffffff",
          "--error-border": "rgba(248,113,113,0.25)",
          "--info-bg": "#11130f",
          "--info-text": "#ffffff",
          "--info-border": "rgba(201,166,255,0.2)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
