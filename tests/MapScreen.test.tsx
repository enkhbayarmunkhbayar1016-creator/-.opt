import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"
import {
  api,
  type Coordinates,
  type EquipmentItem,
  type EquipmentMapLocation,
} from "../src/lib/api"
import { EquipmentMapScreen } from "../src/mobile/screens/map"

interface MockEquipmentPin {
  id: string
  title: string
  coordinates: Coordinates
}

vi.mock("../src/mobile/GoogleMapPicker", () => ({
  GoogleMapPicker: ({
    coordinates,
    equipmentPins,
    onSelect,
  }: {
    coordinates: Coordinates | null
    equipmentPins: MockEquipmentPin[]
    onSelect: (coordinates: Coordinates, address?: string) => void
  }) => (
    <div>
      <p>{equipmentPins.length + Number(Boolean(coordinates))} map markers</p>
      <button
        onClick={() =>
          onSelect(
            { latitude: 47.9184, longitude: 106.9177 },
            "Сүхбаатарын талбай",
          )
        }
        type="button"
      >
        Газрын зураг дээр pin сонгох
      </button>
    </div>
  ),
}))

const equipment: EquipmentItem[] = [
  {
    id: "GEN-0162",
    name: "Генератор 150 кВА",
    category: "Үүсгүүр",
    model: "Cummins 150 kVA",
    status: "Бэлэн",
    meta: "GEN-0162",
    location: "Зүүн талбай",
    assignee: "",
    tenant: "",
    due: "",
    telemetry: { vibration: null, temperature: null, rpm: null },
    live: false,
  },
]

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe("EquipmentMapScreen", () => {
  it("shows saved equipment markers and lets staff save a newly selected pin", async () => {
    const user = userEvent.setup()
    const location: EquipmentMapLocation = {
      equipmentId: "GEN-0162",
      address: "Сүхбаатарын талбай",
      coordinates: { latitude: 47.9184, longitude: 106.9177 },
    }
    const loadLocations = vi
      .spyOn(api, "getEquipmentMapLocations")
      .mockResolvedValue({ locations: [] })
    const saveLocation = vi
      .spyOn(api, "saveEquipmentMapLocation")
      .mockResolvedValue({ location })

    render(
      <EquipmentMapScreen
        equipment={equipment}
        onNavigate={() => {}}
        role="manager"
        sessionToken="customer-token"
      />,
    )

    expect(await screen.findByText("0 map markers")).toBeInTheDocument()
    expect(loadLocations).toHaveBeenCalledWith("customer-token")
    await user.click(
      screen.getByRole("button", { name: "Газрын зураг дээр pin сонгох" }),
    )

    await user.click(
      screen.getByRole("button", { name: "Төхөөрөмжийн байршлыг хадгалах" }),
    )
    await waitFor(() =>
      expect(saveLocation).toHaveBeenCalledWith(
        "GEN-0162",
        {
          address: location.address,
          coordinates: location.coordinates,
        },
        "customer-token",
      ),
    )
    expect(await screen.findByText("1 map markers")).toBeInTheDocument()
    expect(
      screen.getByText("Төхөөрөмжийн байршлыг хадгаллаа."),
    ).toBeInTheDocument()
  })

  it("lets renters save their worksite pin to their own account", async () => {
    const user = userEvent.setup()
    const location = {
      address: "Сүхбаатарын талбай",
      coordinates: { latitude: 47.9184, longitude: 106.9177 },
    }
    vi.spyOn(api, "getEquipmentMapLocations").mockResolvedValue({
      locations: [
        {
          equipmentId: "GEN-0162",
          address: "Сүхбаатарын талбай",
          coordinates: { latitude: 47.9184, longitude: 106.9177 },
        },
      ],
    })
    vi.spyOn(api, "getWorksiteLocation").mockResolvedValue({ location: null })
    const saveWorksiteLocation = vi
      .spyOn(api, "saveWorksiteLocation")
      .mockResolvedValue({ location })

    render(
      <EquipmentMapScreen
        equipment={equipment}
        onNavigate={() => {}}
        role="renter"
        sessionToken="customer-token"
      />,
    )

    expect(
      await screen.findByRole("heading", {
        name: "Таны ажиллах газрын байршил",
      }),
    ).toBeInTheDocument()
    expect(await screen.findByText("1 map markers")).toBeInTheDocument()
    expect(api.getWorksiteLocation).toHaveBeenCalledWith("customer-token")
    await user.click(
      screen.getByRole("button", { name: "Газрын зураг дээр pin сонгох" }),
    )
    await user.click(
      screen.getByRole("button", {
        name: "Миний ажиллах газрын байршлыг хадгалах",
      }),
    )

    await waitFor(() =>
      expect(saveWorksiteLocation).toHaveBeenCalledWith(
        location,
        "customer-token",
      ),
    )
    expect(
      await screen.findByText(
        "Таны ажиллах газрын байршлыг бүртгэлд хадгаллаа.",
      ),
    ).toBeInTheDocument()
    expect(await screen.findByText("2 map markers")).toBeInTheDocument()
  })
})
