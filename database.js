const Database = require('better-sqlite3');
const path = require('path');

// CREAR BASE DE DATOS
const db = new Database(path.join(__dirname, 'zona-movil.db'));

// CREAR TABLA DE PRODUCTOS
db.exec(`
    CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        price REAL NOT NULL,
        image TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`);

console.log('Base de datos conectada correctamente.');

module.exports = db;