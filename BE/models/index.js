const fs = require('fs');
const path = require('path');
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const db = {};
for (const file of fs.readdirSync(__dirname)) {
  if (file === 'index.js' || !file.endsWith('.js')) continue;
  const model = require(path.join(__dirname, file))(sequelize, DataTypes);
  db[model.name] = model;
}

if (db.RefreshToken && db.User) db.RefreshToken.belongsTo(db.User, { foreignKey: 'usuarioId', as: 'user' });
if (db.User && db.Organization) db.User.belongsTo(db.Organization, { foreignKey: 'organizacionId', as: 'organization' });
if (db.Factura && db.Organization) db.Factura.belongsTo(db.Organization, { foreignKey: 'organizacionId', as: 'organization' });
if (db.Contact && db.Customer) db.Contact.belongsTo(db.Customer, { foreignKey: 'clienteId', as: 'customer' });
if (db.Customer && db.Contact) db.Customer.hasMany(db.Contact, { foreignKey: 'clienteId', as: 'contacts' });
if (db.Quote && db.Customer) db.Quote.belongsTo(db.Customer, { foreignKey: 'clienteId', as: 'customer' });
if (db.QuoteLine && db.Quote) db.QuoteLine.belongsTo(db.Quote, { foreignKey: 'cotizacionId', as: 'quote' });
if (db.QuoteLine && db.Service) db.QuoteLine.belongsTo(db.Service, { foreignKey: 'servicioId', as: 'service' });

db.sequelize = sequelize;
db.Sequelize = require('sequelize');

module.exports = db;
