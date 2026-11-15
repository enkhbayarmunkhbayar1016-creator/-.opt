import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"
import App from "../src/App"
import { api } from "../src/lib/api"
import { rentalCatalog } from "../src/rentalCatalog"

afterEach(() => {
  cleanup()
  vi.unstubAllEnvs()
  window.localStorage.removeItem("rent-theme")
  delete document.documentElement.dataset.theme
})

// Үндсэн веб хуудсаас бусад хэсэг рүү шилжих, буцаж ирэх урсгалыг шалгана.
describe("App routes", () => {
  it("uses a unique equipment illustration for every catalog item", () => {
    const artwork = rentalCatalog.map((item) => item.image)

    expect(artwork).toHaveLength(rentalCatalog.length)
    expect(new Set(artwork).size).toBe(rentalCatalog.length)
  })

  it("uses supplied local photos for equipment types with matching images", () => {
    const localPhotoNames = [
      "Халдаг шураг чангалагч",
      "Цахилгаан өрмийн машин",
      "Цохилтот өрөм / перфоратор",
      "Алмаазан өрмийн машин",
      "Өнцөгт ган хөрөө / болгарка",
      "Цахилгаан хөрөө",
      "Шүдтэй хөрөө",
      "Гинжит хөрөө",
      "Хавтгай үрэгч / зүлгүүрийн машин",
      "Нураагч алх / цахилгаан сүх",
      "Хэв үүсгэгч / фрез",
      "Цахилгаан үүсгүүр / генератор",
    ]

    for (const name of localPhotoNames) {
      const item = rentalCatalog.find((entry) => entry.name === name)
      expect(item?.image, name).toMatch(/^\/assets\/equipment-catalog\//)
    }
  })

  it("toggles and persists night mode across the website and login", async () => {
    const user = userEvent.setup()
    window.history.replaceState(null, "", "/")
    window.localStorage.removeItem("rent-theme")
    render(<App />)

    await user.click(
      screen.getByRole("button", { name: "Шөнийн горимд шилжих" }),
    )
    expect(document.documentElement.dataset.theme).toBe("dark")
    expect(window.localStorage.getItem("rent-theme")).toBe("dark")

    await user.click(screen.getByRole("button", { name: "Нэвтрэх" }))
    expect(document.querySelector(".login-form")).toHaveClass("bg-white")
    expect(document.querySelector(".app-theme")).toHaveClass("dark-mode")

    await user.click(
      screen.getByRole("button", { name: "Өдрийн горимд шилжих" }),
    )
    expect(document.documentElement.dataset.theme).toBe("light")
    expect(window.localStorage.getItem("rent-theme")).toBe("light")
  })

  it("lists the rental catalog with search and category filters", async () => {
    const user = userEvent.setup()
    window.history.replaceState(null, "", "/")
    render(<App />)

    expect(
      screen.queryByRole("heading", { name: "Тоног төхөөрөмжийн бүх төрөл" }),
    ).not.toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Бүгдийг харах" }))
    expect(
      screen.getByRole("heading", { name: "Тоног төхөөрөмжийн бүх төрөл" }),
    ).toBeInTheDocument()
    expect(screen.getAllByText(/Жишиг: ₮/).length).toBeGreaterThan(0)
    expect(
      screen.getByText(/нэвтрэхгүйгээр харах боломжтой/),
    ).toBeInTheDocument()
    expect(screen.queryByText(/\$/)).not.toBeInTheDocument()

    await user.selectOptions(
      screen.getByLabelText("Төрлөөр шүүх"),
      "Хүнд даацын машин механизм",
    )
    expect(screen.getByText("Экскаватор")).toBeInTheDocument()
    expect(screen.queryByText("Цахилгаан өрмийн машин")).not.toBeInTheDocument()

    await user.type(screen.getByLabelText("Тоног төхөөрөмж хайх"), "мини")
    expect(screen.getByText("Мини экскаватор")).toBeInTheDocument()
    expect(screen.queryByText("Экскаватор")).not.toBeInTheDocument()
  })

  // Нийтийн нүүр болон каталогт аюулгүй байдлын дотоод хуудсыг харуулахгүй.
  it("renders a public landing page without exposing the security guide", async () => {
    const user = userEvent.setup()
    window.history.replaceState(null, "", "/")
    render(<App />)

    expect(
      screen.getByRole("heading", { name: /Ажлын талбарын хүн/ }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "npm security" }),
    ).not.toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Тоног төхөөрөмж" }))
    expect(
      screen.queryByRole("button", { name: "npm security" }),
    ).not.toBeInTheDocument()
  })

  it("sends the worksite step through renter registration to the map", async () => {
    const user = userEvent.setup()
    vi.stubEnv("VITE_GOOGLE_MAPS_API_KEY", "")
    window.history.replaceState(null, "", "/#calendar")
    vi.spyOn(api, "register").mockResolvedValue({
      message: "Баталгаажуулах код илгээлээ.",
    })
    vi.spyOn(api, "verifyRegistrationCode").mockResolvedValue({
      message: "Бүртгэл үүслээ.",
      user: {
        id: "renter-1",
        role: "renter",
        phone: "99112233",
        email: "renter@example.com",
        name: "Renter",
        company: "Хувь хэрэглэгч",
      },
      session: {
        token: "renter-token",
        role: "renter",
        expiresAt: "2026-11-16T10:00:00.000Z",
      },
    })
    vi.spyOn(api, "getDashboard").mockResolvedValue({
      summary: {
        totalEquipment: 1,
        rentedToday: 0,
        alerts: 0,
        syncSecondsAgo: "now",
        siteName: "Example",
      },
      equipment: [],
      alerts: [],
      notifications: [],
      supportTeam: [],
    })
    vi.spyOn(api, "getWorksiteLocation").mockResolvedValue({ location: null })
    render(<App />)

    await user.click(
      screen.getByRole("button", { name: "01 Ажил, байршлаа бидэнд хэлнэ үү" }),
    )
    await user.click(screen.getByRole("button", { name: "Бүртгүүлэх" }))
    expect(
      screen.getByRole("heading", { name: "Шинэ бүртгэл" }),
    ).toBeInTheDocument()

    await user.type(screen.getByLabelText("Нэр"), "Renter")
    await user.type(screen.getByLabelText("Утасны дугаар"), "99112233")
    await user.type(screen.getByLabelText("Имэйл хаяг"), "renter@example.com")
    await user.type(screen.getByLabelText("ШИНЭ НУУЦ ҮГ"), "secure-password")
    await user.click(screen.getByRole("button", { name: "Бүртгэл үүсгэх" }))
    await screen.findByText("Баталгаажуулах код илгээлээ.")
    await user.type(screen.getByLabelText("Баталгаажуулах код"), "123456")
    await user.click(screen.getByRole("button", { name: "Код баталгаажуулах" }))

    expect(
      await screen.findByRole("heading", { name: "Захиалгын хуанли" }),
    ).toBeInTheDocument()
    expect(api.getWorksiteLocation).toHaveBeenCalledWith("renter-token")
    expect(screen.getByText(/VITE_GOOGLE_MAPS_API_KEY/)).toBeInTheDocument()
  })

  // Веб порталаас нэвтэрч, нүүр хуудас руу буцаж байгааг шалгана.
  it("opens the website portal and returns to the landing page", async () => {
    const user = userEvent.setup()
    window.history.replaceState(null, "", "/")
    vi.spyOn(api, "login").mockResolvedValue({
      message: "Welcome",
      user: {
        id: "manager-99128044",
        role: "manager",
        phone: "99128044",
        name: "Manager",
        company: "Example Co",
      },
      session: {
        token: "session-token",
        role: "manager",
        expiresAt: "2026-11-13T10:00:00.000Z",
      },
    })
    vi.spyOn(api, "getDashboard").mockResolvedValue({
      summary: {
        totalEquipment: 1,
        rentedToday: 1,
        alerts: 0,
        syncSecondsAgo: "now",
        siteName: "Example",
      },
      equipment: [],
      alerts: [],
      notifications: [],
      supportTeam: [],
    })
    render(<App />)

    await user.click(screen.getByRole("button", { name: "Нэвтрэх" }))
    expect(
      screen.getByRole("heading", { name: "Түрээслэгчийн нэвтрэх" }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: /^Менежер Тайлан/ }),
    ).not.toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Ажилтан нэвтрэх" }))
    expect(
      screen.getByRole("button", { name: /^Менежер Тайлан/ }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: /^Менежер Тайлан/ }))
    await user.type(screen.getByLabelText("Имэйл хаяг"), "manager@example.com")
    await user.type(screen.getByLabelText("Нууц үг"), "secure-password")
    await user.click(screen.getByRole("button", { name: "Менежерээр нэвтрэх" }))
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: /Өдрийн мэнд, Менежер/ }),
      ).toBeInTheDocument(),
    )
    await user.click(screen.getByRole("button", { name: "npm security" }))
    expect(
      screen.getByRole("heading", {
        name: /Secure every step of your npm supply chain/,
      }),
    ).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Back to dashboard" }))
    expect(
      screen.getByRole("heading", { name: /Өдрийн мэнд, Менежер/ }),
    ).toBeInTheDocument()
    await user.click(
      screen.getByRole("button", { name: "Вэбсайтын нүүр хуудас" }),
    )
    expect(
      screen.getByRole("heading", { name: /Ажлын талбарын хүн/ }),
    ).toBeInTheDocument()
  })
})
