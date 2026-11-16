import assert from "node:assert/strict"
import { once } from "node:events"
import { spawn } from "node:child_process"
import { createServer } from "node:net"
import { after, before, describe, it } from "node:test"

let server
let baseUrl
let serverOutput = ""

const getAvailablePort = async () => {
  const listener = createServer()
  listener.listen(0, "127.0.0.1")
  await once(listener, "listening")
  const { port } = listener.address()
  await new Promise((resolve, reject) =>
    listener.close((error) => (error ? reject(error) : resolve())),
  )
  return port
}

const waitForServer = async (url, timeoutMs = 10000) => {
  const started = Date.now()

  while (Date.now() - started < timeoutMs) {
    if (server.exitCode !== null) {
      throw new Error(`Backend exited before becoming ready:\n${serverOutput}`)
    }

    try {
      const response = await fetch(url)
      if (response.ok) return
    } catch {
      // Сервер асахыг хүлээх зуур холболтын алдааг дахин оролдоно.
    }

    await new Promise((resolve) => setTimeout(resolve, 100))
  }

  throw new Error(`Timed out waiting for ${url}:\n${serverOutput}`)
}

const requestJson = async (route, options) => {
  const response = await fetch(`${baseUrl}${route}`, options)
  const data = await response.json()
  return { response, data }
}

const jsonRequest = (body) => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
})

