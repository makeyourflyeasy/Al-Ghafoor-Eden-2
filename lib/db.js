// lib/db.js
import pkg from 'pg';
const { Pool } = pkg;

let pool;

if (!global._pgPool) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } // Required for some hosted DBs like Heroku/Neon/Vercel Postgres
  });
  global._pgPool = pool;
} else {
  pool = global._pgPool;
}

export default pool;