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

db.sequelize = sequelize;
db.Sequelize = require('sequelize');

module.exports = db;

