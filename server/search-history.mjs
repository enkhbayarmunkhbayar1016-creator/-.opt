import { requireAuthenticatedUser } from "./auth-middleware.mjs"

const historyLimit = 20
const maxQueryLength = 120

const validateQuery = (value) => {
  if (typeof value !== "string") return null
  const query = value.trim()
  return query.length > 0 && query.length <= maxQueryLength ? query : null
}

export const registerSearchHistoryRoutes = (
  app,
  { pool, authStore, memoryStore = false },
) => {
  const memoryHistory = new Map()
  const requireUser = requireAuthenticatedUser(authStore)

  app.get("/api/search-history", requireUser, async (req, res, next) => {
    try {
      if (pool) {
        const result = await pool.query(
          `SELECT query, searched_at AS "searchedAt"
           FROM search_history
           WHERE user_id = $1
           ORDER BY searched_at DESC, id DESC
           LIMIT $2`,
          [req.authenticatedUser.id, historyLimit],
        )
        return res.json({ items: result.rows })
      }
      if (memoryStore) {
        return res.json({
          items: memoryHistory.get(req.authenticatedUser.id) ?? [],
        })
      }
      return res
        .status(503)
        .json({ message: "Хайлтын түүхийн сан тохируулагдаагүй байна." })
    } catch (error) {
      return next(error)
    }
  })

  app.post("/api/search-history", requireUser, async (req, res, next) => {
    const query = validateQuery(req.body?.query)
    if (!query) {
      return res.status(400).json({
        message: `Хайлтын үг 1-${maxQueryLength} тэмдэгт байх ёстой.`,
      })
    }

    try {
      if (pool) {
        const client = await pool.connect()
        try {
          await client.query("BEGIN")
          await client.query("SELECT id FROM users WHERE id = $1 FOR UPDATE", [
            req.authenticatedUser.id,
          ])
          await client.query(
            "INSERT INTO search_history (user_id, query) VALUES ($1, $2)",
            [req.authenticatedUser.id, query],
          )
          await client.query(
            `DELETE FROM search_history
             WHERE id IN (
               SELECT id FROM (
                 SELECT id, ROW_NUMBER() OVER (
                   ORDER BY searched_at DESC, id DESC
                 ) AS position
                 FROM search_history
                 WHERE user_id = $1
               ) ranked
               WHERE position > $2
             )`,
            [req.authenticatedUser.id, historyLimit],
          )
          const result = await client.query(
            `SELECT query, searched_at AS "searchedAt"
             FROM search_history
             WHERE user_id = $1
             ORDER BY searched_at DESC, id DESC
             LIMIT $2`,
            [req.authenticatedUser.id, historyLimit],
          )
          await client.query("COMMIT")
          return res.json({ items: result.rows })
        } catch (error) {
          await client.query("ROLLBACK")
          throw error
        } finally {
          client.release()
        }
      }
      if (memoryStore) {
        const items = memoryHistory.get(req.authenticatedUser.id) ?? []
        items.unshift({ query, searchedAt: new Date().toISOString() })
        items.length = Math.min(items.length, historyLimit)
        memoryHistory.set(req.authenticatedUser.id, items)
        return res.json({ items })
      }
      return res
        .status(503)
        .json({ message: "Хайлтын түүхийн сан тохируулагдаагүй байна." })
    } catch (error) {
      return next(error)
    }
  })

  app.delete("/api/search-history", requireUser, async (req, res, next) => {
    try {
      if (pool) {
        await pool.query("DELETE FROM search_history WHERE user_id = $1", [
          req.authenticatedUser.id,
        ])
      } else if (memoryStore) {
        memoryHistory.delete(req.authenticatedUser.id)
      } else {
        return res
          .status(503)
          .json({ message: "Хайлтын түүхийн сан тохируулагдаагүй байна." })
      }
      return res.json({ ok: true })
    } catch (error) {
      return next(error)
    }
  })
}

export const initializeSearchHistoryStore = async (pool) => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS search_history (
      id BIGSERIAL PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      query TEXT NOT NULL CHECK (char_length(query) BETWEEN 1 AND ${maxQueryLength}),
      searched_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS search_history_user_time_idx
      ON search_history(user_id, searched_at DESC, id DESC);
  `)
}
