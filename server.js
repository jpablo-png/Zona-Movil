const express = require("express");
require("dotenv").config();
const path = require("path");
const session = require("express-session");
const db = require("./database");
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: 'strict',
        secure: false,
        maxAge: 1000 * 60 * 60 * 2
    }
}));
// PROTEGER RUTAS DEL ADMINISTRADOR
function requireAdmin(req, res, next) {
    if (req.session.isAdmin !== true) {
        return res.status(401).json({
            success: false,
            message: "No tienes autorización."
        });
    }

    next();
}
// INICIAR SESIÓN DEL ADMINISTRADOR
app.post("/api/login", async (req, res) => {
    const { username, password } = req.body;

    if (
        username !== process.env.ADMIN_USER ||
        !await require("bcryptjs").compare(
            password || "",
            process.env.ADMIN_PASSWORD_HASH || ""
        )
    ) {
        return res.status(401).json({
            success: false,
            message: "Usuario o contraseña incorrectos"
        });
    }

    req.session.regenerate((err) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: "Error al iniciar sesión"
            });
        }

        req.session.isAdmin = true;

        res.json({ success: true });
    });
});
// VERIFICAR SESIÓN DEL ADMINISTRADOR
app.get("/api/session", (req, res) => {
    res.json({
        isAdmin: req.session.isAdmin === true
    });
});
// CERRAR SESIÓN DEL ADMINISTRADOR
app.post("/api/logout", (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: "Error al cerrar sesión"
            });
        }

        res.clearCookie("connect.sid");
        res.json({ success: true });
    });
});
// CONSULTAR PRODUCTOS
app.get("/api/products", (req, res) => {
    const products = db.prepare(
        "SELECT * FROM products ORDER BY id DESC"
    ).all();

    res.json(products);
});
// CONSULTAR PEDIDOS (SOLO ADMINISTRADOR)
app.get("/api/orders", requireAdmin, (req, res) => {
    const orders = db.prepare(`
        SELECT * FROM orders
        ORDER BY id DESC
    `).all();

    res.json(orders);
});
// REGISTRAR PEDIDOS
app.post("/api/orders", (req, res) => {
    const { customer_name, phone, address, items } = req.body;

    if (
        typeof customer_name !== "string" ||
        !customer_name.trim() ||
        typeof phone !== "string" ||
        !phone.trim() ||
        typeof address !== "string" ||
        !address.trim() ||
        !Array.isArray(items) ||
        items.length === 0
    ) {
        return res.status(400).json({
            success: false,
            message: "Datos del pedido inválidos."
        });
    }

    try {
        const createOrder = db.transaction(() => {
            let total = 0;

            const validItems = items.map(item => {
                const product = db.prepare(
                    "SELECT id, name, price FROM products WHERE id = ?"
                ).get(Number(item.product_id));

                const quantity = Number(item.quantity);

                if (
                    !product ||
                    !Number.isInteger(quantity) ||
                    quantity < 1
                ) {
                    throw new Error("Producto o cantidad inválidos.");
                }

                total += product.price * quantity;

                return {
                    name: product.name,
                    price: product.price,
                    quantity
                };
            });

            const order = db.prepare(`
                INSERT INTO orders (customer_name, phone, address, total)
                VALUES (?, ?, ?, ?)
            `).run(
                customer_name.trim(),
                phone.trim(),
                address.trim(),
                total
            );

            const insertItem = db.prepare(`
                INSERT INTO order_items
                (order_id, product_name, quantity, price)
                VALUES (?, ?, ?, ?)
            `);

            validItems.forEach(item => {
                insertItem.run(
                    order.lastInsertRowid,
                    item.name,
                    item.quantity,
                    item.price
                );
            });

            return order.lastInsertRowid;
        });

        const orderId = createOrder();

        res.status(201).json({
            success: true,
            orderId,
            message: "Pedido registrado correctamente."
        });

    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});
// AGREGAR PRODUCTO (SOLO ADMINISTRADOR)
app.post("/api/products", requireAdmin, (req, res) => {
    const { name, price, image } = req.body;

    if (
        typeof name !== "string" ||
        !name.trim() ||
        !Number.isFinite(price) ||
        price <= 0
    ) {
        return res.status(400).json({
            success: false,
            message: "Datos del producto inválidos."
        });
    }

    const result = db.prepare(`
        INSERT INTO products (name, price, image)
        VALUES (?, ?, ?)
    `).run(name.trim(), price, image || "");

    res.status(201).json({
        success: true,
        id: result.lastInsertRowid
    });
});

// EDITAR PRODUCTO (SOLO ADMINISTRADOR)
app.put("/api/products/:id", requireAdmin, (req, res) => {
    const { name, price, image } = req.body;
    const id = Number(req.params.id);

    if (
        !Number.isInteger(id) ||
        typeof name !== "string" ||
        !name.trim() ||
        !Number.isFinite(price) ||
        price <= 0
    ) {
        return res.status(400).json({
            success: false,
            message: "Datos del producto inválidos."
        });
    }

    const result = db.prepare(`
        UPDATE products
        SET name = ?, price = ?, image = ?
        WHERE id = ?
    `).run(name.trim(), price, image || "", id);

    res.json({ success: result.changes > 0 });
});

// ELIMINAR PRODUCTO (SOLO ADMINISTRADOR)
app.delete("/api/products/:id", requireAdmin, (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id)) {
        return res.status(400).json({
            success: false,
            message: "ID inválido."
        });
    }

    const result = db.prepare(
        "DELETE FROM products WHERE id = ?"
    ).run(id);

    res.json({ success: result.changes > 0 });
});
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, () => {
    console.log(`Servidor funcionando en http://localhost:${PORT}`);
});