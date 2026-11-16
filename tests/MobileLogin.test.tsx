import {
  cleanup,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"
import { api } from "../src/lib/api"
import MobileLogin from "../src/MobileLogin"

const loginResult = {
  message: "Welcome",
  user: {
    id: "renter-99128044",
    role: "renter" as const,
    phone: "99128044",
    email: "test@example.com",
    name: "Renter",
    company: "Example Co",
  },
  session: {
    token: "session-token",
    role: "renter" as const,
    expiresAt: "2026-11-13T10:00:00.000Z",
  },
}

afterEach(() => {
  cleanup()
  window.history.replaceState(null, "", "/#login")
  vi.restoreAllMocks()
})

describe("MobileLogin", () => {
  it("logs in using the selected role, email, and password", async () => {
    const user = userEvent.setup()
    const onLogin = vi.fn()
    const login = vi.spyOn(api, "login").mockResolvedValue(loginResult)

    render(<MobileLogin onLogin={onLogin} />)
    await user.click(screen.getByRole("button", { name: "Ажилтан нэвтрэх" }))
    await user.click(screen.getByRole("button", { name: /^Менежер Тайлан/ }))
    await user.type(screen.getByLabelText("Имэйл хаяг"), "test@example.com")
    await user.type(screen.getByLabelText("Нууц үг"), "secure-password")
    await user.click(
      screen.getByRole("button", { name: "Менежерээр нэвтрэх" }),
    )

    await waitFor(() => expect(onLogin).toHaveBeenCalledWith(loginResult))
    expect(login).toHaveBeenCalledWith({
      role: "manager",
      email: "test@example.com",
      password: "secure-password",
    })
  })

  it("shows login failures and re-enables submit", async () => {
    const user = userEvent.setup()
    vi.spyOn(api, "login").mockRejectedValue(new Error("Invalid credentials"))

    render(<MobileLogin />)
    await user.click(screen.getByRole("button", { name: "Ажилтан нэвтрэх" }))
    await user.click(screen.getByRole("button", { name: /^Менежер Тайлан/ }))
    await user.type(screen.getByLabelText("Имэйл хаяг"), "test@example.com")
    await user.type(screen.getByLabelText("Нууц үг"), "wrong-password")
    await user.click(
      screen.getByRole("button", { name: "Менежерээр нэвтрэх" }),
    )

    expect(await screen.findByText("Invalid credentials")).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Менежерээр нэвтрэх" }),
    ).toBeEnabled()
  })

  it("shows a fallback error when login rejects with a non-Error value", async () => {
    const user = userEvent.setup()
    vi.spyOn(api, "login").mockRejectedValue("network unavailable")

    render(<MobileLogin />)
    await user.click(screen.getByRole("button", { name: "Ажилтан нэвтрэх" }))
    await user.click(screen.getByRole("button", { name: /^Менежер Тайлан/ }))
    await user.type(screen.getByLabelText("Имэйл хаяг"), "test@example.com")
    await user.type(screen.getByLabelText("Нууц үг"), "wrong-password")
    await user.click(
      screen.getByRole("button", { name: "Менежерээр нэвтрэх" }),
    )

    expect(
      await screen.findByText("Нэвтрэх үед алдаа гарлаа."),
    ).toBeInTheDocument()
  })

  it("uses the local registration code to verify and sign in", async () => {
    const user = userEvent.setup()
    const onLogin = vi.fn()
    const register = vi
      .spyOn(api, "register")
      .mockResolvedValue({
        message: "Check your email",
        developmentCode: "123456",
      })
    const verify = vi
      .spyOn(api, "verifyRegistrationCode")
      .mockResolvedValue(loginResult)

    render(<MobileLogin onLogin={onLogin} />)
    await user.click(screen.getByRole("button", { name: "Бүртгүүлэх" }))
    await user.type(screen.getByLabelText("Нэр"), "Test User")
    await user.type(screen.getByLabelText("Утасны дугаар"), "99128044")
    await user.type(screen.getByLabelText("Имэйл хаяг"), "test@example.com")
    await user.type(screen.getByLabelText("Шинэ нууц үг"), "secure-password")
    await user.click(screen.getByRole("button", { name: "Бүртгэл үүсгэх" }))

    expect(await screen.findByText("Check your email")).toBeInTheDocument()
    expect(register).toHaveBeenCalledWith({
      name: "Test User",
      company: "",
      phone: "99128044",
      email: "test@example.com",
      password: "secure-password",
    })
    expect(screen.getByLabelText("Баталгаажуулах код")).toHaveValue("123456")
    await user.click(
      screen.getByRole("button", { name: "Код баталгаажуулах" }),
    )

    await waitFor(() => expect(onLogin).toHaveBeenCalledWith(loginResult))
    expect(verify).toHaveBeenCalledWith({
      email: "test@example.com",
      code: "123456",
    })
  })

  it("asks for the company name only when the customer has a company", async () => {
    const user = userEvent.setup()
    const register = vi
      .spyOn(api, "register")
      .mockResolvedValue({ message: "Check your email" })

    render(<MobileLogin />)
    await user.click(screen.getByRole("button", { name: "Бүртгүүлэх" }))
    const companyOption = screen.getByRole("button", {
      name: "Тийм, байгууллагатай",
    })
    const individualOption = screen.getByRole("button", {
      name: "Үгүй, хувь хүн",
    })
    expect(individualOption).toHaveAttribute("aria-pressed", "true")
    expect(companyOption).toHaveAttribute("aria-pressed", "false")
    await user.click(
      companyOption,
    )
    expect(companyOption).toHaveAttribute("aria-pressed", "true")
    expect(individualOption).toHaveAttribute("aria-pressed", "false")
    await user.type(screen.getByLabelText("Нэр"), "Test User")
    await user.type(screen.getByLabelText("Байгууллагын нэр"), "Example Co")
    await user.type(screen.getByLabelText("Утасны дугаар"), "99128044")
    await user.type(screen.getByLabelText("Имэйл хаяг"), "test@example.com")
    await user.type(screen.getByLabelText("Шинэ нууц үг"), "secure-password")
    await user.click(screen.getByRole("button", { name: "Бүртгэл үүсгэх" }))

    await waitFor(() =>
      expect(register).toHaveBeenCalledWith(
        expect.objectContaining({ company: "Example Co" }),
      ),
    )
  })

  it("sends a password recovery code and resets the password", async () => {
    const user = userEvent.setup()
    const forgotPassword = vi
      .spyOn(api, "forgotPassword")
      .mockResolvedValue({
        message: "Code sent",
        developmentCode: "654321",
      })
    const resetPassword = vi
      .spyOn(api, "resetPassword")
      .mockResolvedValue({ message: "Password changed" })

    render(<MobileLogin />)
    await user.click(
      screen.getByRole("button", { name: "Нууц үгээ мартсан уу?" }),
    )
    await user.type(screen.getByLabelText("Имэйл хаяг"), "test@example.com")
    await user.click(screen.getByRole("button", { name: "Код авах" }))

    expect(await screen.findByText("Code sent")).toBeInTheDocument()
    expect(forgotPassword).toHaveBeenCalledWith({ email: "test@example.com" })
    expect(screen.getByLabelText("Баталгаажуулах код")).toHaveValue("654321")
    await user.type(screen.getByLabelText("Шинэ нууц үг"), "new-password")
    await user.click(screen.getByRole("button", { name: "Нууц үг шинэчлэх" }))

    expect(await screen.findByText("Password changed")).toBeInTheDocument()
    expect(resetPassword).toHaveBeenCalledWith({
      email: "test@example.com",
      code: "654321",
      password: "new-password",
    })
  })
})
