import { useEffect, useMemo, useState } from "react"
import type { Screen } from "../data"
import { api, type BookingInput } from "../../lib/api"
import { GoogleMapPicker, type MapCoordinates } from "../GoogleMapPicker"
import { Card, Header, MobilePage, StatusPill } from "../ui"

const years = Array.from({ length: 10 }, (_, index) => 2026 + index)
const firstYear = 2026
const lastYear = 2035
const months = [
  "1-р сар",
  "2-р сар",
  "3-р сар",
  "4-р сар",
  "5-р сар",
  "6-р сар",
  "7-р сар",
  "8-р сар",
  "9-р сар",
  "10-р сар",
  "11-р сар",
  "12-р сар",
]
const weekdays = ["НЯМ", "ДАВ", "МЯГ", "ЛХА", "ПҮР", "БАА", "БЯМ"]
const timeOptions = Array.from({ length: 48 }, (_, index) => {
  const hour = String(Math.floor(index / 2)).padStart(2, "0")
  const minute = index % 2 === 0 ? "00" : "30"
  return `${hour}:${minute}`
})

const formatDate = (date: Date) =>
  `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`

const formatInputDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`

export function CalendarScreen({
  onNavigate,
  onCreateBooking,
  equipmentId,
  sessionToken,
}: {
  onNavigate: (screen: Screen) => void
  onCreateBooking?: (booking: BookingInput) => Promise<void>
  equipmentId?: string
  sessionToken?: string
}) {
  const [selectedYear, setSelectedYear] = useState(2026)
  const [selectedMonth, setSelectedMonth] = useState(9)
  const [selectedDay, setSelectedDay] = useState(9)
  const [startTime, setStartTime] = useState("08:00")
  const [endTime, setEndTime] = useState("18:00")
  const [rentalDays, setRentalDays] = useState(1)
  const [worksiteAddress, setWorksiteAddress] = useState("")
  const [worksiteCoordinates, setWorksiteCoordinates] =
    useState<MapCoordinates | null>(null)
  const [submitError, setSubmitError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [locationMessage, setLocationMessage] = useState("")
  const [isSavingLocation, setIsSavingLocation] = useState(false)

  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate()
  const firstWeekday = new Date(selectedYear, selectedMonth, 1).getDay()
  const selectedDate = new Date(selectedYear, selectedMonth, selectedDay)
  const endDate = new Date(selectedDate)
  endDate.setDate(endDate.getDate() + rentalDays)
  const calendarDays = useMemo(
    () => Array.from({ length: daysInMonth }, (_, index) => index + 1),
    [daysInMonth],
  )

  useEffect(() => {
    setLocationMessage("")
    if (!sessionToken) {
      setWorksiteAddress("")
      setWorksiteCoordinates(null)
      return
    }

    let active = true
    api
      .getWorksiteLocation(sessionToken)
      .then(({ location }) => {
        if (!active || !location) return
        setWorksiteAddress(location.address)
        setWorksiteCoordinates(location.coordinates)
      })
      .catch(() => {
        if (active) {
          setLocationMessage("Өмнө хадгалсан ажлын байршлыг ачаалж чадсангүй.")
        }
      })

    return () => {
      active = false
    }
  }, [sessionToken])

  const changeMonth = (offset: number) => {
    const date = new Date(selectedYear, selectedMonth + offset, 1)
    if (date.getFullYear() < firstYear || date.getFullYear() > lastYear) {
      return
    }

    setSelectedYear(date.getFullYear())
    setSelectedMonth(date.getMonth())
    setSelectedDay((day) =>
      Math.min(
        day,
        new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate(),
      ),
    )
  }

  const changeYear = (year: number) => {
    setSelectedYear(year)
    setSelectedDay((day) =>
      Math.min(day, new Date(year, selectedMonth + 1, 0).getDate()),
    )
  }

  const changeSelectedMonth = (month: number) => {
    setSelectedMonth(month)
    setSelectedDay((day) =>
      Math.min(day, new Date(selectedYear, month + 1, 0).getDate()),
    )
  }

  const handleSaveLocation = async () => {
    if (!sessionToken) {
      setLocationMessage(
        "Байршлаа хадгалахын тулд нэвтэрч эсвэл бүртгүүлнэ үү.",
      )
      return
    }
    if (!worksiteAddress.trim() || !worksiteCoordinates) {
      setLocationMessage(
        "Хаягаа сонгож, газрын зураг дээр pin-ээ тогтооно уу.",
      )
      return
    }

    setIsSavingLocation(true)
    setLocationMessage("")
    try {
      const { location } = await api.saveWorksiteLocation(
        {
          address: worksiteAddress.trim(),
          coordinates: worksiteCoordinates,
        },
        sessionToken,
      )
      setWorksiteAddress(location.address)
      setWorksiteCoordinates(location.coordinates)
      setLocationMessage("Ажлын байршлыг таны бүртгэлд хадгаллаа.")
    } catch (error) {
      setLocationMessage(
        error instanceof Error ? error.message : "Байршлыг хадгалж чадсангүй.",
      )
    } finally {
      setIsSavingLocation(false)
    }
  }

  const handleBookingSubmit = async () => {
    if (!onCreateBooking) {
      setSubmitError("Захиалга илгээхийн тулд эхлээд нэвтэрнэ үү.")
      return
    }
    if (!equipmentId) {
      setSubmitError("Захиалах төхөөрөмжөө эхлээд сонгоно уу.")
      return
    }
    if (!worksiteAddress.trim()) {
      setSubmitError("Ажлын газрын хаягаа оруулна уу.")
      return
    }
    if (!worksiteCoordinates) {
      setSubmitError("Газрын зураг дээр pin-ээр ажлын байршлаа сонгоно уу.")
      return
    }

    setIsSubmitting(true)
    setSubmitError("")
    const payload: BookingInput = {
      equipmentId,
      startDate: formatInputDate(selectedDate),
      endDate: formatInputDate(endDate),
      startTime,
      endTime,
      rentalDays,
      worksiteAddress: worksiteAddress.trim(),
      coordinates: worksiteCoordinates,
      notes: "",
    }

    try {
      await onCreateBooking(payload)
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Захиалга хадгалж чадсангүй.",
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <MobilePage current="calendar" onNavigate={onNavigate}>
      <Header
        onBack={() => onNavigate("detail")}
        subtitle="DRL-UB-0247 · Өрмийн машин"
        title="Захиалгын хуанли"
      />
      <div className="flex flex-1 flex-col gap-3 p-3">
        <Card className="p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              aria-label="Өмнөх сар"
              className="rounded bg-[#f0f4f6] px-2 py-1"
              disabled={selectedYear === firstYear && selectedMonth === 0}
              onClick={() => changeMonth(-1)}
              type="button"
            >
              ‹
            </button>
            <div className="flex items-center gap-2">
              <label className="sr-only" htmlFor="booking-year">
                Он сонгох
              </label>
              <select
                className="rounded-lg border border-[#dce4e8] bg-white px-2 py-1 text-[11px] font-bold"
                id="booking-year"
                onChange={(event) => changeYear(Number(event.target.value))}
                value={selectedYear}
              >
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year} он
                  </option>
                ))}
              </select>
              <label className="sr-only" htmlFor="booking-month">
                Сар сонгох
              </label>
              <select
                className="rounded-lg border border-[#dce4e8] bg-white px-2 py-1 text-[11px] font-bold"
                id="booking-month"
                onChange={(event) =>
                  changeSelectedMonth(Number(event.target.value))
                }
                value={selectedMonth}
              >
                {months.map((month, index) => (
                  <option key={month} value={index}>
                    {month}
                  </option>
                ))}
              </select>
            </div>
            <button
              aria-label="Дараагийн сар"
              className="rounded bg-[#f0f4f6] px-2 py-1"
              disabled={selectedYear === lastYear && selectedMonth === 11}
              onClick={() => changeMonth(1)}
              type="button"
            >
              ›
            </button>
          </div>
          <div className="mt-3 grid grid-cols-7 gap-1">
            {weekdays.map((weekday) => (
              <span
                className="py-1 text-center text-[7px] text-[#7c8992]"
                key={weekday}
              >
                {weekday}
              </span>
            ))}
            {Array.from({ length: firstWeekday }, (_, index) => (
              <span aria-hidden="true" key={`empty-${index}`} />
            ))}
            {calendarDays.map((day) => {
              const isSelected = selectedDay === day

              return (
                <button
                  aria-pressed={isSelected}
                  className={`rounded-lg py-2 text-center ${
                    isSelected
                      ? "bg-[#1677a8] text-white"
                      : "bg-[#f4f7f8] text-[#14212a]"
                  }`}
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  type="button"
                >
                  <span className="sr-only">
                    {
                      weekdays[
                        new Date(selectedYear, selectedMonth, day).getDay()
                      ]
                    }
                  </span>
                  <span className="block font-['Roboto_Mono:Bold'] text-[11px] font-bold">
                    {String(day).padStart(2, "0")}
                  </span>
                </button>
              )
            })}
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-['Inter:Bold'] text-[11px] font-bold">
              Сонгосон хугацаа
            </h2>
            <label className="flex items-center gap-2 text-[9px] text-[#5d6e79]">
              Түрээслэх хоног
              <select
                aria-label="Түрээслэх хоног"
                className="rounded-lg border border-[#dce4e8] bg-white px-2 py-1 font-bold"
                onChange={(event) => setRentalDays(Number(event.target.value))}
                value={rentalDays}
              >
                {[1, 2, 3, 7, 14, 30].map((days) => (
                  <option key={days} value={days}>
                    {days} өдөр
                  </option>
                ))}
              </select>
            </label>
            <StatusPill tone="green">{rentalDays} өдөр</StatusPill>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="rounded-lg bg-[#f3f7f8] p-3">
              <span className="block text-[8px] text-[#7c8992]">ЭХЛЭХ</span>
              <span className="mt-1 flex flex-wrap items-center justify-between gap-2">
                <span className="font-['Roboto_Mono:Bold'] text-[12px] font-bold">
                  {formatDate(selectedDate)}
                </span>
                <select
                  aria-label="Эхлэх цаг"
                  className="rounded border border-[#dce4e8] bg-white px-2 py-1 text-[10px]"
                  onChange={(event) => setStartTime(event.target.value)}
                  value={startTime}
                >
                  {timeOptions.map((time) => (
                    <option key={time} value={time}>
                      {time}
                    </option>
                  ))}
                </select>
              </span>
            </label>
            <label className="rounded-lg bg-[#f3f7f8] p-3 text-right">
              <span className="block text-[8px] text-[#7c8992]">ДУУСАХ</span>
              <span className="mt-1 flex flex-wrap items-center justify-end gap-2">
                <span className="font-['Roboto_Mono:Bold'] text-[12px] font-bold">
                  {formatDate(endDate)}
                </span>
                <select
                  aria-label="Дуусах цаг"
                  className="rounded border border-[#dce4e8] bg-white px-2 py-1 text-[10px]"
                  onChange={(event) => setEndTime(event.target.value)}
                  value={endTime}
                >
                  {timeOptions.map((time) => (
                    <option key={time} value={time}>
                      {time}
                    </option>
                  ))}
                </select>
              </span>
            </label>
          </div>
        </Card>
        <Card className="p-3">
          <h2 className="font-['Inter:Bold'] text-[11px] font-bold">
            Захиалгын мэдээлэл
          </h2>
          <div className="mt-3 space-y-2">
            <GoogleMapPicker
              address={worksiteAddress}
              apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? ""}
              coordinates={worksiteCoordinates}
              onAddressChange={(address) => {
                setWorksiteAddress(address)
                setWorksiteCoordinates(null)
              }}
              onSelect={(coordinates, address) => {
                setWorksiteCoordinates(coordinates)
                if (address) setWorksiteAddress(address)
              }}
            />
            {worksiteCoordinates && (
              <p className="text-[9px] text-[#42515d]">
                Pin сонгосон: {worksiteCoordinates.latitude.toFixed(6)},{" "}
                {worksiteCoordinates.longitude.toFixed(6)}
              </p>
            )}
            {worksiteCoordinates && (
              <a
                className="inline-block text-[9px] font-bold text-[#1677a8] underline"
                href={`https://maps.google.com/?q=${worksiteCoordinates.latitude},${worksiteCoordinates.longitude}`}
                rel="noreferrer"
                target="_blank"
              >
                Сонгосон pin-ийг Google Maps дээр нээх
              </a>
            )}
            {sessionToken && (
              <button
                className="w-full rounded-lg border border-[#1677a8] px-3 py-2 text-[10px] font-bold text-[#1677a8] disabled:opacity-50"
                disabled={isSavingLocation || !worksiteCoordinates}
                onClick={() => void handleSaveLocation()}
                type="button"
              >
                {isSavingLocation
                  ? "Байршил хадгалж байна..."
                  : "Ажлын байршлыг хадгалах"}
              </button>
            )}
            {locationMessage && (
              <p
                aria-live="polite"
                className={`text-[9px] ${
                  locationMessage.includes("хадгаллаа")
                    ? "text-[#19724b]"
                    : "text-[#b42318]"
                }`}
              >
                {locationMessage}
              </p>
            )}
          </div>
        </Card>
        {submitError && (
          <p aria-live="polite" className="text-[10px] text-[#b42318]">
            {submitError}
          </p>
        )}
        <button
          className="mt-auto h-[48px] rounded-[9px] bg-[#1677a8] font-['Inter:Bold'] text-[12px] font-bold text-white"
          disabled={isSubmitting}
          onClick={() => void handleBookingSubmit()}
          type="button"
        >
          {isSubmitting ? "Захиалга хадгалж байна..." : "Захиалга илгээх"}
        </button>
      </div>
    </MobilePage>
  )
}
