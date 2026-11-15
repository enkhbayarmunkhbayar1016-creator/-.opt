import { requireAuthenticatedUser } from "./auth-middleware.mjs"

const validateLocation = (body) => {
  const address = typeof body?.address === "string" ? body.address.trim() : ""
  const { latitude, longitude } = body?.coordinates ?? {}
  if (!address || address.length > 300) {
    return { error: "Төхөөрөмжийн байршлын хаяг 1-300 тэмдэгт байх ёстой." }
  }
  if (
    typeof latitude !== "number" ||
    !Number.isFinite(latitude) ||
    latitude < -90 ||
    latitude > 90 ||
    typeof longitude !== "number" ||
    !Number.isFinite(longitude) ||
    longitude < -180 ||
    longitude > 180
  ) {
    return { error: "Газрын зураг дээр төхөөрөмжийн pin-ийг сонгоно уу." }
  }
  return { location: { address, coordinates: { latitude, longitude } } }
}

export const registerEquipmentLocationRoutes = (
  app,
  { pool, authStore, equipment, testMemoryStore = false },
) => {
  const requireUser = requireAuthenticatedUser(authStore)
  const memoryLocations = new Map()

  app.get("/api/equipment-locations", requireUser, async (_req, res, next) => {
    try {
      if (pool) {
        const result = await pool.query(
          `SELECT equipment_id AS "equipmentId", address, latitude, longitude,
                  updated_at AS "updatedAt"
           FROM equipment_locations
           ORDER BY equipment_id`,
        )
        return res.json({
          locations: result.rows.map(
            ({ latitude, longitude, ...location }) => ({
              ...location,
              coordinates: { latitude, longitude },
            }),
          ),
        })
      }
      if (testMemoryStore) {
        return res.json({ locations: [...memoryLocations.values()] })
      }
      return res
        .status(503)
        .json({ message: "Төхөөрөмжийн байршлын сан тохируулагдаагүй байна." })
    } catch (error) {
      return next(error)
    }
  })

  app.put(
    "/api/equipment/:id/location",
    requireUser,
    async (req, res, next) => {
      if (!["manager", "fixer"].includes(req.authenticatedUser.role)) {
        return res
          .status(403)
          .json({ message: "Төхөөрөмжийн байршлыг ажилтан шинэчилнэ үү." })
      }

      const item = equipment.find((entry) => entry.id === req.params.id)
      if (!item) {
        return res.status(404).json({ message: "Төхөөрөмж олдсонгүй." })
      }
      const validated = validateLocation(req.body)
      if (validated.error) {
        return res.status(400).json({ message: validated.error })
      }

      try {
        let location
        if (pool) {
          const { address, coordinates } = validated.location
          const result = await pool.query(
            `INSERT INTO equipment_locations
               (equipment_id, address, latitude, longitude, updated_at)
             VALUES ($1, $2, $3, $4, NOW())
             ON CONFLICT (equipment_id) DO UPDATE
             SET address = EXCLUDED.address,
                 latitude = EXCLUDED.latitude,
                 longitude = EXCLUDED.longitude,
                 updated_at = NOW()
             RETURNING equipment_id AS "equipmentId", address, latitude,
                       longitude, updated_at AS "updatedAt"`,
            [item.id, address, coordinates.latitude, coordinates.longitude],
          )
          const [saved] = result.rows
          const { latitude, longitude, ...fields } = saved
          location = {
            ...fields,
            coordinates: { latitude, longitude },
          }
        } else if (testMemoryStore) {
          location = {
            equipmentId: item.id,
            ...validated.location,
            updatedAt: new Date().toISOString(),
          }
          memoryLocations.set(item.id, location)
        } else {
          return res.status(503).json({
            message: "Төхөөрөмжийн байршлын сан тохируулагдаагүй байна.",
          })
        }

        return res.json({ location })
      } catch (error) {
        return next(error)
      }
    },
  )
}

export const initializeEquipmentLocationStore = async (pool) => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS equipment_locations (
      equipment_id TEXT PRIMARY KEY,
      address TEXT NOT NULL CHECK (char_length(address) BETWEEN 1 AND 300),
      latitude DOUBLE PRECISION NOT NULL CHECK (latitude BETWEEN -90 AND 90),
      longitude DOUBLE PRECISION NOT NULL CHECK (longitude BETWEEN -180 AND 180),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
}
