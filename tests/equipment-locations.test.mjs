import assert from "node:assert/strict"
import { once } from "node:events"
import express from "express"
import { after, before, describe, it } from "node:test"
import { registerEquipmentLocationRoutes } from "../server/equipment-locations.mjs"

const equipment = [{ id: "GEN-0162", name: "Генератор 150 кВА" }]
const managerToken = "manager-token"
const renterToken = "renter-token"

describe("equipment location routes", () => {
  let server
  let baseUrl

  before(async () => {
    const app = express()
    app.use(express.json())
    registerEquipmentLocationRoutes(app, {
      equipment,
      memoryStore: true,
      authStore: {
        async findUserBySessionToken(token) {
          if (token === managerToken)
            return { id: "manager-1", role: "manager" }
          if (token === renterToken) return { id: "renter-1", role: "renter" }
          return null
        },
      },
    })
    server = app.listen(0, "127.0.0.1")
    await once(server, "listening")
    baseUrl = `http://127.0.0.1:${server.address().port}`
  })

  after(async () => {
    server.close()
    await once(server, "close")
  })

  const request = (path, token, body) =>
    fetch(`${baseUrl}${path}`, {
      method: body ? "PUT" : "GET",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })

  it("authenticates location reads and only lets staff update equipment pins", async () => {
    assert.equal((await request("/api/equipment-locations")).status, 401)
    assert.equal(
      (
        await request("/api/equipment/GEN-0162/location", renterToken, {
          address: "Сүхбаатарын талбай",
          coordinates: { latitude: 47.9184, longitude: 106.9177 },
        })
      ).status,
      403,
    )

    const response = await request(
      "/api/equipment/GEN-0162/location",
      managerToken,
      {
        address: "Сүхбаатарын талбай",
        coordinates: { latitude: 47.9184, longitude: 106.9177 },
      },
    )
    assert.equal(response.status, 200)
    const saved = (await response.json()).location
    const { updatedAt, ...savedLocation } = saved
    assert.deepEqual(savedLocation, {
      equipmentId: "GEN-0162",
      address: "Сүхбаатарын талбай",
      coordinates: { latitude: 47.9184, longitude: 106.9177 },
    })
    assert.ok(Number.isFinite(Date.parse(updatedAt)))
  })

  it("returns saved equipment pins and validates IDs and coordinates", async () => {
    const listResponse = await request("/api/equipment-locations", renterToken)
    assert.equal(listResponse.status, 200)
    const { locations } = await listResponse.json()
    assert.equal(locations.length, 1)
    const { updatedAt, ...savedLocation } = locations[0]
    assert.deepEqual(savedLocation, {
      equipmentId: "GEN-0162",
      address: "Сүхбаатарын талбай",
      coordinates: { latitude: 47.9184, longitude: 106.9177 },
    })
    assert.ok(Number.isFinite(Date.parse(updatedAt)))

    const invalid = await request(
      "/api/equipment/GEN-0162/location",
      managerToken,
      { address: "Missing coordinates", coordinates: null },
    )
    assert.equal(invalid.status, 400)
    const unknown = await request(
      "/api/equipment/UNKNOWN/location",
      managerToken,
      {
        address: "Somewhere",
        coordinates: { latitude: 47, longitude: 106 },
      },
    )
    assert.equal(unknown.status, 404)
  })
})
