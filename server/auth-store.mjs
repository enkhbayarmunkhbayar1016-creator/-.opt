import crypto from "node:crypto";

const sameHash = (left, right) =>
  Buffer.from(left, "hex").length === Buffer.from(right, "hex").length &&
  crypto.timingSafeEqual(Buffer.from(left, "hex"), Buffer.from(right, "hex"));
const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

export const createPostgresAuthStore = (pool) => ({
  async initialize() {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        company TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        role TEXT NOT NULL CHECK (role IN ('manager', 'fixer', 'renter')),
        password_hash TEXT NOT NULL,
        password_salt TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS auth_sessions (
        token_hash TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at TIMESTAMPTZ NOT NULL
      );
      CREATE TABLE IF NOT EXISTS email_verification_codes (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL,
        purpose TEXT NOT NULL CHECK (purpose IN ('register', 'reset-password')),
        code_hash TEXT NOT NULL,
        payload JSONB,
        expires_at TIMESTAMPTZ NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        used_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS email_verification_codes_lookup_idx
        ON email_verification_codes(email, purpose, created_at DESC);
    `);
  },

  async createVerificationCode({
    id,
    email,
    purpose,
    codeHash,
    payload,
    expiresAt,
  }) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const recent = await client.query(
        `SELECT created_at FROM email_verification_codes
         WHERE email = $1 AND purpose = $2
         ORDER BY created_at DESC LIMIT 1 FOR UPDATE`,
        [email, purpose],
      );
      if (
        recent.rows[0] &&
        Date.now() - new Date(recent.rows[0].created_at).getTime() < 60_000
      ) {
        await client.query("ROLLBACK");
        return false;
      }

      await client.query(
        `UPDATE email_verification_codes SET used_at = NOW()
         WHERE email = $1 AND purpose = $2 AND used_at IS NULL`,
        [email, purpose],
      );
      await client.query(
        `INSERT INTO email_verification_codes
         (id, email, purpose, code_hash, payload, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [id, email, purpose, codeHash, payload, expiresAt],
      );
      await client.query("COMMIT");
      return true;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },

  async registerWithCode({ email, codeHash }) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const challenge = await findChallenge(client, email, "register");
      if (!challenge || !sameHash(challenge.code_hash, codeHash)) {
        if (challenge) {
          await client.query(
            `UPDATE email_verification_codes SET attempts = attempts + 1 WHERE id = $1`,
            [challenge.id],
          );
        }
        await client.query("COMMIT");
        return null;
      }

      await client.query(
        `UPDATE email_verification_codes SET used_at = NOW() WHERE id = $1`,
        [challenge.id],
      );
      const result = await client.query(
        `INSERT INTO users (id, name, company, phone, email, role, password_hash, password_salt)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, name, company, phone, email, role`,
        [
          challenge.payload.id,
          challenge.payload.name,
          challenge.payload.company,
          challenge.payload.phone,
          challenge.payload.email,
          challenge.payload.role,
          challenge.payload.passwordHash,
          challenge.payload.passwordSalt,
        ],
      );
      await client.query("COMMIT");
      return result.rows[0];
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },

  async findUserByEmail(email) {
    const result = await pool.query(
      `SELECT id, name, company, phone, email, role, password_hash AS "passwordHash",
              password_salt AS "passwordSalt"
       FROM users WHERE email = $1`,
      [email],
    );
    return result.rows[0] ?? null;
  },

  async createSession(tokenHash, userId, expiresAt) {
    await pool.query(
      `INSERT INTO auth_sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)`,
      [tokenHash, userId, expiresAt],
    );
  },

  async findUserBySessionToken(token) {
    const result = await pool.query(
      `SELECT users.id, users.role
       FROM auth_sessions
       JOIN users ON users.id = auth_sessions.user_id
       WHERE auth_sessions.token_hash = $1 AND auth_sessions.expires_at > NOW()`,
      [hashToken(token)],
    );
    return result.rows[0] ?? null;
  },

  async resetPasswordWithCode({ email, codeHash, passwordHash, passwordSalt }) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const challenge = await findChallenge(client, email, "reset-password");
      if (!challenge || !sameHash(challenge.code_hash, codeHash)) {
        if (challenge) {
          await client.query(
            `UPDATE email_verification_codes SET attempts = attempts + 1 WHERE id = $1`,
            [challenge.id],
          );
        }
        await client.query("COMMIT");
        return false;
      }

      await client.query(
        `UPDATE users SET password_hash = $1, password_salt = $2 WHERE email = $3`,
        [passwordHash, passwordSalt, email],
      );
      await client.query(
        `UPDATE email_verification_codes SET used_at = NOW() WHERE id = $1`,
        [challenge.id],
      );
      await client.query(
        `DELETE FROM auth_sessions WHERE user_id = (SELECT id FROM users WHERE email = $1)`,
        [email],
      );
      await client.query("COMMIT");
      return true;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },
});

