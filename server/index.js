import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import multer from "multer";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(__dirname, "data");
const UPLOAD_DIR = path.join(__dirname, "uploads");
const DB_FILE = path.join(DATA_DIR, "store.json");
const PORT = Number(process.env.PORT || 4000);
const JWT_SECRET = String(process.env.JWT_SECRET || "");
const ADMIN_EMAIL = String(process.env.ADMIN_EMAIL || "admin@outsiders.ogland").trim().toLowerCase();
const ADMIN_PASSWORD = String(process.env.ADMIN_PASSWORD || "");
const MAX_FILE_SIZE = 12 * 1024 * 1024;
const MAX_FILES = 8;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET lipsește. Completează .env înainte de pornirea serverului.");
}
if (process.env.NODE_ENV === "production" && JWT_SECRET.length < 32) {
  throw new Error("JWT_SECRET trebuie să aibă minimum 32 de caractere în production.");
}
if (JWT_SECRET.length < 32) {
  console.warn("Atenție: JWT_SECRET este prea scurt. Configurează un secret aleator de minimum 32 de caractere în .env.");
}
if (!ADMIN_PASSWORD) {
  throw new Error("ADMIN_PASSWORD lipsește. Completează .env înainte de pornirea serverului.");
}
if (ADMIN_PASSWORD.length < 12) {
  throw new Error("ADMIN_PASSWORD trebuie să aibă minimum 12 caractere.");
}

await fs.mkdir(DATA_DIR, { recursive: true });
await fs.mkdir(UPLOAD_DIR, { recursive: true });

async function readDb() {
  let raw;
  try {
    raw = await fs.readFile(DB_FILE, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return { users: [], dossiers: [] };
    throw error;
  }

  try {
    const db = JSON.parse(raw);
    if (!db || !Array.isArray(db.users) || !Array.isArray(db.dossiers)) {
      throw new Error("Structura bazei de date este invalidă.");
    }
    return db;
  } catch (error) {
    throw new Error(`Baza de date ${DB_FILE} este coruptă și nu a fost modificată: ${error.message}`);
  }
}

let writeQueue = Promise.resolve();
async function writeDb(db) {
  const operation = writeQueue.then(async () => {
    const temp = `${DB_FILE}.${process.pid}.${crypto.randomUUID()}.tmp`;
    await fs.writeFile(temp, JSON.stringify(db, null, 2), { encoding: "utf8", mode: 0o600 });
    await fs.rename(temp, DB_FILE);
  });
  writeQueue = operation.catch(() => {});
  return operation;
}

let mutationQueue = Promise.resolve();
function mutateDb(mutator) {
  const operation = mutationQueue.then(async () => {
    const db = await readDb();
    const result = await mutator(db);
    await writeDb(db);
    return result;
  });
  mutationQueue = operation.catch(() => {});
  return operation;
}

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt };
}

async function ensureAdmin() {
  const db = await readDb();
  // Migrate the misspelled address used by the first project draft.
  const matchingAdmins = db.users.filter(user =>
    user.email === ADMIN_EMAIL || user.email === "admin@ousiders.ogland"
  );
  const existing = matchingAdmins.find(user => user.email === ADMIN_EMAIL) || matchingAdmins[0];
  const now = new Date().toISOString();

  if (existing) {
    const passwordMatches = existing.passwordHash
      ? await bcrypt.compare(ADMIN_PASSWORD, existing.passwordHash).catch(() => false)
      : false;
    let needsUpdate = !passwordMatches || existing.email !== ADMIN_EMAIL || existing.role !== "admin" || existing.name !== "Administrator OUTSIDERS";
    existing.name = "Administrator OUTSIDERS";
    existing.email = ADMIN_EMAIL;
    existing.role = "admin";
    if (!passwordMatches) existing.passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
    for (const duplicate of matchingAdmins) {
      if (duplicate !== existing && duplicate.role !== "disabled") {
        duplicate.role = "disabled";
        duplicate.updatedAt = now;
        needsUpdate = true;
      }
    }
    if (needsUpdate) {
      existing.updatedAt = now;
      await writeDb(db);
      console.log(`Cont administrator actualizat: ${ADMIN_EMAIL}`);
    }
    return;
  }

  db.users.push({
    id: crypto.randomUUID(),
    name: "Administrator OUTSIDERS",
    email: ADMIN_EMAIL,
    passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 12),
    role: "admin",
    createdAt: now
  });
  await writeDb(db);
  console.log(`Cont administrator inițializat: ${ADMIN_EMAIL}`);
}
await ensureAdmin();

