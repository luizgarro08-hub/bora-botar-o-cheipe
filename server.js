const express = require("express");
const path = require("path");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const SECRET = process.env.JWT_SECRET;
if (!SECRET) { console.error("Defina a variável JWT_SECRET."); process.exit(1); }
if (!process.env.DATABASE_URL) { console.error("Defina a variável DATABASE_URL."); process.exit(1); }

// Internal Database URL da Render: não precisa de SSL.
// External Database URL (rodando no seu PC): use PGSSL=true.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSL === "true" ? { rejectUnauthorized: false } : false
});

const app = express();
app.set("trust proxy", 1);
app.use(express.json({ limit: "1mb" }));

const tentativas = new Map();
function limite(req, res, next) {
  const agora = Date.now();
  const lista = (tentativas.get(req.ip) || []).filter(t => agora - t < 15 * 60e3);
  if (lista.length >= 20) return res.status(429).json({ erro: "Muitas tentativas. Tente de novo em alguns minutos." });
  lista.push(agora); tentativas.set(req.ip, lista);
  next();
}

const assinar = id => jwt.sign({ id }, SECRET, { expiresIn: "90d" });

function auth(req, res, next) {
  const h = req.headers.authorization || "";
  try {
    req.uid = jwt.verify(h.replace("Bearer ", ""), SECRET).id;
    next();
  } catch (e) {
    res.status(401).json({ erro: "Sessão expirada. Entre de novo." });
  }
}

app.post("/api/register", limite, async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const senha = String(req.body.senha || "");
    if (!/^\S+@\S+\.\S+$/.test(email) || senha.length < 6)
      return res.status(400).json({ erro: "E-mail inválido ou senha com menos de 6 caracteres." });
    const hash = await bcrypt.hash(senha, 10);
    const r = await pool.query(
      "INSERT INTO usuarios(email, senha_hash) VALUES($1, $2) ON CONFLICT (email) DO NOTHING RETURNING id",
      [email, hash]
    );
    if (!r.rows.length) return res.status(409).json({ erro: "Este e-mail já tem conta. Use Entrar." });
    res.json({ token: assinar(r.rows[0].id) });
  } catch (e) { console.error(e); res.status(500).json({ erro: "Erro no servidor." }); }
});

app.post("/api/login", limite, async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const senha = String(req.body.senha || "");
    const r = await pool.query("SELECT id, senha_hash FROM usuarios WHERE email = $1", [email]);
    const ok = r.rows.length && await bcrypt.compare(senha, r.rows[0].senha_hash);
    if (!ok) return res.status(401).json({ erro: "E-mail ou senha incorretos." });
    res.json({ token: assinar(r.rows[0].id) });
  } catch (e) { console.error(e); res.status(500).json({ erro: "Erro no servidor." }); }
});

app.get("/api/state", auth, async (req, res) => {
  try {
    const r = await pool.query("SELECT estado FROM usuarios WHERE id = $1", [req.uid]);
    res.json({ state: r.rows[0] ? r.rows[0].estado : null });
  } catch (e) { console.error(e); res.status(500).json({ erro: "Erro no servidor." }); }
});

app.put("/api/state", auth, async (req, res) => {
  try {
    const st = req.body.state;
    if (st !== null && (typeof st !== "object" || Array.isArray(st)))
      return res.status(400).json({ erro: "Dados inválidos." });
    await pool.query(
      "UPDATE usuarios SET estado = $1, atualizado_em = now() WHERE id = $2",
      [st === null ? null : JSON.stringify(st), req.uid]
    );
    res.json({ ok: true });
  } catch (e) { console.error(e); res.status(500).json({ erro: "Erro no servidor." }); }
});

const ARQUIVOS = ["index.html", "manifest.json", "sw.js", "icon-192.png", "icon-512.png"];
app.get("/", (req, res) => {
  res.setHeader("Cache-Control", "no-cache");
  res.sendFile(path.join(__dirname, "index.html"));
});
ARQUIVOS.forEach(a => app.get("/" + a, (req, res) => {
  if (a === "sw.js" || a === "index.html") res.setHeader("Cache-Control", "no-cache");
  res.sendFile(path.join(__dirname, a));
}));
(async () => {
  await pool.query(`CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    senha_hash TEXT NOT NULL,
    estado JSONB,
    criado_em TIMESTAMPTZ DEFAULT now(),
    atualizado_em TIMESTAMPTZ DEFAULT now()
  )`);
  const porta = process.env.PORT || 3000;
  app.listen(porta, () => console.log("Neon Gym no ar na porta " + porta));
})().catch(e => { console.error("Falha ao iniciar:", e); process.exit(1); });
