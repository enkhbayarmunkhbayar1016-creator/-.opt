import { useEffect, useState } from "react"
import MobileOpsApp from "./MobileOpsApp"
import RentalCatalogPage from "./RentalCatalogPage"
import {
  rentalCatalog,
  rentalCategories,
  rentalCategoryIcons,
  rentalCategoryImages,
} from "./rentalCatalog"

const categories = rentalCategories.map((name) => ({
  name,
  value: rentalCatalog.filter((item) => item.category === name).length,
}))

const stats = [
  { label: "Паркийн машин", value: "350+" },
  { label: "Цаг тухайд нь хүргэлт", value: "98.4%" },
  { label: "Дэмжлэгийн баг", value: "24/7" },
]

function ThemeToggle({
  isDarkMode,
  onToggle,
}: {
  isDarkMode: boolean
  onToggle: () => void
}) {
  return (
    <button
      aria-label={isDarkMode ? "Өдрийн горимд шилжих" : "Шөнийн горимд шилжих"}
      className="fixed right-4 bottom-4 z-50 flex size-12 items-center justify-center rounded-full border border-white/15 bg-[#111923] text-xl text-white shadow-[0_8px_24px_rgba(0,0,0,0.25)] transition hover:scale-105"
      onClick={onToggle}
      title={isDarkMode ? "Өдрийн горим" : "Шөнийн горим"}
      type="button"
    >
      <span aria-hidden="true">{isDarkMode ? "☀" : "☾"}</span>
    </button>
  )
}

