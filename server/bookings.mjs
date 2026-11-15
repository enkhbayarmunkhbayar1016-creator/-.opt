import crypto from "node:crypto"
import { requireAuthenticatedUser } from "./auth-middleware.mjs"

const validDate = (value) =>
  typeof value === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) &&
  new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value

const validateBooking = (body, equipment) => {
  const equipmentId =
    typeof body?.equipmentId === "string" ? body.equipmentId.trim() : ""
  const item = equipment.find((entry) => entry.id === equipmentId)
  const address =
    typeof body?.worksiteAddress === "string" ? body.worksiteAddress.trim() : ""
  const notes = typeof body?.notes === "string" ? body.notes.trim() : ""
  const { latitude, longitude } = body?.coordinates ?? {}

  if (!item) return { error: "Төхөөрөмжөө зөв сонгоно уу." }
  if (!address || address.length > 300) {
    return { error: "Ажлын газрын хаягаа 1-300 тэмдэгтээр оруулна уу." }
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
    return { error: "Газрын зураг дээр pin-ээр ажлын байршлаа сонгоно уу." }
  }
  if (
    !validDate(body?.startDate) ||
    !validDate(body?.endDate) ||
    body.endDate < body.startDate
  ) {
    return { error: "Түрээсийн эхлэх, дуусах огноог зөв сонгоно уу." }
  }
  if (
    typeof body?.startTime !== "string" ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(body.startTime) ||
    typeof body?.endTime !== "string" ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(body.endTime)
  ) {
    return { error: "Эхлэх болон дуусах цагийг зөв сонгоно уу." }
  }
  if (notes.length > 1000) {
    return { error: "Нэмэлт тайлбар 1000 тэмдэгтээс хэтэрч болохгүй." }
  }

  const rentalDays = Number(body.rentalDays)
  if (!Number.isInteger(rentalDays) || rentalDays < 1 || rentalDays > 365) {
    return { error: "Түрээсийн хоногийг зөв оруулна уу." }
  }

  return {
    booking: {
      equipmentId,
      equipmentName: item.name,
      startDate: body.startDate,
      endDate: body.endDate,
      startTime: body.startTime,
      endTime: body.endTime,
      rentalDays,
      worksiteAddress: address,
      coordinates: { latitude, longitude },
      notes,
    },
  }
}

