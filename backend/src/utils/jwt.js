const jwt = require('jsonwebtoken');
const config = require('../config');

const ISSUER = 'pharmacycle-ai';

const sign = (payload) => jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresIn, issuer: ISSUER });
const verify = (token) => jwt.verify(token, config.jwtSecret, { issuer: ISSUER });

module.exports = { sign, verify };
