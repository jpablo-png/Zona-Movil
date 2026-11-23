const Database = require('better-sqlite3');
const path = require('path');

// CREAR BASE DE DATOS
const dbPath = process.env.DB_PATH || path.join(__dirname, 'zona-movil.db');
const db = new Database(dbPath);

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

// CREAR TABLA DE PEDIDOS
db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_name TEXT NOT NULL,
        phone TEXT NOT NULL,
        address TEXT NOT NULL,
        total REAL NOT NULL,
        status TEXT DEFAULT 'Pendiente',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`);

// CREAR TABLA DE PRODUCTOS DE CADA PEDIDO
db.exec(`
    CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL,
        product_name TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        price REAL NOT NULL,
        FOREIGN KEY (order_id) REFERENCES orders(id)
    )
`);

console.log('Base de datos conectada correctamente.');

module.exports = db;