const jwt = require('jsonwebtoken');

function authenticate(req, res, next) {
  const header = req.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ success: false, error: 'Autenticación requerida.' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET, { issuer: 'sistemavision' });
    return next();
  } catch {
    return res.status(401).json({ success: false, error: 'Sesión inválida o expirada.' });
  }
}

function requireRoles(...allowed) {
  return (req, res, next) => {
    if (!req.user || !allowed.includes(req.user.rol)) return res.status(403).json({ success: false, error: 'No tienes permisos para esta operación.' });
    return next();
  };
}

module.exports = { authenticate, requireRoles };
