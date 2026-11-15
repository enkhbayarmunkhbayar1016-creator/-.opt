import { act, cleanup, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import {
  type EquipmentMapPin,
  GoogleMapPicker,
  type MapCoordinates,
} from "../src/mobile/GoogleMapPicker"

type MockLocation = {
  lat: () => number
  lng: () => number
}
interface MockPoint {
  lat: number
  lng: number
}
interface MockMapClick {
  latLng?: MockLocation
}
interface MockMarkerOptions {
  map: MockMap
  position: MockPoint
  title?: string
}
interface MockAutocompleteOptions {
  fields: string[]
  types: string[]
}
let mapClickHandler: ((event: MockMapClick) => void) | undefined
let autocompleteHandler: (() => void) | undefined
let createdMarkers: MockMarkerOptions[] = []
let geocoderStatus = "OK"
let selectedPlace = {
  formatted_address: "Autocomplete address",
  geometry: {
    location: {
      lat: () => 47.91,
      lng: () => 106.91,
    },
  },
}

class MockMap {
  constructor(
    _element: HTMLElement,
    _options: {
      center: MockPoint
      zoom: number
      mapTypeControl: boolean
    },
  ) {}

  addListener(_eventName: "click", handler: (event: MockMapClick) => void) {
    mapClickHandler = handler
  }

  setCenter(_center: MockPoint) {}
  setZoom(_zoom: number) {}
}

class MockMarker {
  constructor(_options: MockMarkerOptions) {
    createdMarkers.push(_options)
  }

  setPosition(_position: MockPoint) {}
  setMap(_map: MockMap | null) {}
}

class MockGeocoder {
  geocode(
    _request: { location: MockPoint },
    callback: (
      results: { formatted_address: string }[] | null,
      status: string,
    ) => void,
  ) {
    callback(
      geocoderStatus === "OK"
        ? [{ formatted_address: "Reverse geocoded address" }]
        : null,
      geocoderStatus,
    )
  }
}

class MockAutocomplete {
  constructor(_input: HTMLInputElement, _options: MockAutocompleteOptions) {}

  addListener(_eventName: "place_changed", handler: () => void) {
    autocompleteHandler = handler
  }

  getPlace() {
    return selectedPlace
  }
}

const maps = {
  Map: MockMap,
  Marker: MockMarker,
  Geocoder: MockGeocoder,
  places: { Autocomplete: MockAutocomplete },
}

afterEach(() => {
  cleanup()
  delete window.google
  mapClickHandler = undefined
  autocompleteHandler = undefined
  createdMarkers = []
  geocoderStatus = "OK"
  selectedPlace = {
    formatted_address: "Autocomplete address",
    geometry: {
      location: {
        lat: () => 47.91,
        lng: () => 106.91,
      },
    },
  }
  vi.restoreAllMocks()
})

describe("GoogleMapPicker", () => {
  it("saves selected map pins and Google address suggestions as coordinates", async () => {
    window.google = { maps }
    const onSelect = vi.fn(
      (_coordinates: MapCoordinates, _address?: string) => {},
    )
    render(
      <GoogleMapPicker
        address=""
        apiKey="test-browser-key"
        coordinates={null}
        onAddressChange={() => {}}
        onSelect={onSelect}
      />,
    )

    await waitFor(() => {
      expect(mapClickHandler).toBeTypeOf("function")
      expect(autocompleteHandler).toBeTypeOf("function")
    })

    act(() => {
      mapClickHandler?.({
        latLng: {
          lat: () => 47.92,
          lng: () => 106.92,
        },
      })
    })
    expect(onSelect).toHaveBeenLastCalledWith(
      { latitude: 47.92, longitude: 106.92 },
      "Reverse geocoded address",
    )

    selectedPlace = {
      formatted_address: "Selected place",
      geometry: {
        location: {
          lat: () => 47.93,
          lng: () => 106.93,
        },
      },
    }
    act(() => autocompleteHandler?.())
    expect(onSelect).toHaveBeenLastCalledWith(
      { latitude: 47.93, longitude: 106.93 },
      "Selected place",
    )
    expect(
      screen.getByRole("application", {
        name: "Ажлын байршил сонгох газрын зураг",
      }),
    ).toBeInTheDocument()
  })

  it("provides a coordinate address when reverse geocoding fails", async () => {
    window.google = { maps }
    geocoderStatus = "ERROR"
    const onSelect = vi.fn(
      (_coordinates: MapCoordinates, _address?: string) => {},
    )
    render(
      <GoogleMapPicker
        address=""
        apiKey="test-browser-key"
        coordinates={null}
        onAddressChange={() => {}}
        onSelect={onSelect}
      />,
    )

    await waitFor(() => {
      expect(mapClickHandler).toBeTypeOf("function")
    })

    act(() => {
      mapClickHandler?.({
        latLng: {
          lat: () => 47.92,
          lng: () => 106.92,
        },
      })
    })

    expect(onSelect).toHaveBeenLastCalledWith(
      { latitude: 47.92, longitude: 106.92 },
      "Сонгосон байршил (47.920000, 106.920000)",
    )
  })

  it("renders a marker for each equipment location", async () => {
    window.google = { maps }
    const equipmentPins: EquipmentMapPin[] = [
      {
        id: "GEN-0162",
        title: "Генератор 150 кВА · Зүүн талбай",
        coordinates: { latitude: 47.92, longitude: 106.92 },
      },
    ]
    render(
      <GoogleMapPicker
        address=""
        apiKey="test-browser-key"
        coordinates={null}
        equipmentPins={equipmentPins}
        onAddressChange={() => {}}
        onSelect={() => {}}
      />,
    )

    await waitFor(() =>
      expect(createdMarkers).toContainEqual({
        map: expect.any(MockMap),
        position: { lat: 47.92, lng: 106.92 },
        title: "Генератор 150 кВА · Зүүн талбай",
      }),
    )
  })
})
