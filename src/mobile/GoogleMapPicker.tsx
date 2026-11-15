import { useEffect, useRef, useState } from "react"

export type MapCoordinates = {
  latitude: number
  longitude: number
}

type GooglePoint = {
  lat: number
  lng: number
}

const coordinateAddress = ({ lat, lng }: GooglePoint) =>
  `Сонгосон байршил (${lat.toFixed(6)}, ${lng.toFixed(6)})`

type GoogleLocation = {
  lat: () => number
  lng: () => number
}

type GoogleAddressAutocompleteOptions = {
  fields: string[]
  types: string[]
}

type GoogleMap = {
  addListener: (
    eventName: "click",
    handler: (event: { latLng?: GoogleLocation }) => void,
  ) => void
  setCenter: (center: GooglePoint) => void
  setZoom: (zoom: number) => void
}

type GooglePlace = {
  formatted_address?: string
  geometry?: {
    location?: GoogleLocation
  }
}

export type EquipmentMapPin = {
  id: string
  title: string
  coordinates: MapCoordinates
}

type GoogleMapsApi = {
  Map: new (
    element: HTMLElement,
    options: {
      center: GooglePoint
      zoom: number
      mapTypeControl: boolean
    },
  ) => GoogleMap
  Marker: new (options: {
    map: GoogleMap
    position: GooglePoint
    title?: string
  }) => {
    setPosition: (position: GooglePoint) => void
    setMap: (map: GoogleMap | null) => void
  }
  Geocoder: new () => {
    geocode: (
      request: { location: GooglePoint },
      callback: (
        results: { formatted_address: string }[] | null,
        status: string,
      ) => void,
    ) => void
  }
  places?: {
    Autocomplete: new (
      input: HTMLInputElement,
      options: GoogleAddressAutocompleteOptions,
    ) => {
      addListener: (eventName: "place_changed", handler: () => void) => void
      getPlace: () => GooglePlace
    }
  }
}

declare global {
  interface Window {
    google?: { maps: GoogleMapsApi }
    initRentalGoogleMap?: () => void
  }
}

let mapsPromise: Promise<GoogleMapsApi> | undefined

