import assert from "node:assert/strict"
import express from "express"
import { after, before, describe, it } from "node:test"
import {
  initializeSearchHistoryStore,
  registerSearchHistoryRoutes,
} from "../server/search-history.mjs"

const userByToken = new Map([
  ["user-a-token", { id: "user-a" }],
  ["user-b-token", { id: "user-b" }],
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
  return {
    response,
    data: response.status === 204 ? null : await response.json(),
  }
}

describe("Search history API", { concurrency: false }, () => {
  before(async () => {
    const app = express()
    app.use(express.json())
    registerSearchHistoryRoutes(app, {
      authStore: {
        async findUserBySessionToken(token) {
          return userByToken.get(token) ?? null
        },
      },
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

  it("requires a valid user session and isolates, limits, and clears history per user", async () => {
    const unauthenticated = await request("/api/search-history")
    assert.equal(unauthenticated.response.status, 401)

    const invalidSession = await request("/api/search-history", "invalid-token")
    assert.equal(invalidSession.response.status, 401)

    const invalidQuery = await request("/api/search-history", "user-a-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: "   " }),
    })
    assert.equal(invalidQuery.response.status, 400)

    const tooLongQuery = await request("/api/search-history", "user-a-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: "x".repeat(121) }),
    })
    assert.equal(tooLongQuery.response.status, 400)

    for (let index = 0; index < 21; index += 1) {
      const saved = await request("/api/search-history", "user-a-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: `search-${index}` }),
      })
      assert.equal(saved.response.status, 200)
    }

    const userAHistory = await request("/api/search-history", "user-a-token")
    assert.equal(userAHistory.data.items.length, 20)
    assert.equal(userAHistory.data.items[0].query, "search-20")
    assert.equal(userAHistory.data.items.at(-1).query, "search-1")

    const userBHistory = await request("/api/search-history", "user-b-token")
    assert.deepEqual(userBHistory.data.items, [])

    const cleared = await request("/api/search-history", "user-a-token", {
      method: "DELETE",
    })
    assert.deepEqual(cleared.data, { ok: true })
    const afterClear = await request("/api/search-history", "user-a-token")
    assert.deepEqual(afterClear.data.items, [])
    assert.deepEqual(
      (await request("/api/search-history", "user-b-token")).data.items,
      [],
    )
  })

  it("uses a bounded per-user PostgreSQL transaction and initializes its table", async () => {
    const commands = []
    let released = false
    const client = {
      async query(sql, params = []) {
        commands.push({ sql, params })
        if (sql.includes('SELECT query, searched_at AS "searchedAt"')) {
          return {
            rows: [
              {
                query: "generator",
                searchedAt: "2026-04-02T10:00:00.000Z",
              },
            ],
          }
        }
        return { rows: [] }
      },
      release() {
        released = true
      },
    }
    const app = express()
    app.use(express.json())
    registerSearchHistoryRoutes(app, {
      authStore: {
        async findUserBySessionToken(token) {
          return userByToken.get(token) ?? null
        },
      },
      pool: {
        async connect() {
          return client
        },
      },
    })
    const databaseServer = app.listen(0, "127.0.0.1")
    await new Promise((resolve) => databaseServer.once("listening", resolve))

    try {
      const response = await fetch(
        `http://127.0.0.1:${databaseServer.address().port}/api/search-history`,
        {
          method: "POST",
          headers: {
            Authorization: "Bearer user-a-token",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query: "generator" }),
        },
      )
      const data = await response.json()

      assert.equal(response.status, 200)
      assert.equal(data.items[0].query, "generator")
      assert.equal(commands[0].sql, "BEGIN")
      assert.match(commands[1].sql, /FOR UPDATE/)
      assert.match(commands[3].sql, /ROW_NUMBER/)
      assert.equal(commands.at(-1).sql, "COMMIT")
      assert.deepEqual(commands[1].params, ["user-a"])
      assert.deepEqual(commands[2].params, ["user-a", "generator"])
      assert.equal(released, true)
    } finally {
      await new Promise((resolve, reject) =>
        databaseServer.close((error) => (error ? reject(error) : resolve())),
      )
    }

    let schema = ""
    await initializeSearchHistoryStore({
      async query(sql) {
        schema = sql
      },
    })
    assert.match(schema, /CREATE TABLE IF NOT EXISTS search_history/)
    assert.match(schema, /REFERENCES users\(id\) ON DELETE CASCADE/)
    assert.match(
      schema,
      /CREATE INDEX IF NOT EXISTS search_history_user_time_idx/,
    )
  })
})
