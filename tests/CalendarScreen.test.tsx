import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"
import { api } from "../src/lib/api"
import type { MapCoordinates } from "../src/mobile/GoogleMapPicker"
import { CalendarScreen } from "../src/mobile/screens/calendar"

vi.mock("../src/mobile/GoogleMapPicker", () => ({
  GoogleMapPicker: ({
    onSelect,
  }: {
    onSelect: (coordinates: MapCoordinates, address?: string) => void
  }) => (
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
  ),
}))

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe("CalendarScreen worksite flow", () => {
  it("loads the user's saved pin and persists selected location and booking", async () => {
    const user = userEvent.setup()
    const savedLocation = {
      address: "Сүхбаатарын талбай",
      coordinates: { latitude: 47.9184, longitude: 106.9177 },
      updatedAt: "2026-11-15T10:00:00.000Z",
    }
    vi.spyOn(api, "getWorksiteLocation").mockResolvedValue({
      location: savedLocation,
    })
    const saveLocation = vi
      .spyOn(api, "saveWorksiteLocation")
      .mockResolvedValue({ location: savedLocation })
    const createBooking = vi.fn(async () => {})

    render(
      <CalendarScreen
        equipmentId="DRL-UB-0247"
        onCreateBooking={createBooking}
        onNavigate={() => {}}
        sessionToken="customer-token"
      />,
    )

    expect(
      await screen.findByText("Pin сонгосон: 47.918400, 106.917700"),
    ).toBeInTheDocument()
    expect(api.getWorksiteLocation).toHaveBeenCalledWith("customer-token")
    expect(
      screen.queryByText("Ажлын газрын нэмэлт тайлбар"),
    ).not.toBeInTheDocument()

    await user.click(
      screen.getByRole("button", { name: "Ажлын байршлыг хадгалах" }),
    )
    await waitFor(() =>
      expect(saveLocation).toHaveBeenCalledWith(
        {
          address: "Сүхбаатарын талбай",
          coordinates: savedLocation.coordinates,
        },
        "customer-token",
      ),
    )
    expect(
      screen.getByText("Ажлын байршлыг таны бүртгэлд хадгаллаа."),
    ).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Захиалга илгээх" }))
    await waitFor(() => {
      expect(createBooking).toHaveBeenCalledWith({
        equipmentId: "DRL-UB-0247",
        startDate: "2026-10-09",
        endDate: "2026-10-10",
        startTime: "08:00",
        endTime: "18:00",
        rentalDays: 1,
        worksiteAddress: "Сүхбаатарын талбай",
        coordinates: savedLocation.coordinates,
        notes: "",
      })
    })
  })
})