const app = express();
app.disable("x-powered-by");
app.use(helmet({
  crossOriginResourcePolicy: { policy: "same-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      styleSrcAttr: ["'unsafe-inline'"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      imgSrc: ["'self'", "data:", "blob:"],
      frameSrc: ["'self'", "blob:", "https://www.youtube-nocookie.com", "https://www.youtube.com"],
      mediaSrc: ["'self'", "blob:"],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"]
    }
  }
}));

const allowedOrigins = new Set(
  String(process.env.CORS_ORIGINS || "http://localhost:5173,http://127.0.0.1:5173")
    .split(",").map(origin => origin.trim()).filter(Boolean)
);
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) return callback(null, true);
    return callback(null, false);
  },
  methods: ["GET", "POST", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Dossier-Password"]
}));
app.use(express.json({ limit: "256kb" }));

const asyncRoute = handler => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

function rateLimit({ windowMs, max, message }) {
  const buckets = new Map();
  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      if (now - bucket.startedAt >= windowMs) buckets.delete(key);
    }
  }, Math.min(windowMs, 60_000));
  cleanup.unref?.();

  return (req, res, next) => {
    const key = req.ip || req.socket.remoteAddress || "unknown";
    const now = Date.now();
    let bucket = buckets.get(key);
    if (!bucket || now - bucket.startedAt >= windowMs) {
      bucket = { startedAt: now, count: 0 };
      buckets.set(key, bucket);
    }
    bucket.count += 1;
    if (bucket.count > max) {
      const retryAfter = Math.max(1, Math.ceil((windowMs - (now - bucket.startedAt)) / 1000));
      res.setHeader("Retry-After", String(retryAfter));
      return res.status(429).json({ error: message });
    }
    next();
  };
}

const loginLimiter = rateLimit({ windowMs: 15 * 60_000, max: 8, message: "Prea multe încercări de autentificare. Încearcă din nou peste 15 minute." });
const accessLimiter = rateLimit({ windowMs: 10 * 60_000, max: 18, message: "Prea multe încercări de acces. Încearcă din nou în câteva minute." });
const trackingLimiter = rateLimit({ windowMs: 10 * 60_000, max: 18, message: "Prea multe verificări de dosar. Încearcă din nou în câteva minute." });
const submitLimiter = rateLimit({ windowMs: 60 * 60_000, max: 8, message: "Ai trimis prea multe dosare într-un interval scurt. Încearcă mai târziu." });

function createToken(user) {
  return jwt.sign({ sub: user.id, role: user.role, email: user.email }, JWT_SECRET, { expiresIn: "12h" });
}

const optionalAuth = asyncRoute(async (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return next();
  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET);
  } catch {
    return res.status(401).json({ error: "Sesiune expirată sau invalidă." });
  }
  const db = await readDb();
  const user = db.users.find(candidate => candidate.id === payload.sub);
  if (user && user.role !== "disabled") req.user = user;
  return next();
});

const auth = asyncRoute(async (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return res.status(401).json({ error: "Autentificare necesară." });
  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET);
  } catch {
    return res.status(401).json({ error: "Sesiune expirată sau invalidă." });
  }
  const db = await readDb();
  const user = db.users.find(candidate => candidate.id === payload.sub);
  if (!user || user.role === "disabled") return res.status(401).json({ error: "Sesiune invalidă sau dezactivată." });
  req.user = user;
  return next();
});

function adminOnly(req, res, next) {
  if (req.user?.role !== "admin") return res.status(403).json({ error: "Acces rezervat administratorului." });
  next();
}

function safeDossier(dossier, db) {
  const owner = db.users.find(user => user.id === dossier.ownerId);
  const {
    accessPasswordHash, trackingSecretHash, ownerId, reviewedBy, ownerEmail, ...publicDossier
  } = dossier;
  return {
    ...publicDossier,
    ownerName: owner?.name || dossier.ownerName || "Vizitator anonim",
    history: (dossier.history || []).map(({ status, at, note }) => ({ status, at, note }))
  };
}