export const registerBookingRoutes = (
  app,
  { pool, authStore, equipment, testMemoryStore = false },
) => {
  const requireUser = requireAuthenticatedUser(authStore)
  const memoryBookings = new Map()
  const memoryLocations = new Map()

  app.get("/api/worksite-location", requireUser, async (req, res, next) => {
    try {
      if (pool) {
        const result = await pool.query(
          `SELECT address, latitude, longitude, updated_at AS "updatedAt"
           FROM worksite_locations WHERE user_id = $1`,
          [req.authenticatedUser.id],
        )
        const row = result.rows[0]
        return res.json({
          location: row
            ? {
                address: row.address,
                coordinates: {
                  latitude: row.latitude,
                  longitude: row.longitude,
                },
                updatedAt: row.updatedAt,
              }
            : null,
        })
      }
      if (testMemoryStore) {
        return res.json({
          location: memoryLocations.get(req.authenticatedUser.id) ?? null,
        })
      }
      return res
        .status(503)
        .json({ message: "Байршлын сан тохируулагдаагүй байна." })
    } catch (error) {
      return next(error)
    }
  })

  app.put("/api/worksite-location", requireUser, async (req, res, next) => {
    const address =
      typeof req.body?.address === "string" ? req.body.address.trim() : ""
    const { latitude, longitude } = req.body?.coordinates ?? {}
    if (!address || address.length > 300) {
      return res
        .status(400)
        .json({ message: "Ажлын газрын хаягаа 1-300 тэмдэгтээр оруулна уу." })
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
      return res
        .status(400)
        .json({ message: "Газрын зураг дээр pin-ээр байршлаа сонгоно уу." })
    }

    try {
      const location = {
        address,
        coordinates: { latitude, longitude },
        updatedAt: new Date().toISOString(),
      }
      if (pool) {
        const result = await pool.query(
          `INSERT INTO worksite_locations
            (user_id, address, latitude, longitude, updated_at)
           VALUES ($1, $2, $3, $4, NOW())
           ON CONFLICT (user_id) DO UPDATE
           SET address = EXCLUDED.address,
               latitude = EXCLUDED.latitude,
               longitude = EXCLUDED.longitude,
               updated_at = NOW()
           RETURNING address, latitude, longitude, updated_at AS "updatedAt"`,
          [req.authenticatedUser.id, address, latitude, longitude],
        )
        const saved = result.rows[0]
        return res.json({
          location: {
            address: saved.address,
            coordinates: {
              latitude: saved.latitude,
              longitude: saved.longitude,
            },
            updatedAt: saved.updatedAt,
          },
        })
      }
      if (testMemoryStore) {
        memoryLocations.set(req.authenticatedUser.id, location)
        return res.json({ location })
      }
      return res
        .status(503)
        .json({ message: "Байршлын сан тохируулагдаагүй байна." })
    } catch (error) {
      return next(error)
    }
  })

  app.post("/api/bookings", requireUser, async (req, res, next) => {
    const result = validateBooking(req.body, equipment)
    if (result.error) {
      return res.status(400).json({ message: result.error })
    }

    const booking = {
      id: crypto.randomUUID(),
      userId: req.authenticatedUser.id,
      ...result.booking,
      status: "requested",
      createdAt: new Date().toISOString(),
    }

    try {
      if (pool) {
        const saved = await pool.query(
          `INSERT INTO equipment_bookings
            (id, user_id, equipment_id, start_date, end_date, start_time, end_time,
             rental_days, worksite_address, latitude, longitude, notes, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
           RETURNING created_at AS "createdAt"`,
          [
            booking.id,
            booking.userId,
            booking.equipmentId,
            booking.startDate,
            booking.endDate,
            booking.startTime,
            booking.endTime,
            booking.rentalDays,
            booking.worksiteAddress,
            booking.coordinates.latitude,
            booking.coordinates.longitude,
            booking.notes,
            booking.status,
          ],
        )
        booking.createdAt = saved.rows[0].createdAt
      } else if (testMemoryStore) {
        const bookings = memoryBookings.get(booking.userId) ?? []
        bookings.unshift(booking)
        memoryBookings.set(booking.userId, bookings)
      } else {
        return res
          .status(503)
          .json({ message: "Захиалгын сан тохируулагдаагүй байна." })
      }

      return res.status(201).json({ booking })
    } catch (error) {
      return next(error)
    }
  })

  app.get("/api/bookings", requireUser, async (req, res, next) => {
    try {
      if (pool) {
        const result = await pool.query(
          `SELECT id, equipment_id AS "equipmentId", start_date AS "startDate",
                  end_date AS "endDate", start_time AS "startTime", end_time AS "endTime",
                  rental_days AS "rentalDays", worksite_address AS "worksiteAddress",
                  latitude, longitude, notes, status, created_at AS "createdAt"
           FROM equipment_bookings
           WHERE user_id = $1
           ORDER BY created_at DESC
           LIMIT 50`,
          [req.authenticatedUser.id],
        )
        return res.json({
          items: result.rows.map(({ latitude, longitude, ...booking }) => ({
            ...booking,
            coordinates: { latitude, longitude },
          })),
        })
      }
      if (testMemoryStore) {
        return res.json({
          items: memoryBookings.get(req.authenticatedUser.id) ?? [],
        })
      }
      return res
        .status(503)
        .json({ message: "Захиалгын сан тохируулагдаагүй байна." })
    } catch (error) {
      return next(error)
    }
  })
}

export const initializeBookingStore = async (pool) => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS worksite_locations (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      address TEXT NOT NULL CHECK (char_length(address) BETWEEN 1 AND 300),
      latitude DOUBLE PRECISION NOT NULL CHECK (latitude BETWEEN -90 AND 90),
      longitude DOUBLE PRECISION NOT NULL CHECK (longitude BETWEEN -180 AND 180),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS equipment_bookings (
      id UUID PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      equipment_id TEXT NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      start_time TIME NOT NULL,
      end_time TIME NOT NULL,
      rental_days INTEGER NOT NULL CHECK (rental_days BETWEEN 1 AND 365),
      worksite_address TEXT NOT NULL CHECK (char_length(worksite_address) BETWEEN 1 AND 300),
      latitude DOUBLE PRECISION NOT NULL CHECK (latitude BETWEEN -90 AND 90),
      longitude DOUBLE PRECISION NOT NULL CHECK (longitude BETWEEN -180 AND 180),
      notes TEXT NOT NULL DEFAULT '' CHECK (char_length(notes) <= 1000),
      status TEXT NOT NULL DEFAULT 'requested'
        CHECK (status IN ('requested', 'approved', 'rejected', 'completed')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS equipment_bookings_user_created_idx
      ON equipment_bookings(user_id, created_at DESC);
  `)
}
