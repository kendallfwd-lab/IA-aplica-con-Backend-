require('dotenv').config();
const { bootstrapAdmin } = require('../services/authService');
const sequelize = require('../config/database');

async function main() {
  const user = await bootstrapAdmin({
    name: process.env.ADMIN_NAME,
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
    organizationName: process.env.ADMIN_ORGANIZATION || 'SistemaVision',
  });
  console.log(`Administrador creado: ${user.email} (${user.rol})`);
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; }).finally(() => sequelize.close());
