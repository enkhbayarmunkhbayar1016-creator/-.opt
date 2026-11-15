import assert from "node:assert/strict";
import { once } from "node:events";
import express from "express";
import { after, before, describe, it } from "node:test";
import { registerEquipmentPhotoRoutes } from "../server/equipment-photos.mjs";

const equipment = [{ id: "GEN-0162" }];
const token = "a".repeat(64);
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aF7sAAAAASUVORK5CYII=",
  "base64",
);

describe("equipment photo routes", () => {
  let server;
  let baseUrl;
  let savedPhotos;
  let listEquipmentWithPhotos;

  before(async () => {
    savedPhotos = new Map();
    const app = express();
    const pool = {
      async query(query, parameters = []) {
        if (query.includes("SELECT equipment_id FROM equipment_photos")) {
          return {
            rows: [...savedPhotos.keys()].map((equipmentId) => ({ equipment_id: equipmentId })),
          };
        }
        if (query.includes("SELECT mime_type, image_data FROM equipment_photos")) {
          const photo = savedPhotos.get(parameters[0]);
          return {
            rows: photo
              ? [{ mime_type: photo.mimeType, image_data: photo.imageData }]
              : [],
          };
        }
        if (query.includes("INSERT INTO equipment_photos")) {
          savedPhotos.set(parameters[0], {
            mimeType: parameters[1],
            imageData: parameters[2],
          });
          return { rows: [] };
        }
        throw new Error(`Unexpected photo-store query: ${query}`);
      },
    };
    const { equipmentWithPhotoUrls } = registerEquipmentPhotoRoutes(app, {
      equipment,
      pool,
      authStore: {
        async findUserBySessionToken(value) {
          return value === token ? { id: "manager-1", role: "manager" } : null;
        },
      },
    });
    listEquipmentWithPhotos = equipmentWithPhotoUrls;
    server = app.listen(0, "127.0.0.1");
    await once(server, "listening");
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  after(async () => {
    server.close();
    await once(server, "close");
  });

  it("requires a valid login before accepting photo uploads", async () => {
    const response = await fetch(`${baseUrl}/api/equipment/GEN-0162/photo`, {
      method: "POST",
      headers: { "Content-Type": "image/png" },
      body: png,
    });

    assert.equal(response.status, 401);
  });

  it("rejects unsupported image media types", async () => {
    const response = await fetch(`${baseUrl}/api/equipment/GEN-0162/photo`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/octet-stream",
      },
      body: png,
    });

    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), {
      message: "JPG, PNG эсвэл WebP зураг сонгоно уу.",
    });
  });

  it("persists an uploaded image and serves it to the catalog", async () => {
    const response = await fetch(`${baseUrl}/api/equipment/GEN-0162/photo`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "image/png",
      },
      body: png,
    });

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      ok: true,
      equipmentId: "GEN-0162",
      photoUrl: "/api/equipment/GEN-0162/photo",
    });

    const [listedEquipment] = await listEquipmentWithPhotos(equipment);
    assert.equal(listedEquipment.photoUrl, "/api/equipment/GEN-0162/photo");

    const photoResponse = await fetch(`${baseUrl}${listedEquipment.photoUrl}`);
    assert.equal(photoResponse.status, 200);
    assert.equal(photoResponse.headers.get("content-type"), "image/png");
    assert.equal(photoResponse.headers.get("x-content-type-options"), "nosniff");
    assert.deepEqual(Buffer.from(await photoResponse.arrayBuffer()), png);
  });
});
