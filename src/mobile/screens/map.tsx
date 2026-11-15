import { useEffect, useMemo, useState } from "react"
import {
  api,
  type EquipmentItem,
  type EquipmentMapLocation,
  type UserRole,
} from "../../lib/api"
import {
  GoogleMapPicker,
  type EquipmentMapPin,
  type MapCoordinates,
} from "../GoogleMapPicker"
import type { Screen } from "../data"
import { Card, Header, MobilePage } from "../ui"

export function EquipmentMapScreen({
  equipment,
  onNavigate,
  role,
  sessionToken,
}: {
  equipment: EquipmentItem[]
  onNavigate: (screen: Screen) => void
  role: UserRole
  sessionToken?: string
}) {
  const [locations, setLocations] = useState<EquipmentMapLocation[]>([])
  const [selectedEquipmentId, setSelectedEquipmentId] = useState("")
  const [address, setAddress] = useState("")
  const [coordinates, setCoordinates] = useState<MapCoordinates | null>(null)
  const [message, setMessage] = useState("")
  const [isLoading, setIsLoading] = useState(Boolean(sessionToken))
  const [isWorksiteLoading, setIsWorksiteLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const canEditLocations = role === "manager" || role === "fixer"
  const isRenter = !canEditLocations

  const locationByEquipmentId = useMemo(
    () =>
      new Map(locations.map((location) => [location.equipmentId, location])),
    [locations],
  )
  const selectedEquipment = equipment.find(
    (item) => item.id === selectedEquipmentId,
  )
  const equipmentPins: EquipmentMapPin[] = locations.flatMap((location) => {
    const item = equipment.find(({ id }) => id === location.equipmentId)
    if (!item) return []
    return [
      {
        id: item.id,
        title: `${item.name} · ${location.address}`,
        coordinates: location.coordinates,
      },
    ]
  })

  useEffect(() => {
    if (!selectedEquipmentId) return
    const savedLocation = locationByEquipmentId.get(selectedEquipmentId)
    const item = equipment.find(({ id }) => id === selectedEquipmentId)
    setAddress(savedLocation?.address ?? item?.location ?? "")
    setCoordinates(savedLocation?.coordinates ?? null)
  }, [equipment, locationByEquipmentId, selectedEquipmentId])

  useEffect(() => {
    if (!sessionToken) {
      setIsLoading(false)
      return
    }

    let active = true
    api
      .getEquipmentMapLocations(sessionToken)
      .then(({ locations: savedLocations }) => {
        if (active) setLocations(savedLocations)
      })
      .catch((error: unknown) => {
        if (active) {
          setMessage(
            error instanceof Error
              ? error.message
              : "Төхөөрөмжийн байршлыг ачаалж чадсангүй.",
          )
        }
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => {
      active = false
    }
  }, [sessionToken])

  useEffect(() => {
    if (canEditLocations && !selectedEquipmentId && equipment.length) {
      setSelectedEquipmentId(equipment[0].id)
    }
  }, [canEditLocations, equipment, selectedEquipmentId])

  useEffect(() => {
    if (!sessionToken || !isRenter) {
      setIsWorksiteLoading(false)
      return
    }

    let active = true
    setIsWorksiteLoading(true)
    api
      .getWorksiteLocation(sessionToken)
      .then(({ location }) => {
        if (!active || !location) return
        setAddress(location.address)
        setCoordinates(location.coordinates)
      })
      .catch((error: unknown) => {
        if (active) {
          setMessage(
            error instanceof Error
              ? error.message
              : "Таны ажлын байршлыг ачаалж чадсангүй.",
          )
        }
      })
      .finally(() => {
        if (active) setIsWorksiteLoading(false)
      })

    return () => {
      active = false
    }
  }, [isRenter, sessionToken])

  const saveLocation = async () => {
    if (!sessionToken) return
    if (!address.trim() || !coordinates) {
      setMessage("Хаягаа сонгож, газрын зураг дээр pin-ээ тогтооно уу.")
      return
    }
    if (canEditLocations && !selectedEquipment) {
      setMessage("Байршил тохируулах төхөөрөмжөө сонгоно уу.")
      return
    }

    setIsSaving(true)
    setMessage("")
    try {
      if (isRenter) {
        const { location } = await api.saveWorksiteLocation(
          { address: address.trim(), coordinates },
          sessionToken,
        )
        setAddress(location.address)
        setCoordinates(location.coordinates)
        setMessage("Таны ажиллах газрын байршлыг бүртгэлд хадгаллаа.")
        return
      }

      if (!selectedEquipment) return
      const { location } = await api.saveEquipmentMapLocation(
        selectedEquipment.id,
        { address: address.trim(), coordinates },
        sessionToken,
      )
      setLocations((current) => [
        ...current.filter((item) => item.equipmentId !== location.equipmentId),
        location,
      ])
      setAddress(location.address)
      setCoordinates(location.coordinates)
      setMessage("Төхөөрөмжийн байршлыг хадгаллаа.")
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Төхөөрөмжийн байршлыг хадгалж чадсангүй.",
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <MobilePage current="map" onNavigate={onNavigate}>
      <Header
        subtitle={
          isRenter
            ? "Ажиллах газрын байршлаа бүртгэлдээ хадгалах"
            : "Бодит GPS pin бүртгэгдсэн төхөөрөмжүүд"
        }
        title="Газрын зураг"
      />
      <div className="flex flex-1 flex-col gap-3 p-3">
        <Card className="p-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="font-['Inter:Bold'] text-[12px] font-bold">
                {isRenter
                  ? "Таны ажиллах газрын байршил"
                  : "Тоног төхөөрөмжийн байршил"}
              </h2>
              <p className="mt-1 text-[10px] text-[#6c7c87]">
                {isRenter
                  ? "Эхлээд ажиллах газраа pin-ээр сонгож, өөрийн бүртгэлд хадгална уу."
                  : "Газрын зураг дээр бодитоор хадгалсан pin-үүд харагдана."}
              </p>
            </div>
            <span className="rounded-full bg-[#e2f1f7] px-2 py-1 text-[9px] font-bold text-[#1677a8]">
              {equipmentPins.length + Number(isRenter && Boolean(coordinates))}{" "}
              pin
            </span>
          </div>

          {isLoading && (
            <p aria-live="polite" className="mt-3 text-[10px] text-[#6c7c87]">
              Төхөөрөмжийн байршлуудыг ачаалж байна...
            </p>
          )}
          {!isLoading &&
            equipmentPins.length === 0 &&
            (!isRenter || (!isWorksiteLoading && !coordinates)) && (
              <p className="mt-3 rounded-lg bg-[#fff7e8] p-3 text-[10px] text-[#78531a]">
                {isRenter
                  ? "Таны ажиллах газрын pin хараахан хадгалагдаагүй байна. Газрын зураг дээр дарж байршлаа сонгоно уу."
                  : "Газрын зурагт харуулах бодит pin одоогоор бүртгэгдээгүй байна. Төхөөрөмж сонгоод газрын зураг дээр байршлыг нь тэмдэглэнэ үү."}
              </p>
            )}

          {canEditLocations && equipment.length > 0 && (
            <label className="mt-3 block">
              <span className="mb-1 block text-[9px] font-bold text-[#5d6e79]">
                Байршил тохируулах төхөөрөмж
              </span>
              <select
                className="w-full rounded-lg border border-[#dce4e8] bg-white p-3 text-[10px]"
                onChange={(event) => {
                  setSelectedEquipmentId(event.target.value)
                  setMessage("")
                }}
                value={selectedEquipmentId}
              >
                {equipment.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} · {item.id}
                  </option>
                ))}
              </select>
            </label>
          )}

          <div className="mt-3 space-y-2">
            <GoogleMapPicker
              address={address}
              addressLabel={
                isRenter ? "Таны ажиллах газрын хаяг" : "Төхөөрөмжийн байршил"
              }
              addressPlaceholder={
                isRenter
                  ? "Ажиллах газрын хаягийг хайх..."
                  : "Төхөөрөмжийн байршлыг хайх..."
              }
              apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? ""}
              coordinates={coordinates}
              equipmentPins={equipmentPins.filter(
                (pin) => !canEditLocations || pin.id !== selectedEquipmentId,
              )}
              helperText={
                isRenter
                  ? "Ажиллах газрын хаягаа хайж сонгох эсвэл газрын зураг дээр дарж pin тавина уу."
                  : "Төхөөрөмжийн байрлалыг хайх эсвэл газрын зураг дээр товшиж pin тавина уу."
              }
              mapLabel={
                isRenter
                  ? "Таны ажиллах газрын байршлын газрын зураг"
                  : "Тоног төхөөрөмжийн байршлын газрын зураг"
              }
              readOnly={false}
              onAddressChange={(nextAddress) => {
                setAddress(nextAddress)
                setCoordinates(null)
                setMessage("")
              }}
              onSelect={(nextCoordinates, nextAddress) => {
                setCoordinates(nextCoordinates)
                if (nextAddress) setAddress(nextAddress)
                setMessage("")
              }}
            />
            {coordinates && (selectedEquipment || isRenter) && (
              <p className="text-[10px] text-[#42515d]">
                {isRenter ? "Таны ажлын байр" : selectedEquipment?.name}:{" "}
                {coordinates.latitude.toFixed(6)},{" "}
                {coordinates.longitude.toFixed(6)}
              </p>
            )}
            <button
              className="w-full rounded-lg border border-[#1677a8] px-3 py-2 text-[11px] font-bold text-[#1677a8] disabled:opacity-50"
              disabled={
                !sessionToken ||
                (canEditLocations && !selectedEquipment) ||
                !coordinates ||
                !address.trim() ||
                isSaving
              }
              onClick={() => void saveLocation()}
              type="button"
            >
              {isSaving
                ? "Байршил хадгалж байна..."
                : isRenter
                  ? "Миний ажиллах газрын байршлыг хадгалах"
                  : "Төхөөрөмжийн байршлыг хадгалах"}
            </button>
            {message && (
              <p
                aria-live="polite"
                className={`text-[10px] ${
                  message.includes("хадгаллаа")
                    ? "text-[#19724b]"
                    : "text-[#b42318]"
                }`}
              >
                {message}
              </p>
            )}
          </div>
        </Card>
      </div>
    </MobilePage>
  )
}
