import { useEffect, useMemo, useState } from "react"
import {
  api,
  type DashboardResponse,
  type SearchHistoryItem,
  type User,
  type UserRole,
  type WorksiteLocation,
} from "../../lib/api"
import { rentalCategories, rentalCategoryIcons } from "../../rentalCatalog"
import { fallbackDashboard, type Screen } from "../data"
import { GoogleMapPicker } from "../GoogleMapPicker"
import {
  Card,
  Header,
  Icon,
  MobilePage,
  StatusPill,
  equipmentPhoto,
  icons,
} from "../ui"

export function HomeScreen({
  dashboard,
  onNavigate,
  onSignOut,
  onBackToWebsite,
  role,
  user,
}: {
  dashboard: DashboardResponse
  onNavigate: (screen: Screen) => void
  onSignOut: () => void
  onBackToWebsite?: () => void
  role: UserRole
  user: User
}) {
  const summary = dashboard.summary
  const roleLabel =
    role === "manager"
      ? "Менежер"
      : role === "fixer"
        ? "Засварчин"
        : "Түрээслэгч"
  const roleGreeting =
    role === "manager"
      ? "Тайлангийн тойм"
      : role === "fixer"
        ? "Ажлын тасалбар"
        : "Түрээслэх бүртгэл"

  return (
    <MobilePage current="home" onNavigate={onNavigate}>
      <Header
        actionPosition="end"
        titleAlignment="left"
        titleAdornment={
          <button
            aria-label="Миний профайл"
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#e2f1f7] font-['Inter:Bold'] text-[12px] font-bold text-[#1677a8]"
            onClick={() => onNavigate("profile")}
            title="Миний профайл"
            type="button"
          >
            {user.name.trim().charAt(0).toUpperCase() || "?"}
          </button>
        }
        action={
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              {onBackToWebsite && (
                <button
                  className="rounded-full border border-[#dce4e8] bg-[#edf7ff] px-2 py-1 font-['Inter:Bold'] text-[9px] font-bold text-[#1677a8]"
                  onClick={onBackToWebsite}
                  type="button"
                >
                  Вэбсайтын нүүр хуудас
                </button>
              )}
              <button
                className="rounded-full border border-[#dce4e8] bg-[#f8fafb] px-2 py-1 font-['Inter:Bold'] text-[9px] font-bold text-[#42515d]"
                onClick={() => onNavigate("home")}
                type="button"
              >
                Буцах
              </button>
              <button
                className="rounded-full border border-[#dce4e8] bg-[#f3f7f8] px-2 py-1 font-['Inter:Bold'] text-[9px] font-bold text-[#42515d]"
                onClick={onSignOut}
                type="button"
              >
                Гарах
              </button>
            </div>
            <button
              aria-label="Мэдэгдэл"
              className="relative flex size-9 items-center justify-center rounded-full bg-[#f2f5f7]"
              onClick={() => onNavigate("notifications")}
              type="button"
            >
              <Icon src={icons.bell} />
              <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-[#df453e]" />
            </button>
          </div>
        }
        subtitle={`${user.company} · ${summary.siteName}`}
        title={`Өдрийн мэнд, ${roleLabel}`}
      />
      <div className="flex flex-1 flex-col gap-3 p-3">
        <div className="grid grid-cols-3 gap-2">
          {[
            [String(summary.rentedToday), "Түрээстэй"],
            [String(summary.totalEquipment), "Нийт"],
            [String(summary.alerts), "Анхаарах"],
          ].map(([value, label], index) => (
            <Card
              className={`p-3 ${
                index === 2 ? "border-[#e98b86] bg-[#fff3f2]" : ""
              }`}
              key={label}
            >
              <p className="font-['Roboto_Mono:Bold'] text-[22px] font-bold">
                {value}
              </p>
              <p className="mt-1 text-[9px] text-[#6c7c87]">{label}</p>
            </Card>
          ))}
        </div>

        {dashboard.alerts[0] ? (
          <button
            className="rounded-[10px] border border-[#e7847e] bg-[#fff3f2] p-3 text-left"
            onClick={() => onNavigate("anomaly")}
            type="button"
          >
            <div className="flex items-start gap-3">
              <span className="flex size-9 items-center justify-center rounded-lg bg-[#d8463e]">
                <Icon
                  className="size-5 brightness-0 invert"
                  src={icons.alert}
                />
              </span>
              <div className="flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-['Inter:Bold'] text-[12px] font-bold">
                    {dashboard.alerts[0].title}
                  </p>
                  <span className="font-['Roboto_Mono:Bold'] text-[11px] font-bold text-[#d8463e]">
                    {dashboard.alerts[0].risk}
                  </span>
                </div>
                <p className="mt-1 text-[9px] text-[#8a5c59]">
                  {dashboard.alerts[0].equipmentId} ·{" "}
                  {dashboard.alerts[0].description}
                </p>
              </div>
            </div>
          </button>
        ) : (
          <Card className="flex items-center gap-3 p-3">
            <span className="flex size-9 items-center justify-center rounded-lg bg-[#edf2f4] text-[#6c7c87]">
              <Icon className="size-5" src={icons.alert} />
            </span>
            <div>
              <p className="font-['Inter:Bold'] text-[12px] font-bold">
                Мэдрэгчийн өгөгдөл алга
              </p>
              <p className="mt-1 text-[9px] text-[#6c7c87]">
                Температур болон эрсдэлийн мэдээлэл одоогоор байхгүй.
              </p>
            </div>
          </Card>
        )}

        <Card>
          <div className="flex items-center justify-between border-b border-[#e4eaed] p-3">
            <h2 className="font-['Inter:Bold'] text-[12px] font-bold">
              Дараагийн ажлууд
            </h2>
            <span className="text-[9px] text-[#7c8a93]">3 ажил</span>
          </div>
          {[
            ["13:10", "Генератор check-out", "Өнөөдөр"],
            ["14:30", "Өрмийн машин буцаалт", "Хүлээгдэж"],
            ["16:00", "Багаж шалгах", "Дараа"],
          ].map(([time, title, state]) => (
            <div
              className="flex items-center gap-3 border-b border-[#edf1f3] p-3 last:border-0"
              key={time}
            >
              <span className="font-['Roboto_Mono:Bold'] text-[11px] font-bold">
                {time}
              </span>
              <p className="flex-1 text-[11px]">{title}</p>
              <span className="text-[8px] text-[#758690]">{state}</span>
            </div>
          ))}
        </Card>

        <div className="grid grid-cols-2 gap-2">
          <button
            className="flex h-[64px] items-center gap-3 rounded-[10px] bg-[#e2f1f7] p-3 text-left"
            onClick={() =>
              onNavigate(role === "fixer" ? "scanner" : "equipment")
            }
            type="button"
          >
            <Icon className="size-6" src={icons.qr} />
            <span className="font-['Inter:Bold'] text-[11px] font-bold">
              {role === "fixer" ? "QR уншуулах" : "Төхөөрөмжийн жагсаалт"}
            </span>
          </button>
          <button
            className="home-notifications-shortcut flex h-[64px] items-center gap-3 rounded-[10px] border border-[#dce4e8] bg-[#f3f7f8] p-3 text-left text-[#14212a]"
            onClick={() =>
              onNavigate(role === "fixer" ? "support" : "notifications")
            }
            type="button"
          >
            <Icon className="size-6 brightness-0 opacity-70" src={icons.send} />
            <span className="font-['Inter:Bold'] text-[11px] font-bold">
              {role === "fixer" ? "Тусламж" : "Мэдэгдэл"}
            </span>
          </button>
        </div>

        <div className="rounded-[10px] border border-[#dce4e8] bg-white p-3">
          <p className="font-['Inter:Bold'] text-[10px] font-bold text-[#6c7c87]">
            {roleGreeting}
          </p>
          <div className="mt-2 flex items-center justify-between">
            <span className="font-['Inter:Bold'] text-[12px] font-bold text-[#14212a]">
              {role === "manager"
                ? "Бүртгэл, тайлан, даалгавар"
                : role === "fixer"
                  ? "Засвар, QR, telemetry"
                  : "Гэрээ, төлбөр, түрээсийн хяналт"}
            </span>
            <button
              className="rounded-full bg-[#1677a8] px-2.5 py-1 text-[9px] font-bold text-white"
              onClick={() =>
                onNavigate(role === "fixer" ? "detail" : "notifications")
              }
              type="button"
            >
              Үргэлжлүүлэх
            </button>
          </div>
          {(role === "manager" || role === "fixer") && (
            <button
              className="rounded-[10px] border border-[#dce4e8] bg-white p-3 text-left font-['Inter:Bold'] text-[11px] font-bold text-[#42515d]"
              onClick={() => onNavigate("security")}
              type="button"
            >
              npm security
            </button>
          )}
        </div>
      </div>
    </MobilePage>
  )
}

export function ProfileScreen({
  user,
  onNavigate,
  sessionToken,
}: {
  user: User
  onNavigate: (screen: Screen) => void
  sessionToken?: string
}) {
  const [worksiteLocation, setWorksiteLocation] =
    useState<WorksiteLocation | null>(null)
  const [isLoadingWorksite, setIsLoadingWorksite] = useState(false)
  const [worksiteError, setWorksiteError] = useState("")
  const roleLabel =
    user.role === "manager"
      ? "Менежер"
      : user.role === "fixer"
        ? "Засварчин"
        : "Түрээслэгч"

  useEffect(() => {
    setWorksiteLocation(null)
    setWorksiteError("")
    if (user.role !== "renter" || !sessionToken) {
      setIsLoadingWorksite(false)
      return
    }

    let active = true
    setIsLoadingWorksite(true)
    api
      .getWorksiteLocation(sessionToken)
      .then(({ location }) => {
        if (active) setWorksiteLocation(location)
      })
      .catch((error: unknown) => {
        if (active) {
          setWorksiteError(
            error instanceof Error
              ? error.message
              : "Ажлын байршлыг ачаалж чадсангүй.",
          )
        }
      })
      .finally(() => {
        if (active) setIsLoadingWorksite(false)
      })

    return () => {
      active = false
    }
  }, [sessionToken, user.role])

  const profileFields = [
    ["Бүтэн нэр", user.name],
    ["Бүртгэлийн төрөл", roleLabel],
    ["Байгууллага", user.company],
    ["Утасны дугаар", user.phone],
    ["Имэйл хаяг", user.email],
    ["Хэрэглэгчийн дугаар", user.id],
  ]

  return (
    <MobilePage current="profile" onNavigate={onNavigate}>
      <Header
        onBack={() => onNavigate("home")}
        subtitle="Бүртгэлтэй мэдээлэл"
        title="Миний профайл"
      />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <Card className="flex items-center gap-4 p-4">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-[#e2f1f7] font-['Inter:Bold'] text-xl font-bold text-[#1677a8]">
            {user.name.trim().charAt(0).toUpperCase() || "?"}
          </div>
          <div className="min-w-0">
            <h2 className="truncate font-['Inter:Bold'] text-[16px] font-bold">
              {user.name}
            </h2>
            <p className="mt-1 text-[11px] text-[#6c7c87]">{roleLabel}</p>
          </div>
        </Card>

        <Card className="divide-y divide-[#edf1f3] px-4">
          {profileFields.map(([label, value]) => (
            <div className="py-3" key={label}>
              <p className="text-[10px] text-[#7b8a94]">{label}</p>
              <p className="mt-1 break-all font-['Inter:Bold'] text-[12px] font-bold text-[#14212a]">
                {value || "Бүртгэгдээгүй"}
              </p>
            </div>
          ))}
        </Card>

        {user.role === "renter" && (
          <Card className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-['Inter:Bold'] text-[12px] font-bold">
                  Ажиллах газрын байршил
                </h2>
                <p className="mt-1 text-[10px] text-[#7b8a94]">
                  {isLoadingWorksite
                    ? "Байршил ачаалж байна..."
                    : (worksiteLocation?.address ??
                      "Ажлын байршил бүртгэгдээгүй байна.")}
                </p>
                {worksiteLocation && (
                  <p className="mt-1 font-['Roboto_Mono:Regular'] text-[9px] text-[#6c7c87]">
                    {worksiteLocation.coordinates.latitude.toFixed(6)},{" "}
                    {worksiteLocation.coordinates.longitude.toFixed(6)}
                  </p>
                )}
                {worksiteError && (
                  <p
                    aria-live="polite"
                    className="mt-2 text-[10px] text-[#b42318]"
                  >
                    {worksiteError}
                  </p>
                )}
              </div>
            </div>
            {worksiteLocation && (
              <div className="mt-3 space-y-2">
                <GoogleMapPicker
                  address={worksiteLocation.address}
                  apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? ""}
                  coordinates={worksiteLocation.coordinates}
                  mapLabel="Таны ажиллах газрын зураг"
                  onAddressChange={() => {}}
                  onSelect={() => {}}
                  readOnly
                />
                <a
                  className="inline-block text-[10px] font-bold text-[#1677a8] underline"
                  href={`https://maps.google.com/?q=${worksiteLocation.coordinates.latitude},${worksiteLocation.coordinates.longitude}`}
                  rel="noreferrer"
                  target="_blank"
                >
                  Google Maps дээр нээх
                </a>
              </div>
            )}
            <button
              className="mt-3 w-full rounded-lg border border-[#1677a8] px-3 py-2 text-[10px] font-bold text-[#1677a8]"
              onClick={() => onNavigate("map")}
              type="button"
            >
              {worksiteLocation
                ? "Ажлын байршлыг өөрчлөх"
                : "Ажлын байршил тохируулах"}
            </button>
          </Card>
        )}
      </div>
    </MobilePage>
  )
}

export function EquipmentScreen({
  dashboard,
  onNavigate,
  onSelectEquipment,
  userToken,
}: {
  dashboard: DashboardResponse
  onNavigate: (screen: Screen) => void
  onSelectEquipment: (id: string) => void
  userToken?: string
}) {
  const [activeFilter, setActiveFilter] =
    useState<"all" | "ready" | "rented" | "alert">("all")
  const [activeCategory, setActiveCategory] = useState("Бүгд")
  const [searchText, setSearchText] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([])
  const [historyError, setHistoryError] = useState("")
  const equipment = dashboard.equipment ?? fallbackDashboard.equipment

  useEffect(() => {
    setSearchHistory([])
    setHistoryError("")
    if (!userToken) {
      return
    }

    let active = true
    api
      .getSearchHistory(userToken)
      .then(({ items }) => {
        if (active) setSearchHistory(items)
      })
      .catch(() => {
        if (active) setHistoryError("Хайлтын түүхийг татаж чадсангүй.")
      })
    return () => {
      active = false
    }
  }, [userToken])

  const filteredEquipment = useMemo(() => {
    return equipment.filter((item) => {
      const matchesStatus =
        activeFilter === "all" ||
        (activeFilter === "ready" && item.status === "Бэлэн") ||
        (activeFilter === "rented" && item.status === "Түрээстэй") ||
        (activeFilter === "alert" &&
          (item.status === "Анхаарах" || item.status === "Засварт"))
      const matchesCategory =
        activeCategory === "Бүгд" || item.category === activeCategory
      const normalizedSearch = searchTerm.toLocaleLowerCase()
      const matchesSearch =
        !normalizedSearch ||
        `${item.name} ${item.model} ${item.meta} ${item.category ?? ""} ${item.location}`
          .toLocaleLowerCase()
          .includes(normalizedSearch)
      return matchesStatus && matchesCategory && matchesSearch
    })
  }, [activeCategory, activeFilter, equipment, searchTerm])

  const submitSearch = async (value = searchText) => {
    const query = value.trim()
    setSearchTerm(query)
    setHistoryError("")
    if (!query || !userToken) return

    try {
      const result = await api.saveSearchHistory(query, userToken)
      setSearchHistory(result.items)
    } catch {
      setHistoryError("Хайлтыг хадгалж чадсангүй. Дахин оролдоно уу.")
    }
  }

  const clearHistory = async () => {
    if (!userToken) return
    setHistoryError("")
    try {
      await api.clearSearchHistory(userToken)
      setSearchHistory([])
    } catch {
      setHistoryError("Хайлтын түүхийг цэвэрлэж чадсангүй.")
    }
  }

  return (
    <MobilePage current="equipment" onNavigate={onNavigate}>
      <Header
        onBack={() => onNavigate("home")}
        subtitle={`${dashboard.summary.totalEquipment} төхөөрөмж · 4 талбай`}
        title="Тоног төхөөрөмж"
      />
      <form
        className="flex gap-2 bg-white px-3 py-3"
        onSubmit={(event) => {
          event.preventDefault()
          void submitSearch()
        }}
      >
        <label className="sr-only" htmlFor="equipment-search">
          Төхөөрөмж хайх
        </label>
        <input
          className="min-w-0 flex-1 rounded-lg border border-[#dce4e8] px-3 py-2 text-[11px] outline-none focus:border-[#1677a8]"
          id="equipment-search"
          maxLength={120}
          onChange={(event) => setSearchText(event.target.value)}
          placeholder="Нэр, загвар, дугаараар хайх..."
          type="search"
          value={searchText}
        />
        <button
          className="rounded-lg bg-[#14212a] px-4 py-2 text-[10px] font-bold text-white"
          type="submit"
        >
          Хайх
        </button>
      </form>
      {userToken ? (
        <section
          aria-label="Сүүлийн хайлтууд"
          className="border-b border-[#e4eaed] bg-white px-3 pb-3"
        >
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-[10px] font-bold text-[#42515d]">
              Сүүлийн хайлтууд
            </h2>
            {searchHistory.length > 0 && (
              <button
                className="text-[9px] text-[#1677a8] underline"
                onClick={() => void clearHistory()}
                type="button"
              >
                Түүх цэвэрлэх
              </button>
            )}
          </div>
          {searchHistory.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {searchHistory.map((item, index) => (
                <button
                  className="rounded-full bg-[#f3f6f7] px-3 py-1 text-[9px] text-[#42515d]"
                  key={`${item.searchedAt}-${index}`}
                  onClick={() => {
                    setSearchText(item.query)
                    setSearchTerm(item.query)
                  }}
                  type="button"
                >
                  {item.query}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-[9px] text-[#7b8992]">
              Хайлтын түүх хоосон байна.
            </p>
          )}
        </section>
      ) : (
        <p className="bg-white px-3 pb-3 text-[9px] text-[#7b8992]">
          Нэвтэрснээр хайлтын түүхээ хадгална.
        </p>
      )}
      {historyError && (
        <p
          aria-live="polite"
          className="bg-white px-3 pb-2 text-[10px] text-[#b42318]"
        >
          {historyError}
        </p>
      )}
      <div className="flex gap-2 overflow-x-auto bg-white px-3 py-2">
        {[
          { id: "all", label: "Бүгд 128" },
          { id: "ready", label: "Бэлэн 30" },
          { id: "rented", label: "Түрээстэй 76" },
          { id: "alert", label: "Анхаарах 9" },
        ].map((filter) => (
          <button
            className={`rounded-full px-3 py-1.5 text-[9px] whitespace-nowrap ${
              activeFilter === filter.id
                ? "bg-[#14212a] text-white"
                : "bg-[#eef2f4] text-[#5d6e79]"
            }`}
            key={filter.id}
            onClick={() =>
              setActiveFilter(filter.id as "all" | "ready" | "rented" | "alert")
            }
            type="button"
          >
            {filter.label}
          </button>
        ))}
      </div>
      <div
        aria-label="Төхөөрөмжийн ангилал"
        className="flex gap-2 overflow-x-auto border-b border-[#e4eaed] bg-white px-3 py-2"
        role="group"
      >
        {["Бүгд", ...rentalCategories].map((category) => (
          <button
            aria-pressed={activeCategory === category}
            className={`rounded-full px-3 py-1.5 text-[9px] whitespace-nowrap ${
              activeCategory === category
                ? "bg-[#e2f1f7] font-bold text-[#1677a8]"
                : "bg-[#f3f6f7] text-[#5d6e79]"
            }`}
            key={category}
            onClick={() => setActiveCategory(category)}
            type="button"
          >
            {category !== "Бүгд" && (
              <span aria-hidden="true" className="mr-1.5">
                {rentalCategoryIcons[category]}
              </span>
            )}
            {category}
          </button>
        ))}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3">
        {filteredEquipment.length === 0 && (
          <p className="rounded-[10px] border border-dashed border-[#dce4e8] bg-white p-4 text-center text-[11px] text-[#6c7c87]">
            Энэ ангилал, төлөвт тохирох төхөөрөмж алга.
          </p>
        )}
        {filteredEquipment.map((item, index) => (
          <button
            aria-label={`${item.name} ${item.meta} ${item.status}`}
            className="flex w-full items-center gap-3 rounded-[10px] border border-[#dce4e8] bg-white p-2 text-left"
            key={item.meta}
            onClick={() => {
              onSelectEquipment(item.id)
              onNavigate("detail")
            }}
            type="button"
          >
            <img
              alt=""
              className="size-12 shrink-0 rounded-lg bg-[#edf6f9] object-cover"
              onError={(event) => {
                event.currentTarget.src = "/assets/rent-ops-illustration.svg"
              }}
              src={
                item.photoUrl ??
                (item.id.startsWith("GEN-")
                  ? "/assets/equipment-catalog/generator.png"
                  : item.id.startsWith("DRL-")
                    ? "/assets/equipment-catalog/diamond-drill-rig.png"
                    : "/assets/rent-ops-illustration.svg")
              }
            />
            <span className="min-w-0 flex-1">
              <span className="block font-['Inter:Bold'] text-[11px] font-bold">
                {item.name}
              </span>
              <span className="mt-1 block font-['Roboto_Mono:Regular'] text-[8px] text-[#7b8992]">
                {item.meta}
              </span>
            </span>
            <StatusPill
              tone={
                index === 0
                  ? "blue"
                  : index === 2
                    ? "orange"
                    : index === 3
                      ? "gray"
                      : "green"
              }
            >
              {item.status}
            </StatusPill>
          </button>
        ))}
      </div>
    </MobilePage>
  )
}

export function DetailScreen({
  dashboard,
  equipmentId,
  onUploadPhoto,
  onNavigate,
}: {
  dashboard: DashboardResponse
  equipmentId?: string
  onUploadPhoto: (equipmentId: string, file: File) => Promise<void>
  onNavigate: (screen: Screen) => void
}) {
  const [uploadMessage, setUploadMessage] = useState("")
  const [uploading, setUploading] = useState(false)
  const equipment = dashboard.equipment ?? fallbackDashboard.equipment
  const primaryEquipment =
    equipment.find((item) => item.id === equipmentId) ??
    equipment[0] ??
    fallbackDashboard.equipment[0]
  const telemetry = [
    [primaryEquipment?.telemetry.vibration, "mm/s"],
    [primaryEquipment?.telemetry.temperature, "°C"],
    [primaryEquipment?.telemetry.rpm, "RPM"],
  ].filter(
    (entry): entry is [string, string] =>
      typeof entry[0] === "string" && entry[0].length > 0,
  )

  return (
    <MobilePage current="detail" onNavigate={onNavigate}>
      <Header
        onBack={() => onNavigate("equipment")}
        subtitle={primaryEquipment?.meta ?? "DRL-UB-0247"}
        title={primaryEquipment?.name ?? "Өрмийн машин D45"}
      />
      <div className="flex flex-1 flex-col gap-3 p-3">
        <div className="relative h-[180px] overflow-hidden rounded-[10px] bg-[#c7d2d8]">
          <img
            alt={primaryEquipment?.name ?? "Өрмийн машин D45"}
            className="h-full w-full object-cover"
            src={
              primaryEquipment?.photoUrl ??
              (primaryEquipment?.id.startsWith("GEN-")
                ? "/assets/equipment-catalog/generator.png"
                : primaryEquipment?.id.startsWith("DRL-")
                  ? "/assets/equipment-catalog/diamond-drill-rig.png"
                  : equipmentPhoto)
            }
          />
          <span className="absolute bottom-3 left-3">
            <StatusPill tone="blue">ТҮРЭЭСТЭЙ</StatusPill>
          </span>
          <button
            aria-label="QR уншуулах"
            className="absolute right-3 bottom-3 flex size-10 items-center justify-center rounded-lg bg-white"
            onClick={() => onNavigate("scanner")}
            type="button"
          >
            <Icon className="size-6" src={icons.qr} />
          </button>
        </div>
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-['Roboto_Mono:Bold'] text-[15px] font-bold">
                {primaryEquipment?.meta ?? "DRL-UB-0247"}
              </p>
              <p className="mt-1 text-[9px] text-[#74838d]">
                {primaryEquipment?.model ?? "Atlas Copco D45"}
              </p>
            </div>
            <StatusPill tone={primaryEquipment?.live ? "green" : "gray"}>
              {primaryEquipment?.live ? "МЭДРЭГЧ ХОЛБОГДСОН" : "ӨГӨГДӨЛ АЛГА"}
            </StatusPill>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 border-t border-[#e4eaed] pt-3">
            {[
              ["Байршил", primaryEquipment?.location ?? "Нарны зам · Блок B"],
              ["Хариуцагч", primaryEquipment?.assignee ?? "Б. Бат"],
              ["Түрээслэгч", primaryEquipment?.tenant ?? "Хөх Тэнгэр ХХК"],
              ["Дуусах", primaryEquipment?.due ?? "10-р сарын 18"],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-[8px] text-[#82909a]">{label}</p>
                <p className="mt-1 text-[10px] font-medium">{value}</p>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <h2 className="font-['Inter:Bold'] text-[11px] font-bold">
              Мэдрэгчийн мэдээлэл
            </h2>
            <span className="text-[8px] text-[#7b8992]">
              {telemetry.length ? "ШУУД" : "ХОЛБОГДООГҮЙ"}
            </span>
          </div>
          {telemetry.length ? (
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              {telemetry.map(([value, unit]) => (
                <div className="rounded-lg bg-[#f3f7f8] p-2" key={unit}>
                  <p className="font-['Roboto_Mono:Bold'] text-[14px] font-bold text-[#1677a8]">
                    {value}
                  </p>
                  <p className="mt-1 text-[8px] text-[#71808a]">{unit}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 rounded-lg bg-[#f3f7f8] p-3 text-[10px] text-[#6c7c87]">
              Мэдрэгчийн уншилт ирээгүй байна.
            </p>
          )}
          <button
            className="mt-3 w-full rounded-lg bg-[#edf6f9] py-2 font-['Inter:Bold'] text-[9px] font-bold text-[#1677a8]"
            onClick={() => onNavigate("telemetry")}
            type="button"
          >
            Телеметрийн дэлгэрэнгүй
          </button>
        </Card>
        <Card className="p-3">
          <label
            className={`flex h-10 cursor-pointer items-center justify-center rounded-lg font-['Inter:Bold'] text-[10px] font-bold ${
              uploading
                ? "bg-[#e6ecef] text-[#71808a]"
                : "bg-[#edf6f9] text-[#1677a8]"
            }`}
          >
            {uploading
              ? "Зураг хадгалж байна..."
              : "Төхөөрөмжийн зураг оруулах"}
            <input
              accept="image/jpeg,image/png,image/webp"
              aria-label="Төхөөрөмжийн зураг сонгох"
              className="sr-only"
              disabled={uploading}
              onChange={async (event) => {
                const file = event.currentTarget.files?.[0]
                event.currentTarget.value = ""
                if (!file || !primaryEquipment) return

                setUploading(true)
                setUploadMessage("")
                try {
                  await onUploadPhoto(primaryEquipment.id, file)
                  setUploadMessage("Зураг хадгалагдлаа.")
                } catch (error) {
                  setUploadMessage(
                    error instanceof Error
                      ? error.message
                      : "Зураг хадгалж чадсангүй.",
                  )
                } finally {
                  setUploading(false)
                }
              }}
              type="file"
            />
          </label>
          {uploadMessage && (
            <p
              aria-live="polite"
              className="mt-2 text-[9px] text-[#6c7c87]"
              role="status"
            >
              {uploadMessage}
            </p>
          )}
        </Card>
        <button
          className="mt-auto h-[48px] rounded-[9px] bg-[#1677a8] font-['Inter:Bold'] text-[12px] font-bold text-white"
          onClick={() => onNavigate("calendar")}
          type="button"
        >
          Захиалгын хугацаа сонгох
        </button>
      </div>
    </MobilePage>
  )
}