const loadGoogleMaps = (apiKey: string) => {
  if (window.google?.maps) return Promise.resolve(window.google.maps)
  if (mapsPromise) return mapsPromise

  mapsPromise = new Promise<GoogleMapsApi>((resolve, reject) => {
    const callbackName = "initRentalGoogleMap"
    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[data-rental-google-maps="true"]',
    )
    const script = existingScript ?? document.createElement("script")

    if (
      existingScript &&
      new URL(existingScript.src).searchParams.get("key") !== apiKey
    ) {
      reject(new Error("Google Maps өөр API түлхүүрээр ачаалагдсан байна."))
      return
    }

    window[callbackName] = () => {
      if (window.google?.maps) resolve(window.google.maps)
      else reject(new Error("Google Maps API ачаалсангүй."))
      delete window[callbackName]
    }

    if (!existingScript) {
      script.dataset.rentalGoogleMaps = "true"
      script.async = true
      script.defer = true
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&callback=${callbackName}&libraries=places&v=weekly`
      script.onerror = () => {
        delete window[callbackName]
        reject(
          new Error("Google Maps API ачаалсангүй. API түлхүүрээ шалгана уу."),
        )
      }
      document.head.append(script)
    }
  }).catch((error: unknown) => {
    mapsPromise = undefined
    throw error
  })

  return mapsPromise
}

export function GoogleMapPicker({
  apiKey,
  address,
  coordinates,
  equipmentPins = [],
  readOnly = false,
  addressLabel = "Ажлын газрын хаяг",
  addressPlaceholder = "Ажлын газрын хаяг хайх...",
  mapLabel = "Ажлын байршил сонгох газрын зураг",
  helperText = "Хаяг хайж сонгох эсвэл газрын зураг дээр товшиж pin тавина уу.",
  onAddressChange,
  onSelect,
}: {
  apiKey: string
  address: string
  coordinates: MapCoordinates | null
  equipmentPins?: EquipmentMapPin[]
  readOnly?: boolean
  addressLabel?: string
  addressPlaceholder?: string
  mapLabel?: string
  helperText?: string
  onAddressChange: (address: string) => void
  onSelect: (coordinates: MapCoordinates, address?: string) => void
}) {
  const mapElement = useRef<HTMLDivElement>(null)
  const addressInput = useRef<HTMLInputElement>(null)
  const mapRef = useRef<GoogleMap | null>(null)
  const marker = useRef<InstanceType<GoogleMapsApi["Marker"]> | null>(null)
  const equipmentPinsRef = useRef(equipmentPins)
  const equipmentMarkers = useRef(
    new Map<string, InstanceType<GoogleMapsApi["Marker"]>>(),
  )
  const [mapError, setMapError] = useState("")

  useEffect(() => {
    equipmentPinsRef.current = equipmentPins
  }, [equipmentPins])

  const updateEquipmentMarkers = (maps: GoogleMapsApi, map: GoogleMap) => {
    equipmentMarkers.current.forEach((equipmentMarker) =>
      equipmentMarker.setMap(null),
    )
    equipmentMarkers.current.clear()
    for (const pin of equipmentPinsRef.current) {
      equipmentMarkers.current.set(
        pin.id,
        new maps.Marker({
          map,
          position: {
            lat: pin.coordinates.latitude,
            lng: pin.coordinates.longitude,
          },
          title: pin.title,
        }),
      )
    }
  }

  useEffect(() => {
    if (!apiKey || !mapElement.current) return

    let active = true
    let map: GoogleMap | undefined
    let geocoder: InstanceType<GoogleMapsApi["Geocoder"]> | undefined

    loadGoogleMaps(apiKey)
      .then((maps) => {
        if (!active || !mapElement.current) return

        const center = coordinates
          ? { lat: coordinates.latitude, lng: coordinates.longitude }
          : equipmentPinsRef.current[0]
            ? {
                lat: equipmentPinsRef.current[0].coordinates.latitude,
                lng: equipmentPinsRef.current[0].coordinates.longitude,
              }
            : { lat: 47.9184, lng: 106.9177 }
        map = new maps.Map(mapElement.current, {
          center,
          zoom: coordinates ? 15 : equipmentPinsRef.current.length ? 11 : 12,
          mapTypeControl: false,
        })
        mapRef.current = map
        updateEquipmentMarkers(maps, map)
        geocoder = new maps.Geocoder()
        if (!readOnly && addressInput.current && maps.places?.Autocomplete) {
          const autocomplete = new maps.places.Autocomplete(
            addressInput.current,
            {
              fields: ["formatted_address", "geometry"],
              types: ["geocode"],
            },
          )
          autocomplete.addListener("place_changed", () => {
            const place = autocomplete.getPlace()
            const location = place.geometry?.location
            if (!location) return
            const nextCoordinates = {
              latitude: location.lat(),
              longitude: location.lng(),
            }
            map?.setCenter({
              lat: nextCoordinates.latitude,
              lng: nextCoordinates.longitude,
            })
            map?.setZoom(16)
            if (marker.current) {
              marker.current.setPosition({
                lat: nextCoordinates.latitude,
                lng: nextCoordinates.longitude,
              })
            } else if (map) {
              marker.current = new maps.Marker({
                map,
                position: {
                  lat: nextCoordinates.latitude,
                  lng: nextCoordinates.longitude,
                },
              })
            }
            onSelect(
              nextCoordinates,
              place.formatted_address ||
                coordinateAddress({
                  lat: nextCoordinates.latitude,
                  lng: nextCoordinates.longitude,
                }),
            )
          })
        }
        if (coordinates) {
          marker.current = new maps.Marker({ map, position: center })
        }

        if (!readOnly) {
          map.addListener("click", (event) => {
            const point = event.latLng
            if (!point) return
            const selected = { lat: point.lat(), lng: point.lng() }
            if (marker.current) marker.current.setPosition(selected)
            else
              marker.current = new maps.Marker({
                map: map!,
                position: selected,
              })

            const nextCoordinates = {
              latitude: selected.lat,
              longitude: selected.lng,
            }
            onSelect(nextCoordinates, coordinateAddress(selected))
            geocoder?.geocode({ location: selected }, (results, status) => {
              if (status === "OK" && results?.[0]) {
                onSelect(nextCoordinates, results[0].formatted_address)
              }
            })
          })
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setMapError(
            error instanceof Error
              ? error.message
              : "Газрын зураг ачаалсангүй.",
          )
        }
      })

    return () => {
      active = false
    }
  }, [apiKey])

  useEffect(() => {
    const map = mapRef.current
    const maps = window.google?.maps
    if (map && maps) updateEquipmentMarkers(maps, map)
  }, [equipmentPins])

  useEffect(() => {
    if (!coordinates) {
      marker.current?.setMap(null)
      marker.current = null
      return
    }
    const center = { lat: coordinates.latitude, lng: coordinates.longitude }
    mapRef.current?.setCenter(center)
    mapRef.current?.setZoom(16)
    if (marker.current) {
      marker.current.setPosition(center)
    } else if (mapRef.current) {
      const maps = window.google?.maps
      if (!maps) return
      marker.current = new maps.Marker({
        map: mapRef.current,
        position: center,
      })
    }
  }, [coordinates])

  return (
    <div>
      <div className="space-y-2">
        {!readOnly && (
          <label className="block">
            <span className="sr-only">{addressLabel}</span>
            <input
              autoComplete="off"
              className="w-full rounded-lg border border-[#dce4e8] bg-transparent p-3 text-[10px] outline-none focus:border-[#1677a8]"
              onChange={(event) => onAddressChange(event.target.value)}
              placeholder={addressPlaceholder}
              ref={addressInput}
              value={address}
            />
          </label>
        )}
        {apiKey ? (
          <div
            aria-label={mapLabel}
            className="h-52 w-full overflow-hidden rounded-lg border border-[#dce4e8] bg-[#edf2f4]"
            ref={mapElement}
            role="application"
          />
        ) : (
          <div className="flex h-44 items-center justify-center rounded-lg border border-dashed border-[#dce4e8] bg-[#f3f7f8] p-4 text-center text-[10px] text-[#71808a]">
            Google Maps-ийн интерактив pin ашиглахын тулд
            VITE_GOOGLE_MAPS_API_KEY тохируулна уу.
          </div>
        )}
      </div>
      {mapError && (
        <p aria-live="polite" className="mt-2 text-[9px] text-[#b42318]">
          {mapError}
        </p>
      )}
      {apiKey && !readOnly && (
        <p className="mt-2 text-[9px] text-[#71808a]">{helperText}</p>
      )}
    </div>
  )
}
