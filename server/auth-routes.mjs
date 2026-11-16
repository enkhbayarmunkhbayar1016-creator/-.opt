import crypto from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(crypto.scrypt);
const verificationLifetimeMs = 10 * 60 * 1000;
const sessionLifetimeMs = 60 * 60 * 1000;
const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const hashSecret = async (value, salt = crypto.randomBytes(16)) => ({
  salt: salt.toString("hex"),
  hash: (await scrypt(value, salt, 32)).toString("hex"),
});

const hashVerificationCode = (code) => {
  const secret = process.env.OTP_SECRET;
  if (!secret) throw new Error("OTP_SECRET is not configured");
  return crypto.createHmac("sha256", secret).update(code).digest("hex");
};

const verifyPassword = async (password, hash, salt) => {
  const expected = Buffer.from(hash, "hex");
  const actual = await scrypt(password, Buffer.from(salt, "hex"), expected.length);
  return crypto.timingSafeEqual(expected, actual);
};

const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");
const normalizeEmail = (email) => String(email ?? "").trim().toLowerCase();
const normalizePhone = (phone) => String(phone ?? "").replace(/\D/g, "");
const publicUser = ({ id, name, company, phone, email, role }) => ({
  id,
  name,
  company,
  phone,
  email,
  role,
});
const asyncRoute = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

const invalidInput = (res, message) => res.status(400).json({ message });

const generateCode = () => String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");

const createVerification = async (store, email, purpose, payload) => {
  const code = generateCode();
  const codeHash = hashVerificationCode(code);
  const created = await store.createVerificationCode({
    id: crypto.randomUUID(),
    email,
    purpose,
    codeHash,
    payload,
    expiresAt: new Date(Date.now() + verificationLifetimeMs),
  });
  return created ? code : null;
};

const isValidPassword = (password) =>
  typeof password === "string" && password.length >= 8;