const findChallenge = async (client, email, purpose) => {
  const result = await client.query(
    `SELECT id, code_hash, payload FROM email_verification_codes
     WHERE email = $1 AND purpose = $2 AND used_at IS NULL
       AND expires_at > NOW() AND attempts < 5
     ORDER BY created_at DESC LIMIT 1 FOR UPDATE`,
    [email, purpose],
  );
  return result.rows[0] ?? null;
};

export const createMemoryAuthStore = () => {
  const users = new Map();
  const sessions = new Map();
  const verificationCodes = new Map();

  return {
    async initialize() {},
    async createVerificationCode(challenge) {
      const newest = [...verificationCodes.values()]
        .filter(
          (entry) =>
            entry.email === challenge.email && entry.purpose === challenge.purpose,
        )
        .sort((left, right) => right.createdAt - left.createdAt)[0];
      if (newest && Date.now() - newest.createdAt < 60_000) return false;

      for (const entry of verificationCodes.values()) {
        if (
          entry.email === challenge.email &&
          entry.purpose === challenge.purpose &&
          !entry.used
        ) {
          entry.used = true;
        }
      }
      verificationCodes.set(challenge.id, {
        ...challenge,
        attempts: 0,
        used: false,
        createdAt: Date.now(),
      });
      return true;
    },
    async registerWithCode({ email, codeHash }) {
      const challenge = findMemoryChallenge(verificationCodes, email, "register");
      if (!challenge || !sameHash(challenge.codeHash, codeHash)) {
        if (challenge) challenge.attempts += 1;
        return null;
      }
      if ([...users.values()].some((saved) => saved.email === email)) {
        const error = new Error("Email already registered");
        error.code = "23505";
        throw error;
      }
      challenge.used = true;
      const saved = { ...challenge.payload };
      users.set(saved.id, saved);
      return {
        id: saved.id,
        name: saved.name,
        company: saved.company,
        phone: saved.phone,
        email: saved.email,
        role: saved.role,
      };
    },
    async findUserByEmail(email) {
      return [...users.values()].find((user) => user.email === email) ?? null;
    },
    async createSession(tokenHash, userId, expiresAt) {
      sessions.set(tokenHash, { userId, expiresAt });
    },
    async findUserBySessionToken(token) {
      const session = sessions.get(hashToken(token));
      if (!session || session.expiresAt <= Date.now()) return null;
      const user = users.get(session.userId);
      return user ? { id: user.id, role: user.role } : null;
    },
    async resetPasswordWithCode({
      email,
      codeHash,
      passwordHash,
      passwordSalt,
    }) {
      const challenge = findMemoryChallenge(
        verificationCodes,
        email,
        "reset-password",
      );
      if (!challenge || !sameHash(challenge.codeHash, codeHash)) {
        if (challenge) challenge.attempts += 1;
        return false;
      }
      const user = [...users.values()].find((entry) => entry.email === email);
      if (!user) return false;

      challenge.used = true;
      user.passwordHash = passwordHash;
      user.passwordSalt = passwordSalt;
      for (const [hash, session] of sessions) {
        if (session.userId === user.id) sessions.delete(hash);
      }
      return true;
    },
  };
};

const findMemoryChallenge = (codes, email, purpose) =>
  [...codes.values()]
    .filter(
      (entry) =>
        entry.email === email &&
        entry.purpose === purpose &&
        !entry.used &&
        entry.expiresAt > Date.now() &&
        entry.attempts < 5,
    )
    .sort((left, right) => right.createdAt - left.createdAt)[0] ?? null;
