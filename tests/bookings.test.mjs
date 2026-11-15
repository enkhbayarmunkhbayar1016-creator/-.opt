import assert from "node:assert/strict"
import express from "express"
import { after, before, describe, it } from "node:test"
import {
  initializeBookingStore,
  registerBookingRoutes,
} from "../server/bookings.mjs"

const equipment = [{ id: "DRL-UB-0247", name: "Өрмийн машин D45" }]
const users = new Map([
  ["customer-a-token", { id: "customer-a" }],
  ["customer-b-token", { id: "customer-b" }],
])
let server
let baseUrl

const request = async (path, token, options = {}) => {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  })
  return { response, data: await response.json() }
}

const validPayload = {
  equipmentId: "DRL-UB-0247",
  startDate: "2026-11-20",
  endDate: "2026-11-22",
  startTime: "08:00",
  endTime: "18:00",
  rentalDays: 2,
  worksiteAddress: "Улаанбаатар, Сүхбаатар дүүрэг",
  coordinates: { latitude: 47.9184, longitude: 106.9177 },
  notes: "Баруун хаалгаар оруулна уу",
}

describe("Booking API", { concurrency: false }, () => {
  before(async () => {
    const app = express()
    app.use(express.json())
    registerBookingRoutes(app, {
      authStore: {
        async findUserBySessionToken(token) {
          return users.get(token) ?? null
        },
      },
      equipment,
      pool: null,
      testMemoryStore: true,
    })
    server = app.listen(0, "127.0.0.1")
    await new Promise((resolve) => server.once("listening", resolve))
    baseUrl = `http://127.0.0.1:${server.address().port}`
  })

  after(async () => {
    if (server)
      await new Promise((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      )
  })

  it("authenticates and stores each customer's saved worksite location", async () => {
    const unauthenticated = await request("/api/worksite-location")
    assert.equal(unauthenticated.response.status, 401)

    const missingPin = await request(
      "/api/worksite-location",
      "customer-a-token",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: validPayload.worksiteAddress,
          coordinates: null,
        }),
      },
    )
    assert.equal(missingPin.response.status, 400)

    const savedLocation = await request(
      "/api/worksite-location",
      "customer-a-token",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: validPayload.worksiteAddress,
          coordinates: validPayload.coordinates,
        }),
      },
    )
    assert.equal(savedLocation.response.status, 200)
    assert.equal(
      savedLocation.data.location.address,
      validPayload.worksiteAddress,
    )
    assert.deepEqual(
      savedLocation.data.location.coordinates,
      validPayload.coordinates,
    )

    const loadedLocation = await request(
      "/api/worksite-location",
      "customer-a-token",
    )
    assert.deepEqual(
      loadedLocation.data.location.coordinates,
      validPayload.coordinates,
    )
    assert.equal(
      loadedLocation.data.location.address,
      validPayload.worksiteAddress,
    )
    const otherCustomerLocation = await request(
      "/api/worksite-location",
      "customer-b-token",
    )
    assert.equal(otherCustomerLocation.data.location, null)
  })

  it("validates and saves booking details including the selected worksite", async () => {
    const unauthenticated = await request("/api/bookings", undefined, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validPayload),
    })
    assert.equal(unauthenticated.response.status, 401)

    const missingPin = await request("/api/bookings", "customer-a-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...validPayload, coordinates: null }),
    })
    assert.equal(missingPin.response.status, 400)
    assert.match(missingPin.data.message, /pin/)

    const invalidDate = await request("/api/bookings", "customer-a-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...validPayload, startDate: "2026-02-31" }),
    })
    assert.equal(invalidDate.response.status, 400)

    const created = await request("/api/bookings", "customer-a-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validPayload),
    })
    assert.equal(created.response.status, 201)
    assert.equal(
      created.data.booking.worksiteAddress,
      validPayload.worksiteAddress,
    )
    assert.deepEqual(created.data.booking.coordinates, validPayload.coordinates)
    assert.equal(created.data.booking.equipmentName, "Өрмийн машин D45")
    assert.equal(created.data.booking.status, "requested")

    const ownBookings = await request("/api/bookings", "customer-a-token")
    assert.equal(ownBookings.data.items.length, 1)
    assert.equal(
      ownBookings.data.items[0].worksiteAddress,
      validPayload.worksiteAddress,
    )
    assert.deepEqual(
      ownBookings.data.items[0].coordinates,
      validPayload.coordinates,
    )

    const anotherCustomer = await request("/api/bookings", "customer-b-token")
    assert.deepEqual(anotherCustomer.data.items, [])
  })

  it("initializes a constrained booking table with a per-user index", async () => {
    let schema = ""
    await initializeBookingStore({
      async query(sql) {
        schema = sql
      },
    })
    assert.match(schema, /CREATE TABLE IF NOT EXISTS equipment_bookings/)
    assert.match(schema, /CREATE TABLE IF NOT EXISTS worksite_locations/)
    assert.match(schema, /REFERENCES users\(id\) ON DELETE CASCADE/)
    assert.match(schema, /latitude BETWEEN -90 AND 90/)
    assert.match(schema, /longitude BETWEEN -180 AND 180/)
    assert.match(
      schema,
      /CREATE INDEX IF NOT EXISTS equipment_bookings_user_created_idx/,
    )
  })
})
