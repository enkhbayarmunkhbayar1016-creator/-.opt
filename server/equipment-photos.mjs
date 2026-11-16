import express from 'express';

const maxEquipmentPhotoBytes = 5 * 1024 * 1024;
const imageBodyParser = express.raw({
  type: ['image/jpeg', 'image/png', 'image/webp'],
  limit: maxEquipmentPhotoBytes,
});

const imageSignatures = (imageData) => ({
  'image/jpeg': imageData?.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])),
  'image/png': imageData
    ?.subarray(0, 8)
    .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  'image/webp':
    imageData?.toString('ascii', 0, 4) === 'RIFF' &&
    imageData?.toString('ascii', 8, 12) === 'WEBP',
});

const requireAuthenticatedUser = (authStore) => (req, res, next) => {
  const authorization = req.get('authorization') ?? '';
  const token = authorization.match(/^Bearer ([\da-f]{64})$/i)?.[1];
  if (!token || !authStore?.findUserBySessionToken) {
    return res.status(401).json({ message: 'Нэвтэрч зураг оруулна уу.' });
  }

  Promise.resolve(authStore.findUserBySessionToken(token))
    .then((user) => {
      if (!user) {
        return res.status(401).json({ message: 'Нэвтрэх хугацаа дууссан байна.' });
      }
      req.authenticatedUser = user;
      return next();
    })
    .catch(next);
};

export const registerEquipmentPhotoRoutes = (
  app,
  { equipment, pool, authStore, memoryStore = false },
) => {
  const uploadedEquipmentPhotos = new Map();

  const getUploadedPhoto = async (equipmentId) => {
    if (pool) {
      const result = await pool.query(
        'SELECT mime_type, image_data FROM equipment_photos WHERE equipment_id = $1',
        [equipmentId],
      );
      return result.rows[0]
        ? {
            mimeType: result.rows[0].mime_type,
            imageData: result.rows[0].image_data,
          }
        : null;
    }
    return uploadedEquipmentPhotos.get(equipmentId) ?? null;
  };

  const equipmentWithPhotoUrls = async (items) => {
    const photoIds = pool
      ? new Set(
          (
            await pool.query('SELECT equipment_id FROM equipment_photos')
          ).rows.map((row) => row.equipment_id),
        )
      : new Set(uploadedEquipmentPhotos.keys());

    return items.map((item) => ({
      ...item,
      photoUrl: photoIds.has(item.id)
        ? `/api/equipment/${encodeURIComponent(item.id)}/photo`
        : null,
    }));
  };

  app.get('/api/equipment/:id/photo', async (req, res, next) => {
    if (!equipment.some((item) => item.id === req.params.id)) {
      return res.status(404).json({ message: 'Төхөөрөмж олдсонгүй' });
    }

    try {
      const photo = await getUploadedPhoto(req.params.id);
      if (!photo) {
        return res.status(404).json({ message: 'Төхөөрөмжийн зураг олдсонгүй' });
      }

      res.set({
        'Cache-Control': 'private, no-store',
        'Content-Type': photo.mimeType,
        'X-Content-Type-Options': 'nosniff',
      });
      return res.send(photo.imageData);
    } catch (error) {
      return next(error);
    }
  });

  app.post(
    '/api/equipment/:id/photo',
    requireAuthenticatedUser(authStore),
    imageBodyParser,
    async (req, res, next) => {
      const item = equipment.find((entry) => entry.id === req.params.id);
      if (!item) {
        return res.status(404).json({ message: 'Төхөөрөмж олдсонгүй' });
      }

      const imageData = req.body;
      const mimeType = req.get('content-type');
      if (
        !Buffer.isBuffer(imageData) ||
        imageData.length === 0 ||
        !imageSignatures(imageData)[mimeType]
      ) {
        return res
          .status(400)
          .json({ message: 'JPG, PNG эсвэл WebP зураг сонгоно уу.' });
      }

      try {
        if (pool) {
          await pool.query(
            `INSERT INTO equipment_photos (equipment_id, mime_type, image_data, updated_at)
             VALUES ($1, $2, $3, NOW())
             ON CONFLICT (equipment_id) DO UPDATE
             SET mime_type = EXCLUDED.mime_type,
                 image_data = EXCLUDED.image_data,
                 updated_at = NOW()`,
            [item.id, mimeType, imageData],
          );
        } else if (memoryStore) {
          uploadedEquipmentPhotos.set(item.id, { mimeType, imageData });
        } else {
          return res
            .status(503)
            .json({ message: 'Зураг хадгалах сан тохируулагдаагүй байна.' });
        }

        return res.json({
          ok: true,
          equipmentId: item.id,
          photoUrl: `/api/equipment/${encodeURIComponent(item.id)}/photo`,
        });
      } catch (error) {
        return next(error);
      }
    },
  );

  return { equipmentWithPhotoUrls };
};

export const initializeEquipmentPhotoStore = async (pool) => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS equipment_photos (
      equipment_id TEXT PRIMARY KEY,
      mime_type TEXT NOT NULL CHECK (mime_type IN ('image/jpeg', 'image/png', 'image/webp')),
      image_data BYTEA NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
};
