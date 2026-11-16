import assert from "node:assert/strict";
import { once } from "node:events";
import express from "express";
import { createServer } from "node:http";
import { after, before, describe, it } from "node:test";
import { registerAuthRoutes } from "../server/auth-routes.mjs";
import { createMemoryAuthStore } from "../server/auth-store.mjs";

process.env.OTP_SECRET ??= "test-secret-with-more-than-32-characters";

describe("email-code authentication flow", () => {
  let server;
  let baseUrl;
  let sentEmail;
  let authStore;

  before(async () => {
    const app = express();
    app.use(express.json());
    authStore = createMemoryAuthStore();
    registerAuthRoutes(app, {
      store: authStore,
      exposeVerificationCode: true,
      sendVerificationCode: async (email, code, purpose) => {
        sentEmail = { email, code, purpose };
      },
    });
    server = createServer(app);
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  after(async () => {
    server.close();
    await once(server, "close");
  });

  const post = async (route, body) => {
    const response = await fetch(`${baseUrl}${route}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return { response, data: await response.json() };
  };

  it("verifies registration and supports email-code password recovery", async () => {
    const registrationRequest = await post(
      "/api/auth/register/request-code",
      {
        name: "Test User",
        company: "",
        phone: "+976 9912-8044",
        email: "TEST@example.com",
        password: "original-password",
      },
    );
    assert.equal(registrationRequest.response.status, 200);
    assert.equal(sentEmail.email, "test@example.com");
    assert.equal(sentEmail.purpose, "register");
    assert.match(sentEmail.code, /^\d{6}$/);
    assert.equal(registrationRequest.data.developmentCode, sentEmail.code);

    const registration = await post("/api/auth/register/verify-code", {
      email: "test@example.com",
      code: sentEmail.code,
    });
    assert.equal(registration.response.status, 201);
    assert.equal(registration.data.user.company, "Хувь хэрэглэгч");
    assert.equal(registration.data.user.role, "renter");
    assert.equal("passwordHash" in registration.data.user, false);

    const badLogin = await post("/api/auth/login", {
      email: "test@example.com",
      password: "incorrect-password",
    });
    assert.equal(badLogin.response.status, 401);

    const login = await post("/api/auth/login", {
      email: "test@example.com",
      password: "original-password",
      role: "renter",
    });
    assert.equal(login.response.status, 200);
    assert.equal(login.data.user.id, registration.data.user.id);
    assert.deepEqual(
      await authStore.findUserBySessionToken(login.data.session.token),
      { id: registration.data.user.id, role: "renter" },
    );

    const unknownEmail = await post("/api/auth/forgot-password", {
      email: "unknown@example.com",
    });
    const forgotPassword = await post("/api/auth/forgot-password", {
      email: "TEST@example.com",
    });
    assert.equal(unknownEmail.response.status, 200);
    assert.equal(unknownEmail.data.developmentCode, undefined);
    assert.equal(forgotPassword.data.message, unknownEmail.data.message);
    assert.equal(sentEmail.email, "test@example.com");
    assert.equal(sentEmail.purpose, "reset-password");
    assert.equal(forgotPassword.data.developmentCode, sentEmail.code);

    const resetCode = sentEmail.code;
    const reset = await post("/api/auth/reset-password", {
      email: "test@example.com",
      code: resetCode,
      password: "replacement-password",
    });
    assert.equal(reset.response.status, 200);
    assert.equal(
      (
        await post("/api/auth/reset-password", {
          email: "test@example.com",
          code: resetCode,
          password: "another-password",
        })
      ).response.status,
      400,
    );
    assert.equal(
      (
        await post("/api/auth/login", {
          email: "test@example.com",
          password: "original-password",
        })
      ).response.status,
      401,
    );
    assert.equal(
      (
        await post("/api/auth/login", {
          email: "test@example.com",
          password: "replacement-password",
        })
      ).response.status,
      200,
    );
  });

  it("rejects malformed, short-password, incorrect-code, and duplicate requests", async () => {
    const shortPassword = await post("/api/auth/register/request-code", {
      name: "Test User",
      company: "Example Co",
      phone: "99128044",
      email: "short@example.com",
      password: "123",
    });
    assert.equal(shortPassword.response.status, 400);

    const account = {
      name: "Test User",
      company: "Example Co",
      phone: "99128044",
      email: "duplicate@example.com",
      password: "long-enough-password",
    };
    assert.equal(
      (
        await post("/api/auth/register/request-code", account)
      ).response.status,
      200,
    );
    const wrongCode = await post("/api/auth/register/verify-code", {
      email: account.email,
      code: "111111",
    });
    assert.equal(wrongCode.response.status, 400);
    const correctCode = await post("/api/auth/register/verify-code", {
      email: account.email,
      code: sentEmail.code,
    });
    assert.equal(correctCode.response.status, 201);
    assert.equal(
      (
        await post("/api/auth/register/request-code", account)
      ).response.status,
      409,
    );
  });
});
