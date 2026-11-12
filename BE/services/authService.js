const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, RefreshToken } = require('../models');

const ACCESS_TTL = process.env.ACCESS_TOKEN_TTL || '15m';
const REFRESH_DAYS = Number(process.env.REFRESH_TOKEN_DAYS || 30);
const roles = new Set(['SUPER_ADMIN', 'ADMIN', 'CONTADOR', 'OPERADOR', 'LECTOR']);

function secret() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) throw new Error('JWT_SECRET debe tener al menos 32 caracteres.');
  return process.env.JWT_SECRET;
}

function tokenHash(token) { return crypto.createHash('sha256').update(token).digest('hex'); }
function publicUser(user) { return { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol, organizacionId: user.organizacionId }; }

function accessToken(user) {
  return jwt.sign({ sub: String(user.id), email: user.email, rol: user.rol, organizacionId: user.organizacionId }, secret(), { expiresIn: ACCESS_TTL, issuer: 'sistemavision' });
}

async function login(email, password) {
  const user = await User.unscoped().findOne({ where: { email: String(email || '').trim().toLowerCase() } });
  if (!user || !user.activo) throw new Error('Credenciales inválidas.');
  if (user.bloqueadoHasta && new Date(user.bloqueadoHasta) > new Date()) throw new Error('Cuenta temporalmente bloqueada.');
  const valid = await bcrypt.compare(String(password || ''), user.passwordHash);
  if (!valid) {
    const attempts = user.intentosFallidos + 1;
    await user.update({ intentosFallidos: attempts, bloqueadoHasta: attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null });
    throw new Error('Credenciales inválidas.');
  }
  await user.update({ intentosFallidos: 0, bloqueadoHasta: null, ultimoAcceso: new Date() });
  const rawRefresh = crypto.randomBytes(48).toString('base64url');
  await RefreshToken.create({ usuarioId: user.id, tokenHash: tokenHash(rawRefresh), expiresAt: new Date(Date.now() + REFRESH_DAYS * 86400000) });
  return { user: publicUser(user), accessToken: accessToken(user), refreshToken: rawRefresh };
}

async function refresh(rawToken) {
  if (!rawToken) throw new Error('Sesión de renovación ausente.');
  const stored = await RefreshToken.findOne({ where: { tokenHash: tokenHash(rawToken), revokedAt: null }, include: [{ model: User, as: 'user', required: true }] });
  if (!stored || new Date(stored.expiresAt) <= new Date() || !stored.user.activo) throw new Error('Sesión expirada.');
  await stored.update({ revokedAt: new Date() });
  const raw = crypto.randomBytes(48).toString('base64url');
  await RefreshToken.create({ usuarioId: stored.usuarioId, tokenHash: tokenHash(raw), expiresAt: new Date(Date.now() + REFRESH_DAYS * 86400000) });
  return { user: publicUser(stored.user), accessToken: accessToken(stored.user), refreshToken: raw };
}

async function revoke(rawToken) {
  if (rawToken) await RefreshToken.update({ revokedAt: new Date() }, { where: { tokenHash: tokenHash(rawToken), revokedAt: null } });
}

async function bootstrapAdmin({ name, email, password, organizationName = 'SistemaVision' }) {
  if (!name || !email || !String(email).includes('@')) throw new Error('ADMIN_NAME y ADMIN_EMAIL son obligatorios.');
  if (!password || password.length < 12) throw new Error('La contraseña inicial debe tener al menos 12 caracteres.');
  if (!roles.has('SUPER_ADMIN')) throw new Error('Rol inválido.');
  const { Organization } = require('../models');
  const [organization] = await Organization.findOrCreate({ where: { slug: 'sistemavision' }, defaults: { nombre: organizationName } });
  const normalized = String(email).trim().toLowerCase();
  const existing = await User.unscoped().findOne({ where: { email: normalized } });
  if (existing) throw new Error('Ya existe un usuario con ese correo.');
  const user = await User.create({ nombre: name, email: normalized, passwordHash: await bcrypt.hash(password, 12), rol: 'SUPER_ADMIN', organizacionId: organization.id });
  return publicUser(user);
}

module.exports = { login, refresh, revoke, bootstrapAdmin, accessToken, publicUser, roles };