const allowedMime = new Set([
  "image/jpeg", "image/png", "image/webp", "image/gif",
  "application/pdf", "text/plain"
]);

function normalizeYouTubeUrl(raw) {
  try {
    const url = new URL(String(raw || "").trim());
    if (url.protocol !== "https:") return null;
    let id = "";
    if (url.hostname === "youtu.be") id = url.pathname.slice(1).split("/")[0];
    else if (["youtube.com", "www.youtube.com", "m.youtube.com", "youtube-nocookie.com", "www.youtube-nocookie.com"].includes(url.hostname)) {
      if (url.pathname === "/watch") id = url.searchParams.get("v") || "";
      else if (/^\/(embed|shorts|live)\//.test(url.pathname)) id = url.pathname.split("/")[2] || "";
    }
    if (!/^[A-Za-z0-9_-]{11}$/.test(id)) return null;
    return `https://www.youtube.com/watch?v=${id}`;
  } catch { return null; }
}

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, UPLOAD_DIR),
  filename: (_req, file, callback) => {
    const ext = path.extname(file.originalname).slice(0, 12).replace(/[^.a-zA-Z0-9]/g, "");
    callback(null, `${crypto.randomUUID()}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE, files: MAX_FILES, fields: 30, fieldSize: 200_000, parts: 40 },
  fileFilter: (_req, file, callback) => {
    if (!allowedMime.has(file.mimetype)) return callback(badRequest("Tip de fișier neacceptat. Folosește JPG, PNG, WEBP, GIF, PDF sau TXT."));
    callback(null, true);
  }
});

async function validateFileContent(file) {
  const handle = await fs.open(file.path, "r");
  try {
    const sample = Buffer.alloc(16);
    const { bytesRead } = await handle.read(sample, 0, sample.length, 0);
    const data = sample.subarray(0, bytesRead);
    const isText = file.mimetype === "text/plain" && !data.includes(0);
    const isJpeg = file.mimetype === "image/jpeg" && data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff;
    const isPng = file.mimetype === "image/png" && data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    const isGif = file.mimetype === "image/gif" && ["GIF87a", "GIF89a"].includes(data.subarray(0, 6).toString("ascii"));
    const isWebp = file.mimetype === "image/webp" && data.subarray(0, 4).toString("ascii") === "RIFF" && data.subarray(8, 12).toString("ascii") === "WEBP";
    const isPdf = file.mimetype === "application/pdf" && data.subarray(0, 5).toString("ascii") === "%PDF-";
    if (!(isText || isJpeg || isPng || isGif || isWebp || isPdf)) {
      const error = new Error(`Conținutul fișierului „${file.originalname}” nu corespunde tipului declarat.`);
      error.status = 400;
      throw error;
    }
  } finally {
    await handle.close();
  }
}

function badRequest(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function textField(value, name, maxLength) {
  const text = String(value || "").trim();
  if (text.length > maxLength) {
    const error = new Error(`${name} poate avea maximum ${maxLength} caractere.`);
    error.status = 400;
    throw error;
  }
  return text;
}

function trackingSecretMatches(dossier, secret) {
  if (!dossier?.trackingSecretHash || !secret || String(secret).length > 128) return false;
  const expected = Buffer.from(dossier.trackingSecretHash, "hex");
  const actual = crypto.createHash("sha256").update(String(secret)).digest();
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

app.get("/api/health", (_req, res) => res.json({ ok: true, app: "OUTSIDERS Archive", version: "1.1.0" }));

app.post("/api/auth/register", (_req, res) => res.status(403).json({ error: "Înregistrarea conturilor este dezactivată. Accesul public nu necesită cont." }));

app.post("/api/auth/login", loginLimiter, asyncRoute(async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");
  if (!email || password.length > 256) return res.status(400).json({ error: "Completează adresa de e-mail și parola." });
  const db = await readDb();
  const user = db.users.find(candidate => candidate.email === email);
  if (!user || user.role === "disabled" || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: "E-mail sau parolă incorectă." });
  }
  return res.json({ token: createToken(user), user: publicUser(user) });
}));

app.get("/api/auth/me", auth, (req, res) => res.json({ user: publicUser(req.user) }));

app.get("/api/dossiers", optionalAuth, asyncRoute(async (req, res) => {
  const db = await readDb();
  const rows = req.user?.role === "admin"
    ? db.dossiers.slice().sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    : [];
  return res.json({ dossiers: rows.map(dossier => safeDossier(dossier, db)) });
}));

app.post("/api/dossiers/status", trackingLimiter, asyncRoute(async (req, res) => {
  const reference = String(req.body?.reference || "").trim().toUpperCase();
  const trackingSecret = String(req.body?.trackingSecret || "");
  const db = await readDb();
  const dossier = db.dossiers.find(candidate => candidate.reference.toUpperCase() === reference);
  if (!dossier || !trackingSecretMatches(dossier, trackingSecret)) {
    return res.status(403).json({ error: "Referința sau codul de urmărire nu sunt corecte." });
  }
  return res.json({ tracking: {
    reference: dossier.reference,
    title: dossier.title,
    status: dossier.status,
    createdAt: dossier.createdAt,
    updatedAt: dossier.updatedAt,
    reviewedAt: dossier.reviewedAt || null,
    adminNote: dossier.adminNote || "",
    history: (dossier.history || []).map(({ status, at, note }) => ({ status, at, note })),
    supplementalUpdates: (dossier.supplementalUpdates || []).map(({ id, text, createdAt }) => ({ id, text, createdAt }))
  } });
}));

app.post("/api/dossiers/response", trackingLimiter, asyncRoute(async (req, res) => {
  const reference = String(req.body?.reference || "").trim().toUpperCase();
  const trackingSecret = String(req.body?.trackingSecret || "");
  const responseText = textField(req.body?.responseText, "Completarea", 6_000);
  if (responseText.length < 10) return res.status(400).json({ error: "Completarea trebuie să aibă cel puțin 10 caractere." });

  const now = new Date().toISOString();
  const tracking = await mutateDb(db => {
    const dossier = db.dossiers.find(candidate => candidate.reference.toUpperCase() === reference);
    if (!dossier || !trackingSecretMatches(dossier, trackingSecret)) {
      const error = new Error("Referința sau codul de urmărire nu sunt corecte.");
      error.status = 403;
      throw error;
    }
    if (dossier.status !== "revision") {
      const error = new Error("Nu există o solicitare de completări activă pentru acest dosar.");
      error.status = 409;
      throw error;
    }
    dossier.supplementalUpdates = dossier.supplementalUpdates || [];
    dossier.supplementalUpdates.push({ id: crypto.randomUUID(), text: responseText, createdAt: now });
    dossier.status = "pending";
    dossier.adminNote = "";
    dossier.updatedAt = now;
    dossier.history = dossier.history || [];
    dossier.history.push({ status: "pending", at: now, by: null, note: "Autorul a transmis completările solicitate." });
    return {
      reference: dossier.reference,
      title: dossier.title,
      status: dossier.status,
      createdAt: dossier.createdAt,
      updatedAt: dossier.updatedAt,
      reviewedAt: dossier.reviewedAt || null,
      adminNote: dossier.adminNote || "",
      history: dossier.history.map(({ status, at, note }) => ({ status, at, note })),
      supplementalUpdates: dossier.supplementalUpdates.map(({ id, text, createdAt }) => ({ id, text, createdAt }))
    };
  });
  return res.json({ tracking });
}));

app.post("/api/dossiers/access", accessLimiter, optionalAuth, asyncRoute(async (req, res) => {
  const db = await readDb();
  const reference = String(req.body?.reference || "").trim().toUpperCase();
  const dossier = db.dossiers.find(candidate => candidate.reference.toUpperCase() === reference);
  if (!dossier) return res.status(404).json({ error: "Dosarul nu a fost găsit." });
  if (req.user?.role !== "admin") {
    if (dossier.status !== "approved") return res.status(403).json({ error: "Dosarul nu a fost încă aprobat. Revino după finalizarea verificării." });
    const password = String(req.body?.password || "");
    if (!dossier.accessPasswordHash || !(await bcrypt.compare(password, dossier.accessPasswordHash))) {
      return res.status(403).json({ error: "Referința sau parola nu sunt corecte." });
    }
  }
  return res.json({ dossier: safeDossier(dossier, db) });
}));

app.post("/api/dossiers", submitLimiter, upload.array("evidence", MAX_FILES), asyncRoute(async (req, res) => {
  const files = req.files || [];
  try {
    for (const file of files) await validateFileContent(file);

    const title = textField(req.body?.title, "Titlul", 140);
    const organization = textField(req.body?.organization, "Organizația", 80);
    const organizationOther = textField(req.body?.organizationOther, "Organizația precizată", 120);
    const category = String(req.body?.category || "integrity");
    const summary = textField(req.body?.summary, "Rezumatul", 1_500);
    const details = textField(req.body?.details, "Descrierea", 15_000);
    const location = textField(req.body?.location, "Locația", 300);
    const people = textField(req.body?.people, "Persoanele / identificatorii", 4_000);
    const chronology = textField(req.body?.chronology, "Cronologia", 6_000);
    const requestedAction = textField(req.body?.requestedAction, "Solicitarea", 4_000);

    if (title.length < 8) throw badRequest("Titlul trebuie să aibă cel puțin 8 caractere.");
    if (!["PD", "SMURD", "Alte organizații"].includes(organization)) throw badRequest("Alege organizația vizată.");
    if (organization === "Alte organizații" && organizationOther.length < 2) throw badRequest("Precizează organizația.");
    if (summary.length < 30) throw badRequest("Rezumatul trebuie să conțină cel puțin 30 de caractere.");
    if (details.length < 40) throw badRequest("Descrierea trebuie să conțină cel puțin 40 de caractere.");
    const validCategories = ["integrity", "abuse", "leak", "procedure", "other"];
    if (!validCategories.includes(category)) throw badRequest("Tipul sesizării nu este valid.");

    const rawVideoLinks = Array.isArray(req.body?.videoLinks)
      ? req.body.videoLinks
      : req.body?.videoLinks ? [req.body.videoLinks] : [];
    if (rawVideoLinks.length > 8) throw badRequest("Poți adăuga maximum 8 linkuri YouTube.");
    const videoLinks = rawVideoLinks.map(normalizeYouTubeUrl);
    if (videoLinks.some(url => !url)) throw badRequest("Unul dintre linkurile video nu este un URL YouTube valid. Folosește un link youtube.com sau youtu.be.");

    const evidence = files.map(file => ({
      id: crypto.randomUUID(),
      originalName: path.basename(String(file.originalname).replace(/\\/g, "/")).slice(0, 240),
      filename: file.filename,
      mimeType: file.mimetype,
      size: file.size
    }));
    const now = new Date().toISOString();
    const trackingSecret = crypto.randomBytes(24).toString("base64url");
    const trackingSecretHash = crypto.createHash("sha256").update(trackingSecret).digest("hex");
    const dossier = {
      id: crypto.randomUUID(),
      reference: `OUT-${new Date().getFullYear()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`,
      accessPasswordHash: null,
      trackingSecretHash,
      title, organization, organizationOther, category,
      priority: ["normal", "important", "urgent"].includes(req.body?.priority) ? req.body.priority : "normal",
      incidentDate: /^\d{4}-\d{2}-\d{2}$/.test(String(req.body?.incidentDate || "")) ? String(req.body.incidentDate) : "",
      location, summary, details, people, chronology, requestedAction,
      evidence,
      videoLinks: [...new Set(videoLinks)].map(url => ({ id: crypto.randomUUID(), url })),
      status: "pending",
      adminNote: "",
      ownerId: null,
      ownerName: "Vizitator anonim",
      createdAt: now,
      updatedAt: now,
      history: [{ status: "pending", at: now, by: null, note: "Dosar transmis spre verificare." }]
    };

    const response = await mutateDb(db => {
      db.dossiers.push(dossier);
      return { dossier: safeDossier(dossier, db), trackingSecret };
    });
    return res.status(201).json(response);
  } catch (error) {
    await Promise.all(files.map(file => fs.unlink(file.path).catch(() => {})));
    throw error;
  }
}));

app.patch("/api/dossiers/:id/review", auth, adminOnly, asyncRoute(async (req, res) => {
  const status = String(req.body?.status || "");
  const note = textField(req.body?.note, "Nota", 4_000);
  if (!["approved", "rejected", "revision"].includes(status)) return res.status(400).json({ error: "Acțiune de moderare invalidă." });
  if (status !== "approved" && note.length < 5) return res.status(400).json({ error: "Adaugă o observație pentru respingere sau revizuire." });
  const accessPassword = String(req.body?.accessPassword || "").trim();
  if (status === "approved" && (accessPassword.length < 8 || accessPassword.length > 128)) {
    return res.status(400).json({ error: "Alege o parolă între 8 și 128 de caractere sau generează una automat." });
  }

  const accessPasswordHash = status === "approved" ? await bcrypt.hash(accessPassword, 12) : null;
  const now = new Date().toISOString();
  const response = await mutateDb(db => {
    const dossier = db.dossiers.find(candidate => candidate.id === req.params.id);
    if (!dossier) {
      const error = new Error("Dosarul nu a fost găsit.");
      error.status = 404;
      throw error;
    }
    dossier.status = status;
    if (status === "approved") dossier.accessPasswordHash = accessPasswordHash;
    dossier.adminNote = note;
    dossier.updatedAt = now;
    dossier.reviewedAt = now;
    dossier.reviewedBy = req.user.id;
    dossier.history = dossier.history || [];
    dossier.history.push({ status, at: now, by: req.user.id, note: note || "Dosar aprobat pentru publicare." });
    return { dossier: safeDossier(dossier, db), ...(status === "approved" ? { accessPassword } : {}) };
  });
  return res.json(response);
}));

app.get("/api/files/:filename", optionalAuth, asyncRoute(async (req, res) => {
  const db = await readDb();
  const filename = path.basename(req.params.filename);
  const dossier = db.dossiers.find(candidate => (candidate.evidence || []).some(file => file.filename === filename));
  if (!dossier) return res.status(404).json({ error: "Fișierul nu a fost găsit." });
  if (req.user?.role !== "admin") {
    if (dossier.status !== "approved") return res.status(403).json({ error: "Dosarul nu este încă aprobat." });
    const password = String(req.headers["x-dossier-password"] || "");
    if (!dossier.accessPasswordHash || !(await bcrypt.compare(password, dossier.accessPasswordHash))) {
      return res.status(403).json({ error: "Introdu parola corectă a dosarului pentru a accesa anexele." });
    }
  }

  const file = dossier.evidence.find(candidate => candidate.filename === filename);
  const fullPath = path.join(UPLOAD_DIR, filename);
  res.setHeader("X-Content-Type-Options", "nosniff");
  const encodedName = encodeURIComponent(file.originalName).replace(/[!'()*]/g, character => `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
  res.setHeader("Content-Disposition", `inline; filename*=UTF-8''${encodedName}`);
  res.type(file.mimeType);
  return res.sendFile(fullPath, error => {
    if (error && !res.headersSent) res.status(error.statusCode || 404).json({ error: "Fișierul nu este disponibil pe server." });
  });
}));

