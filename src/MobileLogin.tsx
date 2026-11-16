import { useState, type FormEvent } from "react"
import { api, type UserRole } from "./lib/api"

const imgScanLine = "/assets/cc583.svg"
const imgArrowRight = "/assets/18191.svg"
const imgShieldCheck = "/assets/afd3d.svg"

type Role = Extract<UserRole, "manager" | "fixer" | "renter">
type Mode = "login" | "register" | "verify-register" | "forgot" | "verify-reset"

const roles: {
  id: Role;
  title: string;
  description: string;
}[] = [
  {
    id: "manager",
    title: "Менежер",
    description: "Тайлан, төлөв, захиалга, удирдлага",
  },
  {
    id: "fixer",
    title: "Засварчин",
    description: "Төхөөрөмж, QR, засвар, telemetry",
  },
]

type LoginResult = {
  message: string
  user: {
    id: string
    role: UserRole
    phone: string
    email?: string
    name: string
    company: string
  }
  session: {
    token: string
    role: UserRole
    expiresAt: string
  }
}

const inputClass =
  "h-[46px] w-full rounded-[7px] border border-[#d6dfe4] px-[12px] font-['Inter:Regular'] text-[13px] text-[#14212a] outline-none focus:border-[#1677a8]"
const labelClass =
  "flex w-full shrink-0 flex-col items-start gap-[6px] font-['Inter:Bold'] text-[11px] font-bold text-[#667784]"

