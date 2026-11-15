import type { ReactNode } from "react"
import type { Screen } from "./data"

const assetPathPrefix = "/assets"
export const icons = {
  home: `${assetPathPrefix}/926bd.svg`,
  truck: `${assetPathPrefix}/82b68.svg`,
  calendar: `${assetPathPrefix}/a20d8.svg`,
  qr: `${assetPathPrefix}/30ac3.svg`,
  bell: `${assetPathPrefix}/f921d.svg`,
  back: `${assetPathPrefix}/50281.svg`,
  chevron: `${assetPathPrefix}/7163e.svg`,
  alert: `${assetPathPrefix}/6f009.svg`,
  activity: `${assetPathPrefix}/39c87.svg`,
  shield: `${assetPathPrefix}/afd3d.svg`,
  mapPin: `${assetPathPrefix}/1f59f.svg`,
  check: `${assetPathPrefix}/10787.svg`,
  send: `${assetPathPrefix}/ac877.svg`,
  phone: `${assetPathPrefix}/8c0be.svg`,
}

export const equipmentPhoto = `${assetPathPrefix}/1cab8.png`
export const equipmentRearPhoto = `${assetPathPrefix}/bb5fa.png`

export function Icon({
  src,
  className = "size-4",
}: {
  src: string
  className?: string
}) {
  return <img alt="" className={className} src={src} />
}

export function Header({
  title,
  subtitle,
  onBack,
  action,
  titleAdornment,
  actionPosition = "end",
  titleAlignment = "left",
}: {
  title: ReactNode
  subtitle?: string
  onBack?: () => void
  action?: ReactNode
  titleAdornment?: ReactNode
  actionPosition?: "start" | "end"
  titleAlignment?: "left" | "right"
}) {
  const actionElement = action && (
    <div className={actionPosition === "start" ? "order-first" : "order-last"}>
      {action}
    </div>
  )

  return (
    <header className="sticky top-0 z-20 flex min-h-[60px] flex-wrap items-center gap-3 border-b border-[#dce4e8] bg-white px-4 py-3">
      {onBack && (
        <button
          aria-label="Буцах"
          className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#f2f5f7]"
          onClick={onBack}
          type="button"
        >
          <Icon src={icons.back} />
        </button>
      )}
      {actionPosition === "start" && actionElement}
      <div
        className={`min-w-0 flex-1 ${
          titleAlignment === "right" ? "text-right" : "text-left"
        }`}
      >
        <div
          className={`flex items-center gap-2 ${
            titleAlignment === "right" ? "justify-end" : "justify-start"
          }`}
        >
          <h1 className="truncate font-['Inter:Bold'] text-[16px] font-bold text-[#14212a]">
            {title}
          </h1>
          {titleAdornment}
        </div>
        {subtitle && (
          <p className="mt-0.5 truncate font-['Inter:Regular'] text-[9px] text-[#7b8a94]">
            {subtitle}
          </p>
        )}
      </div>
      {actionPosition === "end" && actionElement}
    </header>
  )
}

export function BottomNav({
  current,
  onNavigate,
}: {
  current: Screen
  onNavigate: (screen: Screen) => void
}) {
  const items: {
    id: Screen
    label: string
    icon: string
  }[] = [
    { id: "home", label: "Нүүр", icon: icons.home },
    { id: "equipment", label: "Төхөөрөмж", icon: icons.truck },
    { id: "map", label: "Газрын зураг", icon: icons.mapPin },
    { id: "scanner", label: "QR", icon: icons.qr },
    { id: "notifications", label: "Мэдэгдэл", icon: icons.bell },
  ]

  return (
    <nav className="sticky bottom-0 z-20 grid h-[66px] grid-cols-5 border-t border-[#dce4e8] bg-white px-1 md:order-first md:top-0 md:bottom-auto md:h-14 md:border-t-0 md:border-b md:px-4">
      {items.map((item) => {
        const active =
          current === item.id ||
          (item.id === "equipment" &&
            ["detail", "checkout", "checkin", "calendar"].includes(current))

        return (
          <button
            className={`flex flex-col items-center justify-center gap-1 rounded-lg font-['Inter:Regular'] text-[9px] md:flex-row md:gap-2 md:text-sm ${
              active ? "bg-[#e8f4f9] text-[#1677a8]" : "text-[#7b8a94]"
            }`}
            key={item.id}
            onClick={() => onNavigate(item.id)}
            type="button"
          >
            <Icon className="size-[18px]" src={item.icon} />
            {item.label}
          </button>
        )
      })}
    </nav>
  )
}

export function MobilePage({
  children,
  current,
  onNavigate,
}: {
  children: ReactNode
  current: Screen
  onNavigate: (screen: Screen) => void
}) {
  return (
    <main className="mx-auto flex min-h-dvh w-full flex-col bg-[#eef2f4] font-['Inter:Regular'] text-[#14212a] md:my-8 md:min-h-[calc(100dvh-4rem)] md:max-w-7xl md:overflow-hidden md:rounded-2xl md:border md:border-[#dce4e8] md:bg-white md:shadow-[0_18px_48px_rgba(20,33,42,0.08)]">
      <div className="flex flex-1 flex-col">{children}</div>
      <BottomNav current={current} onNavigate={onNavigate} />
    </main>
  )
}

export function StatusPill({
  children,
  tone = "green",
}: {
  children: ReactNode
  tone?: "green" | "blue" | "orange" | "red" | "gray"
}) {
  const colors = {
    green: "bg-[#e3f3ec] text-[#238a62]",
    blue: "bg-[#e2f1f7] text-[#1677a8]",
    orange: "bg-[#fff2dd] text-[#bd7111]",
    red: "bg-[#fbe7e5] text-[#d8463e]",
    gray: "bg-[#edf1f3] text-[#687985]",
  }

  return (
    <span
      className={`rounded-full px-2 py-1 font-['Inter:Bold'] text-[9px] font-bold whitespace-nowrap ${colors[tone]}`}
    >
      {children}
    </span>
  )
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={`rounded-[10px] border border-[#dce4e8] bg-white shadow-[0_2px_8px_rgba(20,33,42,0.04)] ${className}`}
    >
      {children}
    </section>
  )
}