app.use("/api", (_req, res) => res.status(404).json({ error: "Ruta API nu există." }));

app.use((error, req, res, _next) => {
  if (res.headersSent) return;
  const uploadMessage = error instanceof multer.MulterError
    ? (error.code === "LIMIT_FILE_SIZE" ? "Un fișier depășește limita de 12 MB."
      : error.code === "LIMIT_FILE_COUNT" ? "Poți atașa maximum 8 fișiere."
      : error.code === "LIMIT_FIELD_VALUE" ? "Un câmp al formularului este prea lung."
      : "Datele sau fișierele trimise depășesc limitele permise.")
    : error.message || "A apărut o eroare.";
  const status = Number.isInteger(error.status) && error.status >= 400 && error.status < 600
    ? error.status
    : error instanceof multer.MulterError ? 400 : 500;
  if (status >= 500) console.error(error);
  const responseMessage = status >= 500 && process.env.NODE_ENV === "production" ? "A apărut o eroare internă. Încearcă din nou." : uploadMessage;
  const partialUploads = Array.isArray(req.files) ? req.files : [];
  return Promise.all(partialUploads.map(file => fs.unlink(file.path).catch(() => {})))
    .finally(() => res.status(status).json({ error: responseMessage }));
});

const distPath = path.join(ROOT, "dist");
try {
  await fs.access(distPath);
  app.use(express.static(distPath, { index: false, maxAge: process.env.NODE_ENV === "production" ? "1h" : 0 }));
  app.get("*", (_req, res) => res.sendFile(path.join(distPath, "index.html")));
} catch {
  // In development Vite serves the client separately.
}

app.listen(PORT, () => console.log(`OUTSIDERS API rulează pe http://localhost:${PORT}`));
