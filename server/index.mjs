import { existsSync } from "node:fs"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import cors from "cors"
import express from "express"
import nodemailer from "nodemailer"
import pg from "pg"
import { registerAuthRoutes } from "./auth-routes.mjs"
import {
  createMemoryAuthStore,
  createPostgresAuthStore,
} from "./auth-store.mjs"
import { initializeBookingStore, registerBookingRoutes } from "./bookings.mjs"
import {
  initializeEquipmentPhotoStore,
  registerEquipmentPhotoRoutes,
} from "./equipment-photos.mjs"
import {
  initializeEquipmentLocationStore,
  registerEquipmentLocationRoutes,
} from "./equipment-locations.mjs"
import {
  initializeSearchHistoryStore,
  registerSearchHistoryRoutes,
} from "./search-history.mjs"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const app = express()
const port = Number(process.env.PORT || 4000)
const distPath = path.join(__dirname, "..", "dist")
const testMemoryStore =
  process.env.NODE_ENV === "test" && process.env.AUTH_TEST_MEMORY === "true"
const pool = testMemoryStore
  ? null
  : process.env.DATABASE_URL
    ? new pg.Pool({ connectionString: process.env.DATABASE_URL })
    : null
const authStore = testMemoryStore
  ? createMemoryAuthStore()
  : pool
    ? createPostgresAuthStore(pool)
    : null
app.disable("x-powered-by")
app.use(cors())
app.use(express.json())

const equipment = [
  {
    id: "DRL-UB-0247",
    name: "Өрмийн машин D45",
    category: "Цахилгаан багаж",
    model: "Atlas Copco D45",
    status: "Түрээстэй",
    meta: "DRL-UB-0247",
    location: "Нарны зам · Блок B",
    assignee: "Б. Бат",
    tenant: "Хөх Тэнгэр ХХК",
    due: "10-р сарын 18",
    telemetry: { vibration: null, temperature: null, rpm: null },
    live: false,
  },
  {
    id: "GEN-0162",
    name: "Генератор 150 кВА",
    category: "Үүсгүүр, компрессор, насос",
    model: "Cummins 150 kVA",
    status: "Бэлэн",
    meta: "GEN-0162",
    location: "Зүүн талбай · Хашаа 2",
    assignee: "С. Уран",
    tenant: "Монкон ХХК",
    due: "10-р сарын 14",
    telemetry: { vibration: null, temperature: null, rpm: null },
    live: false,
  },
  {
    id: "MIX-4993",
    name: "Бетон зуурагч 8м³",
    category: "Барилгын тоног төхөөрөмж",
    model: "MIX-8 PRO",
    status: "Түрээстэй",
    meta: "MIX-4993",
    location: "Талбай 12 · Блок C",
    assignee: "Н. Баяр",
    tenant: "Улаанбаатар бетон",
    due: "10-р сарын 16",
    telemetry: { vibration: null, temperature: null, rpm: null },
    live: false,
  },
  {
    id: "EXC-0914",
    name: "Бага оврын экскаватор",
    category: "Хүнд даацын машин механизм",
    model: "CAT 308E",
    status: "Засварт",
    meta: "EXC-0914",
    location: "Баруун талбай · Хашаа 1",
    assignee: "Г. Дэлгэр",
    tenant: "Говь зам ХХК",
    due: "10-р сарын 09",
    telemetry: { vibration: null, temperature: null, rpm: null },
    live: false,
  },
  {
    id: "TLS-1318",
    name: "Гар багаж / багц",
    category: "Цахилгаан багаж",
    model: "Tool kit 12",
    status: "Бэлэн",
    meta: "TLS-1318",
    location: "Номын сан · Хадгалах",
    assignee: "Б. Бөх",
    tenant: "Улаанбаатар логистик",
    due: "10-р сарын 20",
    telemetry: { vibration: null, temperature: null, rpm: null },
    live: false,
  },
]

const { equipmentWithPhotoUrls } = registerEquipmentPhotoRoutes(app, {
  equipment,
  pool,
  authStore,
  testMemoryStore,
})
registerSearchHistoryRoutes(app, { pool, authStore, testMemoryStore })
registerBookingRoutes(app, { pool, authStore, equipment, testMemoryStore })
registerEquipmentLocationRoutes(app, {
  pool,
  authStore,
  equipment,
  testMemoryStore,
})

const alerts = []

const notifications = [
  {
    id: "n-2",
    title: "Хугацаа 2 цагийн дараа дуусна",
    meta: "Өрмийн машин D45",
    type: "calendar",
    createdAt: "Өнөөдөр · 12:50",
  },
  {
    id: "n-3",
    title: "Check-out амжилттай",
    meta: "GEN-0162 · 09:28",
    type: "success",
    createdAt: "Өнөөдөр · 09:28",
  },
  {
    id: "n-4",
    title: "Check-in хугацаа ойртлоо",
    meta: "DRL-UB-0247 · 12:46",
    type: "warning",
    createdAt: "Өнөөдөр · 12:46",
  },
]