export default function App() {
  const [catalogCategory, setCatalogCategory] = useState("Бүгд")
  const [isDarkMode, setIsDarkMode] = useState(
    () => window.localStorage.getItem("rent-theme") === "dark",
  )
  const [route, setRoute] = useState<"website" | "catalog" | "operations">(
    "website",
  )
  const [startBookingFlow, setStartBookingFlow] = useState(false)

  useEffect(() => {
    const theme = isDarkMode ? "dark" : "light"
    document.documentElement.dataset.theme = theme
    window.localStorage.setItem("rent-theme", theme)
  }, [isDarkMode])

  const toggleTheme = () => setIsDarkMode((current) => !current)
  const beginBookingFlow = () => {
    setStartBookingFlow(true)
    setRoute("operations")
  }

  if (route === "operations") {
    return (
      <div className={`app-theme ${isDarkMode ? "dark-mode" : ""}`}>
        <MobileOpsApp
          onBackToWebsite={() => {
            setStartBookingFlow(false)
            setRoute("website")
          }}
          startBookingFlow={startBookingFlow}
        />
        <ThemeToggle isDarkMode={isDarkMode} onToggle={toggleTheme} />
      </div>
    )
  }

  if (route === "catalog") {
    return (
      <RentalCatalogPage
        initialCategory={catalogCategory}
        isDarkMode={isDarkMode}
        onBackToWebsite={() => setRoute("website")}
        onLogin={() => {
          setStartBookingFlow(false)
          setRoute("operations")
        }}
        onToggleTheme={toggleTheme}
      />
    )
  }

  return (
    <div
      className={`app-theme min-h-screen bg-[#f3f1ec] text-[#101820] ${
        isDarkMode ? "dark-mode" : ""
      }`}
    >
      <header className="mx-auto max-w-7xl px-4 pt-5">
        <div className="flex items-center justify-between rounded-full bg-[#0a0d12] px-5 py-3 text-white shadow-[0_18px_40px_rgba(10,13,18,0.18)]">
          <button
            aria-label="Rent нүүр хуудас"
            className="flex items-center gap-3"
            onClick={() => setRoute("website")}
            type="button"
          >
            <div className="text-3xl font-black tracking-[-0.08em]">
              Rent
              <span className="ml-1 inline-block h-2.5 w-2.5 rounded-full bg-[#8ec5ff] align-top" />
            </div>
          </button>

          <nav className="hidden items-center gap-7 text-sm text-slate-200 md:flex">
            <a className="transition hover:text-white" href="#fleet">
              Паркууд
            </a>
            <button
              className="transition hover:text-white"
              onClick={() => {
                setCatalogCategory("Бүгд")
                setRoute("catalog")
              }}
              type="button"
            >
              Тоног төхөөрөмж
            </button>
            <a className="transition hover:text-white" href="#services">
              Үйлчилгээ
            </a>
            <a className="transition hover:text-white" href="#support">
              Дэмжлэг
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <button
              className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/10"
              onClick={() => setRoute("website")}
              type="button"
            >
              Вэбсайт
            </button>
            <button
              className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/10"
              onClick={() => {
                setStartBookingFlow(false)
                setRoute("operations")
              }}
              type="button"
            >
              Нэвтрэх
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-16 pt-6">
        <section
          id="top"
          className="relative scroll-mt-6 overflow-hidden rounded-[32px] bg-[#0a0d12] shadow-[0_30px_80px_rgba(10,13,18,0.18)]"
        >
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage:
                "url('https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1800&q=80')",
            }}
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(8,10,13,0.9),rgba(8,10,13,0.3),rgba(8,10,13,0.7))]" />

          <div className="relative grid gap-8 px-6 py-8 md:grid-cols-[1.2fr_0.8fr] md:px-10 md:py-12">
            <div className="flex flex-col justify-center">
              <div className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[10px] font-semibold tracking-[0.18em] text-white/80 uppercase backdrop-blur-sm">
                Том төслүүдэд итгэмжлэгдсэн
              </div>

              <h1 className="max-w-xl text-4xl font-black leading-[0.95] tracking-[-0.06em] text-white md:text-6xl">
                Ажлын талбарын хүн бүхэнд зориулсан техникүүд
              </h1>

              <p className="mt-5 max-w-lg text-base text-slate-200 md:text-lg">
                Ухах, өндөрт ажиллах, бетон, цахилгаан тоног төхөөрөмжийн
                түрээс. Шуурхай хүргэлт, тодорхой үнэ, мэргэжлийн дэмжлэг.
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <button
                  className="rounded-full bg-[#f5b91d] px-5 py-3 text-sm font-bold text-[#0c1117] transition hover:brightness-105"
                  onClick={beginBookingFlow}
                  type="button"
                >
                  Тоног захиалах
                </button>
                <button
                  className="rounded-full border border-white/20 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                  onClick={() => setRoute("operations")}
                  type="button"
                >
                  Захиалга харах
                </button>
              </div>
            </div>

            <div className="flex items-end justify-center md:justify-end">
              <div className="w-full max-w-md rounded-[24px] border border-white/10 bg-[#111923]/75 p-5 text-white backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.16em] text-slate-300">
                      Энэ долоо хоногт бэлэн
                    </p>
                    <p className="mt-2 text-3xl font-black tracking-[-0.06em]">
                      132
                    </p>
                  </div>
                  <div className="rounded-full bg-emerald-500/20 px-2.5 py-1 text-[10px] font-bold uppercase text-emerald-300">
                    Илгээхэд бэлэн
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  {stats.map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5"
                    >
                      <span className="text-sm text-slate-200">
                        {item.label}
                      </span>
                      <span className="text-lg font-bold text-white">
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          id="fleet"
          className="mt-10 scroll-mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]"
        >
          <div className="rounded-[28px] border border-[#dfe3db] bg-white p-5 shadow-[0_12px_28px_rgba(21,30,35,0.04)]">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                  Онцлох парк
                </p>
                <h2 className="mt-2 text-2xl font-black tracking-[-0.06em] text-[#101820]">
                  Түгээмэл түрээс
                </h2>
              </div>
              <button
                className="rounded-full bg-[#0a0d12] px-3 py-2 text-xs font-semibold text-white"
                onClick={() => {
                  setCatalogCategory("Бүгд")
                  setRoute("catalog")
                }}
                type="button"
              >
                Бүгдийг харах
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {categories.map((item) => (
                <button
                  className="group flex items-center justify-between gap-3 overflow-hidden rounded-2xl border border-[#e6e8e2] bg-[#f8f9f6] p-2 text-left transition hover:border-[#1677a8] hover:bg-[#f1f8fb]"
                  key={item.name}
                  onClick={() => {
                    setCatalogCategory(item.name)
                    setRoute("catalog")
                  }}
                  type="button"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-[#dbe7ec]">
                      <img
                        alt=""
                        className="size-full object-cover transition duration-300 group-hover:scale-110"
                        loading="lazy"
                        src={rentalCategoryImages[item.name]}
                      />
                      <span className="absolute inset-0 bg-gradient-to-t from-[#101820]/60 to-transparent" />
                      <span className="absolute right-1 bottom-1 text-sm">
                        {rentalCategoryIcons[item.name]}
                      </span>
                    </span>
                    <span className="truncate font-bold text-[#101820]">
                      {item.name}
                    </span>
                  </span>
                  <span className="shrink-0 rounded-full bg-[#e8f2ff] px-2.5 py-1 text-xs font-bold text-[#214c80]">
                    {item.value} төрөл
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] bg-[#111923] p-6 text-white shadow-[0_20px_50px_rgba(17,25,35,0.2)]">
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-300">
              Шуурхай машин хэрэгтэй юу?
            </p>
            <h3 className="mt-3 text-3xl font-black tracking-[-0.06em] text-white">
              3 алхмаар түрээсийн дэмжлэг аваарай.
            </h3>
            <div className="mt-6 space-y-4">
              {[
                ["01", "Ажил, байршлаа бидэнд хэлнэ үү"],
                ["02", "Зөв тоног төхөөрөмжийг сонгоно"],
                ["03", "Бид талбайд хүргэж, дэмжлэг үзүүлнэ"],
              ].map(([step, text]) =>
                step === "01" ? (
                  <button
                    className="flex w-full gap-4 rounded-2xl border border-white/10 bg-white/5 p-3 text-left transition hover:bg-white/10"
                    key={step}
                    onClick={beginBookingFlow}
                    type="button"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f5b91d] text-sm font-black text-[#101820]">
                      {step}
                    </span>
                    <p className="flex items-center text-sm text-slate-100">
                      {text}
                    </p>
                  </button>
                ) : (
                  <div
                    key={step}
                    className="flex gap-4 rounded-2xl border border-white/10 bg-white/5 p-3"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f5b91d] text-sm font-black text-[#101820]">
                      {step}
                    </span>
                    <p className="flex items-center text-sm text-slate-100">
                      {text}
                    </p>
                  </div>
                ),
              )}
            </div>
            <button
              className="mt-6 w-full rounded-full bg-[#f5b91d] px-4 py-3 text-sm font-bold text-[#101820]"
              onClick={() => {
                setCatalogCategory("Бүгд")
                beginBookingFlow()
              }}
              type="button"
            >
              Үнийн санал авах
            </button>
          </div>
        </section>

        <section
          id="services"
          className="mt-12 scroll-mt-6 rounded-[32px] bg-[#0a0d12] p-6 text-white shadow-[0_18px_40px_rgba(10,13,18,0.15)] md:p-8"
        >
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-300">
                Яагаад бид
              </p>
              <h3 className="mt-2 text-3xl font-black tracking-[-0.06em] text-white">
                Тайлбарлагдсан, найдвартай ажлын талбайн шийдэл.
              </h3>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-2 text-sm text-slate-200">
              <span className="inline-block h-2 w-2 rounded-full bg-[#8ec5ff]" />
              Бүх нутагт бэлэн
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              [
                "Өдөр тутмын хүргэлт",
                "Төлөвлөгөө өөрчлөгдсөн ч хурдан тоног төхөөрөмжийг шилжүүлнэ.",
              ],
              [
                "Засвар үйлчилгээ багтсан",
                "Бүх нэгжийг шалгаж, засварлаж, ажилд бэлэн болгосон.",
              ],
              [
                "Тохируулсан нөхцөл",
                "Өдөр, долоо хоног, урт хугацааны түрээсийн тодорхой үнийн санал.",
              ],
            ].map(([title, text]) => (
              <div
                key={title}
                className="rounded-[22px] border border-white/10 bg-white/5 p-4"
              >
                <p className="text-[11px] uppercase tracking-[0.16em] text-slate-300">
                  {title}
                </p>
                <p className="mt-3 text-base text-slate-100">{text}</p>
              </div>
            ))}
          </div>
          <div
            id="support"
            className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6"
          >
            <p className="text-sm text-slate-200">
              Түрээсийн тусламж эсвэл үнийн санал хэрэгтэй юу?
            </p>
            <button
              className="rounded-full bg-[#f5b91d] px-5 py-3 text-sm font-bold text-[#101820]"
              onClick={() => setRoute("operations")}
              type="button"
            >
              Дэмжлэг авах
            </button>
          </div>
        </section>
      </main>
      <ThemeToggle isDarkMode={isDarkMode} onToggle={toggleTheme} />
    </div>
  )
}