export default function MobileLogin({
  onLogin,
  onBackToWebsite,
}: {
  onLogin?: (result: LoginResult) => void
  onBackToWebsite?: () => void
}) {
  const [mode, setMode] = useState<Mode>("login")
  const [role, setRole] = useState<Role>("renter")
  const [staffLogin, setStaffLogin] = useState(false)
  const [name, setName] = useState("")
  const [company, setCompany] = useState("")
  const [hasCompany, setHasCompany] = useState(false)
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [code, setCode] = useState("")
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const changeMode = (nextMode: Mode) => {
    setError("")
    setNotice("")
    setMode(nextMode)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")
    setNotice("")
    setIsSubmitting(true)

    try {
      if (mode === "register") {
        const result = await api.register({
          name,
          company: hasCompany ? company : "",
          phone: phone.replace(/\D/g, ""),
          email,
          password,
        })
        setNotice(result.message)
        setCode(result.developmentCode ?? "")
        setMode("verify-register")
      } else if (mode === "verify-register") {
        const result = await api.verifyRegistrationCode({ email, code })
        onLogin?.(result)
      } else if (mode === "login") {
        const result = await api.login({ email, password, role })
        onLogin?.(result)
      } else if (mode === "forgot") {
        const result = await api.forgotPassword({ email })
        setNotice(result.message)
        setCode(result.developmentCode ?? "")
        setMode("verify-reset")
      } else if (mode === "verify-reset") {
        const result = await api.resetPassword({
          email,
          code,
          password,
        })
        setPassword("")
        setCode("")
        setNotice(result.message)
        setMode("login")
      }
    } catch (err) {
      const fallback =
        mode === "register"
          ? "Бүртгүүлэх үед алдаа гарлаа."
          : mode === "forgot"
            ? "Сэргээх хүсэлт илгээх үед алдаа гарлаа."
            : mode === "verify-register"
              ? "Имэйл баталгаажуулах үед алдаа гарлаа."
              : mode === "verify-reset"
                ? "Нууц үг шинэчлэх үед алдаа гарлаа."
                : "Нэвтрэх үед алдаа гарлаа."
      setError(err instanceof Error ? err.message : fallback)
    } finally {
      setIsSubmitting(false)
    }
  }

  const title =
    mode === "register"
      ? "Шинэ бүртгэл"
      : mode === "forgot"
        ? "Нууц үг сэргээх"
        : mode === "verify-register"
          ? "Имэйл баталгаажуулах"
          : mode === "verify-reset"
            ? "Код болон шинэ нууц үг"
            : staffLogin
              ? "Ажилтан нэвтрэх"
              : "Түрээслэгчийн нэвтрэх"
  const submitLabel =
    mode === "register"
      ? "Бүртгэл үүсгэх"
      : mode === "forgot"
        ? "Код авах"
        : mode === "verify-register"
          ? "Код баталгаажуулах"
          : mode === "verify-reset"
            ? "Нууц үг шинэчлэх"
            : role === "manager"
              ? "Менежерээр нэвтрэх"
              : role === "fixer"
                ? "Засварчнаар нэвтрэх"
                : "Түрээслэгчээр нэвтрэх"

  return (
    <main
      className="mx-auto flex min-h-dvh w-full flex-col bg-[#eef2f4] md:min-h-screen md:max-w-7xl md:flex-row md:items-stretch md:gap-6 md:bg-[#f3f1ec] md:p-8 lg:p-12"
      data-name="Нэвтрэх дэлгэц"
      data-node-id="5:17896"
    >
      <section className="relative flex min-h-[230px] w-full shrink-0 flex-col items-start justify-end overflow-hidden bg-[#101c25] px-[24px] pb-[24px] md:min-h-[calc(100vh-4rem)] md:flex-1 md:justify-center md:rounded-2xl md:px-10 md:pb-10">
        <img
          alt=""
          className="absolute inset-0 size-full object-cover opacity-70"
          src="/assets/rent-ops-illustration.svg"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#07131f]/65 via-[#101c25]/45 to-[#07111b]/75" />
        {onBackToWebsite && (
          <button
            className="absolute top-4 right-4 z-10 rounded-full border border-white/20 bg-white/10 px-3 py-2 font-['Inter:Bold'] text-xs font-bold text-white transition hover:bg-white/20 md:top-8 md:right-auto md:left-8"
            onClick={onBackToWebsite}
            type="button"
          >
            Вэбсайтын нүүр хуудас
          </button>
        )}
        <div className="relative z-10 flex w-full max-w-xl flex-col items-start gap-[14px] rounded-2xl border border-white/20 bg-[#08141f]/45 p-5 shadow-[0_20px_55px_rgba(0,0,0,0.18)] backdrop-blur-sm md:p-7">
          <div className="flex items-center gap-3">
            <div className="flex size-[42px] items-center justify-center rounded-[10px] bg-[#1677a8]">
              <img alt="" className="size-[23px]" src={imgScanLine} />
            </div>
            <p className="font-['Inter:Bold'] text-[15px] font-bold text-[#e2f1f7]">
              Rental equipment
            </p>
          </div>
          <h1 className="w-full font-['Inter:Bold'] text-[29px] leading-[1.12] font-bold text-white">
            Дэлхийн бүх төхөөрөмжийг нэг дор удирд
          </h1>
        </div>
      </section>

      <form
        className="login-form flex w-full flex-1 flex-col items-start gap-[14px] border border-white bg-white p-[20px] shadow-[0_18px_48px_rgba(20,33,42,0.08)] md:my-auto md:max-w-xl md:rounded-2xl md:p-8"
        onSubmit={handleSubmit}
      >
        <div>
          <h2 className="font-['Inter:Bold'] text-[20px] font-bold text-[#14212a]">
            {title}
          </h2>
          <p className="mt-[4px] font-['Inter:Regular'] text-[12px] leading-[1.45] text-[#667784]">
            {mode === "register"
              ? "Мэдээллээ оруулж бүртгэлээ үүсгэнэ үү."
              : mode === "forgot"
                ? "Бүртгэлтэй имэйл рүү 6 оронтой код илгээнэ."
                : mode === "verify-register"
                  ? `${email} хаяг руу илгээсэн кодыг оруулна уу.`
                  : mode === "verify-reset"
                    ? `${email} хаяг руу илгээсэн код болон шинэ нууц үгээ оруулна уу.`
                    : "Бүртгэлтэй имэйл болон нууц үгээрээ нэвтэрнэ үү."}
          </p>
        </div>

        {mode === "login" && (
          <>
            <div className="flex w-full shrink-0 gap-[8px]">
              {(staffLogin
                ? roles
                : [
                    {
                      id: "renter" as const,
                      title: "Түрээслэгч",
                      description: "Гэрээ, төлбөр, тоног төхөөрөмжийн хяналт",
                    },
                  ]
              ).map((item) => (
              <button
                aria-label={`${item.title} ${item.description}`}
                aria-pressed={role === item.id}
                className={`login-role-option flex h-[42px] flex-1 items-center justify-center rounded-[8px] font-['Inter:Bold'] text-[12px] font-bold transition-colors ${
                  role === item.id
                    ? "border-2 border-[#1677a8] bg-[#e2f1f7] text-[#14212a]"
                    : "border border-[#d6dfe4] bg-[#f6f8f9] text-[#667784]"
                }`}
                key={item.id}
                onClick={() => setRole(item.id)}
                type="button"
              >
                {item.title}
              </button>
              ))}
            </div>
            <button
              className="self-center font-['Inter:Bold'] text-[12px] font-bold text-[#1677a8]"
              onClick={() => {
                setStaffLogin((current) => !current)
                setRole("renter")
                setError("")
                setNotice("")
              }}
              type="button"
            >
              {staffLogin ? "Түрээслэгчээр нэвтрэх" : "Ажилтан нэвтрэх"}
            </button>
          </>
        )}

        {mode === "register" && (
          <>
            <label className={labelClass}>
              НЭР
              <input
                aria-label="Нэр"
                autoComplete="name"
                className={inputClass}
                onChange={(event) => setName(event.target.value)}
                required
                value={name}
              />
            </label>
            <fieldset className="w-full border-0 p-0">
              <legend className={`${labelClass} mb-[6px]`}>
                БАЙГУУЛЛАГАТАЙ ЮУ?
              </legend>
              <div className="flex gap-[8px]">
                {[
                  { value: true, label: "Тийм, байгууллагатай" },
                  { value: false, label: "Үгүй, хувь хүн" },
                ].map((option) => (
                  <button
                    aria-pressed={hasCompany === option.value}
                    className={`login-company-option h-[42px] flex-1 rounded-[8px] border font-['Inter:Bold'] text-[11px] font-bold ${
                      hasCompany === option.value
                        ? "border-[#1677a8] bg-[#e2f1f7] text-[#14212a]"
                        : "border-[#d6dfe4] bg-[#f6f8f9] text-[#667784]"
                    }`}
                    key={option.label}
                    onClick={() => setHasCompany(option.value)}
                    type="button"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </fieldset>
            {hasCompany && (
              <label className={labelClass}>
                БАЙГУУЛЛАГЫН НЭР
                <input
                  aria-label="Байгууллагын нэр"
                  autoComplete="organization"
                  className={inputClass}
                  onChange={(event) => setCompany(event.target.value)}
                  required
                  value={company}
                />
              </label>
            )}
            <label className={labelClass}>
              УТАСНЫ ДУГААР
              <input
                aria-label="Утасны дугаар"
                autoComplete="tel"
                className={inputClass}
                inputMode="tel"
                onChange={(event) => setPhone(event.target.value)}
                required
                value={phone}
              />
            </label>
          </>
        )}

        {mode !== "verify-register" && mode !== "verify-reset" && (
          <label className={labelClass}>
            ИМЭЙЛ ХАЯГ
            <input
              aria-label="Имэйл хаяг"
              autoComplete="email"
              className={inputClass}
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </label>
        )}

        {(mode === "verify-register" || mode === "verify-reset") && (
          <label className={labelClass}>
            БАТАЛГААЖУУЛАХ КОД
            <input
              aria-label="Баталгаажуулах код"
              autoComplete="one-time-code"
              className={inputClass}
              inputMode="numeric"
              maxLength={6}
              onChange={(event) =>
                setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
              }
              required
              value={code}
            />
          </label>
        )}

        {(mode === "login" ||
          mode === "register" ||
          mode === "verify-reset") && (
          <label className={labelClass}>
            {mode === "login" ? "НУУЦ ҮГ" : "ШИНЭ НУУЦ ҮГ"}
            <input
              aria-label={mode === "login" ? "Нууц үг" : "Шинэ нууц үг"}
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              className={`${inputClass} font-['Roboto_Mono:Regular'] tracking-[0.08em]`}
              minLength={8}
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </label>
        )}

        {error && (
          <p className="w-full rounded-[8px] bg-[#fff1f0] px-[10px] py-[8px] font-['Inter:Regular'] text-[12px] text-[#cc524c]">
            {error}
          </p>
        )}
        {notice && (
          <p
            className="w-full rounded-[8px] bg-[#e3f3ec] px-[10px] py-[8px] font-['Inter:Regular'] text-[12px] text-[#238a62]"
            role="status"
          >
            {notice}
          </p>
        )}

        <button
          className="flex h-[52px] w-full shrink-0 items-center justify-center gap-[8px] rounded-[10px] border border-[#1677a8] bg-[#1677a8] px-[16px] transition-colors hover:bg-[#12658f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1677a8] disabled:cursor-not-allowed disabled:opacity-70"
          disabled={isSubmitting}
          type="submit"
        >
          <img alt="" className="size-[20px]" src={imgArrowRight} />
          <span className="font-['Inter:Bold'] text-[14px] font-bold text-white">
            {isSubmitting ? "Түр хүлээнэ үү..." : submitLabel}
          </span>
        </button>

        <div className="flex w-full flex-col items-center gap-[10px]">
          {mode === "login" && (
            <button
              className="font-['Inter:Bold'] text-[12px] font-bold text-[#1677a8]"
              onClick={() => changeMode("forgot")}
              type="button"
            >
              Нууц үгээ мартсан уу?
            </button>
          )}
          {mode === "login" ? (
            <p className="font-['Inter:Regular'] text-[12px] text-[#667784]">
              Бүртгэлгүй юу?{" "}
              <button
                className="font-['Inter:Bold'] font-bold text-[#1677a8]"
                onClick={() => changeMode("register")}
                type="button"
              >
                Бүртгүүлэх
              </button>
            </p>
          ) : (
            <button
              className="font-['Inter:Bold'] text-[12px] font-bold text-[#1677a8]"
              onClick={() => changeMode("login")}
              type="button"
            >
              Нэвтрэх хэсэг рүү буцах
            </button>
          )}
          <div className="flex items-center justify-center gap-[7px]">
            <img alt="" className="size-[15px]" src={imgShieldCheck} />
            <p className="font-['Inter:Regular'] text-[10px] text-[#667784]">
              Нууц үг шифрлэгдэн хадгалагдана
            </p>
          </div>
        </div>
      </form>
    </main>
  )
}
