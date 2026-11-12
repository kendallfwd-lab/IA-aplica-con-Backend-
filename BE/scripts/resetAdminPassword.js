require('dotenv').config();
const bcrypt = require('bcryptjs');
const { User } = require('../models');
const sequelize = require('../config/database');

async function main() {
  const email = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = String(process.env.ADMIN_PASSWORD || '');
  if (!email || !password || password.length < 12) throw new Error('ADMIN_EMAIL y ADMIN_PASSWORD son obligatorios; la contraseña debe tener mínimo 12 caracteres.');
  const user = await User.unscoped().findOne({ where: { email } });
  if (!user) throw new Error('No existe un usuario con ese correo. Usa npm run admin:bootstrap.');
  await user.update({ passwordHash: await bcrypt.hash(password, 12), intentosFallidos: 0, bloqueadoHasta: null, activo: true });
  console.log(`Contraseña restablecida para ${email}`);
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; }).finally(() => sequelize.close());