export const registerAuthRoutes = (
  app,
  { store, sendVerificationCode, exposeVerificationCode = false },
) => {
  app.post(
    "/api/auth/register/request-code",
    asyncRoute(async (req, res) => {
      const { name, company, phone, email, password } = req.body ?? {};
      const normalizedEmail = normalizeEmail(email);
      const normalizedPhone = normalizePhone(phone);

      if (typeof name !== "string" || name.trim().length < 2) {
        return invalidInput(res, "Нэрээ зөв оруулна уу.");
      }
      if (
        company !== undefined &&
        company !== null &&
        company !== "" &&
        (typeof company !== "string" || company.trim().length < 2)
      ) {
        return invalidInput(res, "Байгууллагын нэрээ зөв оруулна уу.");
      }
      if (!validEmail.test(normalizedEmail)) {
        return invalidInput(res, "Имэйл хаягаа зөв оруулна уу.");
      }
      if (normalizedPhone.length < 7 || normalizedPhone.length > 15) {
        return invalidInput(res, "Утасны дугаараа зөв оруулна уу.");
      }
      if (!isValidPassword(password)) {
        return invalidInput(res, "Нууц үг дор хаяж 8 тэмдэгт байх ёстой.");
      }
      if (typeof sendVerificationCode !== "function") {
        return res.status(503).json({
          message: "Имэйл код илгээх тохиргоо хийгдээгүй байна.",
        });
      }
      if (await store.findUserByEmail(normalizedEmail)) {
        return res.status(409).json({
          message: "Энэ имэйл хаяг бүртгэлтэй байна.",
        });
      }

      const { hash, salt } = await hashSecret(password);
      const code = await createVerification(store, normalizedEmail, "register", {
        id: crypto.randomUUID(),
        name: name.trim(),
        company: typeof company === "string" && company.trim()
          ? company.trim()
          : "Хувь хэрэглэгч",
        phone: normalizedPhone,
        email: normalizedEmail,
        role: "renter",
        passwordHash: hash,
        passwordSalt: salt,
      });
      if (!code) {
        return res.status(429).json({
          message: "Шинэ код авахын өмнө нэг минут хүлээнэ үү.",
        });
      }

      try {
        await sendVerificationCode(normalizedEmail, code, "register");
      } catch (error) {
        console.error("Registration verification email delivery failed", error);
        return res.status(503).json({
          message: "Имэйл код илгээж чадсангүй. Дараа дахин оролдоно уу.",
        });
      }
      return res.json({
        message: exposeVerificationCode
          ? "Баталгаажуулах кодыг доорх талбарт оруулна уу."
          : "Баталгаажуулах 6 оронтой кодыг имэйл рүү илгээлээ.",
        ...(exposeVerificationCode ? { developmentCode: code } : {}),
      });
    }),
  );

  app.post(
    "/api/auth/register/verify-code",
    asyncRoute(async (req, res) => {
      const email = normalizeEmail(req.body?.email);
      const code = String(req.body?.code ?? "");
      if (!validEmail.test(email) || !/^\d{6}$/.test(code)) {
        return invalidInput(res, "Имэйл эсвэл 6 оронтой код буруу байна.");
      }

      const user = await store.registerWithCode({
        email,
        codeHash: hashVerificationCode(code),
      });
      if (!user) {
        return res.status(400).json({
          message: "Код хүчингүй, хугацаа дууссан эсвэл хэт олон удаа оролдсон байна.",
        });
      }

      const session = await createSession(store, user);
      return res.status(201).json({
        message: "Имэйл баталгаажиж, бүртгэл үүслээ.",
        user: publicUser(user),
        session,
      });
    }),
  );

  app.post(
    "/api/auth/login",
    asyncRoute(async (req, res) => {
      const { email, password, role } = req.body ?? {};
      if (typeof email !== "string" || typeof password !== "string") {
        return res.status(400).json({ message: "Имэйл, нууц үгээ оруулна уу." });
      }

      const user = await store.findUserByEmail(normalizeEmail(email));
      const valid =
        user &&
        (await verifyPassword(password, user.passwordHash, user.passwordSalt));
      if (!valid || (role && role !== user.role)) {
        return res.status(401).json({ message: "Имэйл эсвэл нууц үг буруу байна." });
      }

      const session = await createSession(store, user);
      return res.json({
        message: "Амжилттай нэвтэрлээ",
        user: publicUser(user),
        session,
      });
    }),
  );

  app.post(
    "/api/auth/forgot-password",
    asyncRoute(async (req, res) => {
      const email = normalizeEmail(req.body?.email);
      if (!validEmail.test(email)) {
        return invalidInput(res, "Имэйл хаягаа зөв оруулна уу.");
      }
      if (typeof sendVerificationCode !== "function") {
        return res.status(503).json({
          message: "Имэйл код илгээх тохиргоо хийгдээгүй байна.",
        });
      }

      const user = await store.findUserByEmail(email);
      let code;
      if (user) {
        code = await createVerification(
          store,
          email,
          "reset-password",
          null,
        );
        if (!code) {
          return res.status(429).json({
            message: "Шинэ код авахын өмнө нэг минут хүлээнэ үү.",
          });
        }
        try {
          await sendVerificationCode(email, code, "reset-password");
        } catch (error) {
          console.error("Password recovery email delivery failed", error);
          return res.status(503).json({
            message: "Имэйл код илгээж чадсангүй. Дараа дахин оролдоно уу.",
          });
        }
      }

      return res.json({
        message: exposeVerificationCode
          ? "Хэрэв хаяг бүртгэлтэй бол баталгаажуулах кодыг доорх талбарт оруулна уу."
          : "Хэрэв хаяг бүртгэлтэй бол баталгаажуулах код имэйлээр очно.",
        ...(exposeVerificationCode && user ? { developmentCode: code } : {}),
      });
    }),
  );

  app.post(
    "/api/auth/reset-password",
    asyncRoute(async (req, res) => {
      const email = normalizeEmail(req.body?.email);
      const code = String(req.body?.code ?? "");
      const password = req.body?.password;
      if (
        !validEmail.test(email) ||
        !/^\d{6}$/.test(code) ||
        !isValidPassword(password)
      ) {
        return invalidInput(
          res,
          "Имэйл, 6 оронтой код болон 8-аас дээш тэмдэгттэй шинэ нууц үг оруулна уу.",
        );
      }

      const codeHash = hashVerificationCode(code);
      const { hash: passwordHash, salt: passwordSalt } =
        await hashSecret(password);
      const reset = await store.resetPasswordWithCode({
        email,
        codeHash,
        passwordHash,
        passwordSalt,
      });
      if (!reset) {
        return res.status(400).json({
          message: "Код хүчингүй, хугацаа дууссан эсвэл хэт олон удаа оролдсон байна.",
        });
      }

      return res.json({
        message: "Нууц үг шинэчлэгдлээ. Дахин нэвтэрнэ үү.",
      });
    }),
  );
};

const createSession = async (store, user) => {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + sessionLifetimeMs);
  await store.createSession(hashToken(token), user.id, expiresAt);
  return {
    token,
    role: user.role,
    expiresAt: expiresAt.toISOString(),
  };
};