describe("Ops API", { concurrency: false }, () => {
  before(async () => {
    const port = await getAvailablePort()
    baseUrl = `http://127.0.0.1:${port}`
    server = spawn("node", ["server/index.mjs"], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        NODE_ENV: "test",
        AUTH_TEST_MEMORY: "true",
        OTP_SECRET: "test-secret-with-more-than-32-characters",
        PORT: String(port),
      },
      stdio: ["ignore", "pipe", "pipe"],
    })
    server.stdout.setEncoding("utf8").on("data", (chunk) => {
      serverOutput += chunk
    })
    server.stderr.setEncoding("utf8").on("data", (chunk) => {
      serverOutput += chunk
    })

    await waitForServer(`${baseUrl}/api/health`)
  })

  after(async () => {
    if (!server || server.exitCode !== null) return
    server.kill("SIGTERM")
    await once(server, "exit")
  })

  it("returns the health response with a valid timestamp", async () => {
    const { response, data } = await requestJson("/api/health")

    assert.equal(response.status, 200)
    assert.equal(data.status, "ok")
    assert.equal(data.service, "ops-backend")
    assert.ok(Number.isFinite(Date.parse(data.time)))
  })

  it("rejects the old fixed demo login", async () => {
    const { response, data } = await requestJson(
      "/api/auth/login",
      jsonRequest({ phone: "99128044", code: "123456" }),
    )

    assert.equal(response.status, 400)
    assert.equal(data.message, "Имэйл, нууц үгээ оруулна уу.")
  })

  it("returns the complete equipment list with unique identifiers", async () => {
    const { response, data } = await requestJson("/api/equipment")
    const ids = data.map((item) => item.id)

    assert.equal(response.status, 200)
    assert.equal(data.length, 5)
    assert.equal(new Set(ids).size, ids.length)
    for (const item of data) {
      assert.ok(item.id)
      assert.ok(item.name)
      assert.ok(item.model)
      assert.ok(item.status)
      assert.ok(item.location)
      assert.ok(item.telemetry)
      assert.equal(typeof item.live, "boolean")
      assert.equal(item.telemetry.temperature, null)
      assert.equal(item.telemetry.vibration, null)
      assert.equal(item.telemetry.rpm, null)
      assert.equal(item.live, false)
      assert.equal(item.photoUrl, null)
    }
  })

  it("does not return fabricated mixer temperature or monitoring alerts", async () => {
    const equipment = await requestJson("/api/equipment/MIX-4993")
    const alerts = await requestJson("/api/alerts")

    assert.equal(equipment.data.telemetry.temperature, null)
    assert.deepEqual(alerts.data, [])
  })

  it("requires authentication for equipment photo uploads", async () => {
    const response = await fetch(`${baseUrl}/api/equipment/GEN-0162/photo`, {
      method: "POST",
      headers: { "Content-Type": "image/png" },
      body: Buffer.from("not-an-image"),
    })
    const data = await response.json()

    assert.equal(response.status, 401)
    assert.equal(data.message, "Нэвтэрч зураг оруулна уу.")
  })

  // Жагсаалтад буй төхөөрөмж бүрийн дэлгэрэнгүй API тухайн бичлэгийг яг буцаана.
  const equipmentIds = [
    "DRL-UB-0247",
    "GEN-0162",
    "MIX-4993",
    "EXC-0914",
    "TLS-1318",
  ]
  for (const id of equipmentIds) {
    it(`returns equipment details matching the list for ${id}`, async () => {
      const list = await requestJson("/api/equipment")
      const detail = await requestJson(`/api/equipment/${id}`)
      const listedItem = list.data.find((item) => item.id === id)

      assert.equal(detail.response.status, 200)
      assert.ok(listedItem)
      assert.deepEqual(detail.data, listedItem)
    })
  }

  // Хоосон болон үл мэдэгдэх ID-гаар төхөөрөмж хайхад 404 буцаана.
  for (const id of ["not-found", "UNKNOWN-0000"]) {
    it(`returns a localized 404 for unknown equipment ${id}`, async () => {
      const { response, data } = await requestJson(`/api/equipment/${id}`)

      assert.equal(response.status, 404)
      assert.deepEqual(data, { message: "Төхөөрөмж олдсонгүй" })
    })
  }

  it("returns dashboard collections consistent with their dedicated endpoints", async () => {
    const dashboard = await requestJson("/api/dashboard")
    const equipment = await requestJson("/api/equipment")
    const alerts = await requestJson("/api/alerts")
    const notifications = await requestJson("/api/notifications")

    assert.equal(dashboard.response.status, 200)
    assert.deepEqual(dashboard.data.equipment, equipment.data)
    assert.deepEqual(dashboard.data.alerts, alerts.data)
    assert.deepEqual(dashboard.data.notifications, notifications.data)
    assert.ok(dashboard.data.summary.totalEquipment >= equipment.data.length)
    assert.ok(dashboard.data.summary.alerts >= alerts.data.length)
    assert.ok(dashboard.data.supportTeam.length > 0)
  })

  it("returns dashboard summary fields with expected value types", async () => {
    const { data } = await requestJson("/api/dashboard")
    const { summary } = data

    assert.equal(typeof summary.totalEquipment, "number")
    assert.equal(typeof summary.rentedToday, "number")
    assert.equal(typeof summary.alerts, "number")
    assert.equal(typeof summary.syncSecondsAgo, "string")
    assert.equal(typeof summary.siteName, "string")
    assert.ok(summary.totalEquipment >= 0)
    assert.ok(summary.rentedToday >= 0)
    assert.ok(summary.alerts >= 0)
  })

  it("returns alerts with unique IDs and valid equipment references", async () => {
    const [alertsResult, equipmentResult] = await Promise.all([
      requestJson("/api/alerts"),
      requestJson("/api/equipment"),
    ])
    const ids = alertsResult.data.map((alert) => alert.id)
    const equipmentIds = new Set(equipmentResult.data.map((item) => item.id))

    assert.equal(alertsResult.response.status, 200)
    assert.equal(new Set(ids).size, ids.length)
    for (const alert of alertsResult.data) {
      assert.ok(alert.title)
      assert.ok(equipmentIds.has(alert.equipmentId))
      assert.ok(["high", "warning", "medium", "low"].includes(alert.severity))
      assert.ok(Number.parseFloat(alert.risk) >= 0)
      assert.ok(alert.description)
      assert.ok(alert.location)
    }
  })

  it("returns notifications with unique IDs and supported types", async () => {
    const { response, data } = await requestJson("/api/notifications")
    const ids = data.map((notification) => notification.id)

    assert.equal(response.status, 200)
    assert.equal(new Set(ids).size, ids.length)
    assert.equal(data.length, 3)
    for (const notification of data) {
      assert.ok(notification.title)
      assert.ok(notification.meta)
      assert.ok(notification.createdAt)
      assert.ok(
        ["alert", "calendar", "success", "warning"].includes(notification.type),
      )
    }
  })

  it("accepts a support request and returns its submitted fields", async () => {
    const requestBody = {
      message: "Төхөөрөмжийн тусламж хэрэгтэй",
      team: "tech-support",
    }
    const { response, data } = await requestJson(
      "/api/support",
      jsonRequest(requestBody),
    )

    assert.equal(response.status, 200)
    assert.equal(data.ok, true)
    assert.equal(data.message, requestBody.message)
    assert.equal(data.team, requestBody.team)
    assert.equal(data.ticketId, "A-8842")
    assert.ok(Number.isFinite(Date.parse(data.updatedAt)))
  })

  // Тусламжийн хүсэлтэд нэг талбар орхигдоход нөгөөг хадгалж, үндсэн утга хэрэглэнэ.
  for (const [name, body, expectedMessage, expectedTeam] of [
    ["empty object", {}, "Тусламжийн хүсэлт илгээгдлээ", "support"],
    [
      "missing message",
      { team: "maintenance" },
      "Тусламжийн хүсэлт илгээгдлээ",
      "maintenance",
    ],
    [
      "missing team",
      { message: "Need a technician" },
      "Need a technician",
      "support",
    ],
    ["empty message", { message: "", team: "support" }, "", "support"],
    ["empty team", { message: "Need help", team: "" }, "Need help", ""],
  ]) {
    it(`handles support defaults for ${name}`, async () => {
      const { response, data } = await requestJson(
        "/api/support",
        jsonRequest(body),
      )

      assert.equal(response.status, 200)
      assert.equal(data.ok, true)
      assert.equal(data.message, expectedMessage)
      assert.equal(data.team, expectedTeam)
      assert.equal(data.ticketId, "A-8842")
    })
  }

  it("rejects a primitive JSON body through the JSON parser", async () => {
    const response = await fetch(`${baseUrl}/api/support`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "null",
    })

    assert.equal(response.status, 400)
  })

  it("returns JSON content type for API responses", async () => {
    const response = await fetch(`${baseUrl}/api/health`)

    assert.match(response.headers.get("content-type"), /application\/json/)
  })

  it("does not expose the Express signature header", async () => {
    const response = await fetch(`${baseUrl}/api/health`)

    assert.equal(response.headers.get("x-powered-by"), null)
  })

  it("returns 404 for an unknown API route", async () => {
    const response = await fetch(`${baseUrl}/api/not-a-route`)

    assert.equal(response.status, 404)
  })

  it("supports local registration and app data without external services", async () => {
    const port = await getAvailablePort()
    const localBaseUrl = `http://127.0.0.1:${port}`
    let localOutput = ""
    const env = {
      ...process.env,
      NODE_ENV: "development",
      LOCAL_AUTH_MEMORY: "true",
      PORT: String(port),
    }
    for (const key of [
      "AUTH_TEST_MEMORY",
      "DATABASE_URL",
      "OTP_SECRET",
      "SMTP_USER",
      "SMTP_PASS",
    ]) {
      delete env[key]
    }

    const localServer = spawn("node", ["server/index.mjs"], {
      cwd: process.cwd(),
      env,
      stdio: ["ignore", "pipe", "pipe"],
    })
    localServer.stdout.setEncoding("utf8").on("data", (chunk) => {
      localOutput += chunk
    })
    localServer.stderr.setEncoding("utf8").on("data", (chunk) => {
      localOutput += chunk
    })

    try {
      const started = Date.now()
      let ready = false
      while (Date.now() - started < 10000) {
        if (localServer.exitCode !== null) {
          throw new Error(`Local backend exited before becoming ready:\n${localOutput}`)
        }
        try {
          const response = await fetch(`${localBaseUrl}/api/health`)
          if (response.ok) {
            ready = true
            break
          }
        } catch {
          await new Promise((resolve) => setTimeout(resolve, 100))
        }
      }
      assert.equal(ready, true, `Local backend did not become ready:\n${localOutput}`)

      const sendJson = (method, route, body, token) => {
        const request = jsonRequest(body)
        return fetch(`${localBaseUrl}${route}`, {
          ...request,
          method,
          headers: {
            ...request.headers,
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        })
      }
      const postJson = (route, body, token) =>
        sendJson("POST", route, body, token)
      const putJson = (route, body, token) =>
        sendJson("PUT", route, body, token)
      const registrationResponse = await postJson(
        "/api/auth/register/request-code",
        {
          name: "Local User",
          company: "",
          phone: "99128044",
          email: "local@example.com",
          password: "local-password",
        },
      )
      const registration = await registrationResponse.json()
      assert.equal(registrationResponse.status, 200)
      assert.match(registration.developmentCode, /^\d{6}$/)

      const verificationResponse = await postJson(
        "/api/auth/register/verify-code",
        { email: "local@example.com", code: registration.developmentCode },
      )
      const verification = await verificationResponse.json()
      assert.equal(verificationResponse.status, 201)
      let token = verification.session.token

      const location = {
        address: "Local test site",
        coordinates: { latitude: 47.9184, longitude: 106.9177 },
      }
      const locationResponse = await putJson(
        "/api/worksite-location",
        location,
        token,
      )
      assert.equal(locationResponse.status, 200)
      const savedLocationResponse = await fetch(
        `${localBaseUrl}/api/worksite-location`,
        { headers: { Authorization: `Bearer ${token}` } },
      )
      const savedLocation = await savedLocationResponse.json()
      assert.equal(savedLocationResponse.status, 200)
      assert.equal(savedLocation.location.address, location.address)

      const bookingResponse = await postJson(
        "/api/bookings",
        {
          equipmentId: "GEN-0162",
          startDate: "2026-11-17",
          endDate: "2026-11-18",
          startTime: "09:00",
          endTime: "17:00",
          rentalDays: 2,
          worksiteAddress: "Local test site",
          coordinates: { latitude: 47.9184, longitude: 106.9177 },
          notes: "",
        },
        token,
      )
      assert.equal(bookingResponse.status, 201)
      const savedBookingsResponse = await fetch(
        `${localBaseUrl}/api/bookings`,
        { headers: { Authorization: `Bearer ${token}` } },
      )
      const savedBookings = await savedBookingsResponse.json()
      assert.equal(savedBookingsResponse.status, 200)
      assert.equal(savedBookings.items[0].equipmentId, "GEN-0162")

      const equipmentLocationsResponse = await fetch(
        `${localBaseUrl}/api/equipment-locations`,
        { headers: { Authorization: `Bearer ${token}` } },
      )
      assert.equal(equipmentLocationsResponse.status, 200)
      const equipmentLocations = await equipmentLocationsResponse.json()
      assert.deepEqual(equipmentLocations.locations, [])

      const historyResponse = await postJson(
        "/api/search-history",
        { query: "generator" },
        token,
      )
      const history = await historyResponse.json()
      assert.equal(historyResponse.status, 200)
      assert.equal(history.items[0].query, "generator")

      const recoveryResponse = await postJson(
        "/api/auth/forgot-password",
        { email: "local@example.com" },
      )
      const recovery = await recoveryResponse.json()
      assert.equal(recoveryResponse.status, 200)
      assert.match(recovery.developmentCode, /^\d{6}$/)
      const resetResponse = await postJson("/api/auth/reset-password", {
        email: "local@example.com",
        code: recovery.developmentCode,
        password: "updated-local-password",
      })
      assert.equal(resetResponse.status, 200)
      const loginResponse = await postJson("/api/auth/login", {
        email: "local@example.com",
        password: "updated-local-password",
        role: "renter",
      })
      assert.equal(loginResponse.status, 200)
      const login = await loginResponse.json()
      token = login.session.token

      const photoBytes = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      ])
      const photoResponse = await fetch(
        `${localBaseUrl}/api/equipment/GEN-0162/photo`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "image/png",
          },
          body: photoBytes,
        },
      )
      assert.equal(photoResponse.status, 200)
      const savedPhotoResponse = await fetch(
        `${localBaseUrl}/api/equipment/GEN-0162/photo`,
      )
      assert.deepEqual(
        Buffer.from(await savedPhotoResponse.arrayBuffer()),
        photoBytes,
      )
      assert.match(localOutput, /http:\/\/127\.0\.0\.1:/)
    } finally {
      if (localServer.exitCode === null) {
        const exited = once(localServer, "exit")
        localServer.kill("SIGTERM")
        await exited
      }
    }
  })
})