const supportTeam = [
  { name: "Д. Эрдэнэ", role: "Техникч · 7 мин" },
  { name: "С. Номин", role: "Менежер · ONLINE" },
]

const dashboard = {
  summary: {
    totalEquipment: 128,
    rentedToday: 6,
    alerts: 0,
    syncSecondsAgo: "8 сек өмнө",
    siteName: "Улаанбаатар төв",
  },
  equipment,
  alerts,
  notifications,
  supportTeam,
}

const smtpConfigured = Boolean(process.env.SMTP_USER && process.env.SMTP_PASS)
const mailer = smtpConfigured
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: Number(process.env.SMTP_PORT || 465),
      secure: process.env.SMTP_SECURE !== "false",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  : null

registerAuthRoutes(app, {
  store: authStore ?? {
    async createUser() {
      throw new Error("DATABASE_URL is not configured")
    },
  },
  sendVerificationCode: mailer
    ? async (email, code, purpose) =>
        mailer.sendMail({
          from: process.env.SMTP_FROM || process.env.SMTP_USER,
          to: email,
          subject:
            purpose === "register"
              ? "Түрээс Ops бүртгэл баталгаажуулах код"
              : "Түрээс Ops нууц үг сэргээх код",
          text: `Таны нэг удаагийн код: ${code}\n\nКод 10 минутын хугацаанд хүчинтэй бөгөөд 5 удаагийн оролдлоготой.\n\nХэрэв та энэ хүсэлтийг илгээгээгүй бол энэ имэйлийг үл тооно уу.`,
        })
    : undefined,
})

if (existsSync(distPath)) {
  app.use(express.static(distPath))

  app.get(/^\/(?!api).*/, (req, res) => {
    res.sendFile(path.join(distPath, "index.html"))
  })
}

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "ops-backend",
    time: new Date().toISOString(),
  })
})

app.get("/api/dashboard", async (req, res, next) => {
  try {
    res.json({
      ...dashboard,
      equipment: await equipmentWithPhotoUrls(equipment),
    })
  } catch (error) {
    next(error)
  }
})

app.get("/api/equipment", async (req, res, next) => {
  try {
    res.json(await equipmentWithPhotoUrls(equipment))
  } catch (error) {
    next(error)
  }
})

app.get("/api/equipment/:id", async (req, res, next) => {
  const item = equipment.find((entry) => entry.id === req.params.id)

  if (!item) {
    return res.status(404).json({ message: "Төхөөрөмж олдсонгүй" })
  }

  try {
    const [itemWithPhoto] = await equipmentWithPhotoUrls([item])
    return res.json(itemWithPhoto)
  } catch (error) {
    return next(error)
  }
})

app.get("/api/notifications", (req, res) => {
  res.json(notifications)
})

app.get("/api/alerts", (req, res) => {
  res.json(alerts)
})

app.post("/api/support", (req, res) => {
  const { message = "Тусламжийн хүсэлт илгээгдлээ", team = "support" } =
    req.body ?? {}

  return res.json({
    ok: true,
    message,
    team,
    ticketId: "A-8842",
    updatedAt: new Date().toISOString(),
  })
})

app.use((error, req, res, next) => {
  console.error("API request failed", error)
  if (res.headersSent) return next(error)
  if (error.status === 413) {
    return res
      .status(413)
      .json({ message: "Зургийн хэмжээ 5 МБ-аас хэтэрч болохгүй." })
  }
  if (error.status === 400) {
    return res.status(400).json({ message: "Хүсэлтийн өгөгдөл буруу байна." })
  }
  return res.status(500).json({ message: "Серверийн алдаа гарлаа." })
})

const startServer = async () => {
  if (!authStore) {
    throw new Error(
      "DATABASE_URL is required to start the authentication service.",
    )
  }
  if (!process.env.OTP_SECRET || process.env.OTP_SECRET.length < 32) {
    throw new Error(
      "OTP_SECRET must be configured with at least 32 characters.",
    )
  }
  await authStore.initialize()
  if (pool) {
    await initializeEquipmentPhotoStore(pool)
    await initializeEquipmentLocationStore(pool)
    await initializeSearchHistoryStore(pool)
    await initializeBookingStore(pool)
  }
  return app.listen(port, "0.0.0.0", () => {
    console.log(`Ops backend listening on http://0.0.0.0:${port}`)
  })
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  startServer().catch(async (error) => {
    console.error("Ops backend failed to start", error)
    if (pool) await pool.end()
    process.exitCode = 1
  })
}
