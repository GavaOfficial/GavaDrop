import Image from "next/image"

interface RoundedIconProps {
  width?: number
  height?: number
  className?: string
}

export function RoundedIcon({ width = 32, height = 32, className = "" }: RoundedIconProps) {
  return (
    <div className={`rounded-lg overflow-hidden bg-white dark:bg-gray-900 ${className}`}>
      <Image
        src="/icon.png"
        alt="GavaDrop Icon"
        width={width}
        height={height}
        className="w-full h-full"
      />
    </div>
  )
}