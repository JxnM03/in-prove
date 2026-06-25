const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

pool.connect()
    .then(() => console.log('✅ Datenbankverbindung erfolgreich'))
    .catch(err => console.error('❌ Datenbankverbindung fehlgeschlagen:', err));

module.exports = pool;