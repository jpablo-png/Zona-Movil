
const express = require("express");
require("dotenv").config();
const path = require("path");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const { db, initDB } = require("./database");

const app = express();
const PORT = process.env.PORT || 3000;

// CONFIGURACIÓN DEL SERVIDOR
app.set("trust proxy", 1);

app.use(express.json());

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: "strict",
        secure: process.env.NODE_ENV === "production",
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
    try {
        const { username, password } = req.body;

        if (
            username !== process.env.ADMIN_USER ||
            !await bcrypt.compare(
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

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Error al iniciar sesión."
        });
    }
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
app.get("/api/products", async (req, res) => {
    try {
        const result = await db.query(
            "SELECT * FROM products ORDER BY id DESC"
        );

        res.json(result.rows);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Error al consultar productos."
        });
    }
});

// CONSULTAR PEDIDOS (SOLO ADMINISTRADOR)
app.get("/api/orders", requireAdmin, async (req, res) => {
    try {
        const result = await db.query(`
            SELECT * FROM orders
            ORDER BY id DESC
        `);

        res.json(result.rows);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Error al consultar pedidos."
        });
    }
});

// REGISTRAR PEDIDOS
app.post("/api/orders", async (req, res) => {
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

    let client;

    try {
        client = await db.connect();

        await client.query("BEGIN");

        let total = 0;
        const validItems = [];

        for (const item of items) {
            const productId = Number(item.product_id);
            const quantity = Number(item.quantity);

            if (
                !Number.isInteger(productId) ||
                !Number.isInteger(quantity) ||
                quantity < 1
            ) {
                throw new Error("Producto o cantidad inválidos.");
            }

            const productResult = await client.query(
                "SELECT id, name, price FROM products WHERE id = $1",
                [productId]
            );

            const product = productResult.rows[0];

            if (!product) {
                throw new Error("Producto o cantidad inválidos.");
            }

            const price = Number(product.price);

            total += price * quantity;

            validItems.push({
                name: product.name,
                price,
                quantity
            });
        }

        const orderResult = await client.query(`
            INSERT INTO orders (customer_name, phone, address, total)
            VALUES ($1, $2, $3, $4)
            RETURNING id
        `, [
            customer_name.trim(),
            phone.trim(),
            address.trim(),
            total
        ]);

        const orderId = orderResult.rows[0].id;

        for (const item of validItems) {
            await client.query(`
                INSERT INTO order_items
                (order_id, product_name, quantity, price)
                VALUES ($1, $2, $3, $4)
            `, [
                orderId,
                item.name,
                item.quantity,
                item.price
            ]);
        }

        await client.query("COMMIT");

        res.status(201).json({
            success: true,
            orderId,
            message: "Pedido registrado correctamente."
        });

    } catch (error) {
        if (client) {
            await client.query("ROLLBACK");
        }

        console.error(error);

        res.status(400).json({
            success: false,
            message: error.message
        });

    } finally {
        if (client) {
            client.release();
        }
    }
});

// AGREGAR PRODUCTO (SOLO ADMINISTRADOR)
app.post("/api/products", requireAdmin, async (req, res) => {
    try {
        const { name, price, image } = req.body;
        const productPrice = Number(price);

        if (
            typeof name !== "string" ||
            !name.trim() ||
            !Number.isFinite(productPrice) ||
            productPrice <= 0
        ) {
            return res.status(400).json({
                success: false,
                message: "Datos del producto inválidos."
            });
        }

        const result = await db.query(`
            INSERT INTO products (name, price, image)
            VALUES ($1, $2, $3)
            RETURNING id
        `, [
            name.trim(),
            productPrice,
            image || ""
        ]);

        res.status(201).json({
            success: true,
            id: result.rows[0].id
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Error al agregar producto."
        });
    }
});

// EDITAR PRODUCTO (SOLO ADMINISTRADOR)
app.put("/api/products/:id", requireAdmin, async (req, res) => {
    try {
        const { name, price, image } = req.body;
        const id = Number(req.params.id);
        const productPrice = Number(price);

        if (
            !Number.isInteger(id) ||
            typeof name !== "string" ||
            !name.trim() ||
            !Number.isFinite(productPrice) ||
            productPrice <= 0
        ) {
            return res.status(400).json({
                success: false,
                message: "Datos del producto inválidos."
            });
        }

        const result = await db.query(`
            UPDATE products
            SET name = $1, price = $2, image = $3
            WHERE id = $4
        `, [
            name.trim(),
            productPrice,
            image || "",
            id
        ]);

        res.json({
            success: result.rowCount > 0
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Error al editar producto."
        });
    }
});

// ELIMINAR PRODUCTO (SOLO ADMINISTRADOR)
app.delete("/api/products/:id", requireAdmin, async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id)) {
            return res.status(400).json({
                success: false,
                message: "ID inválido."
            });
        }

        const result = await db.query(
            "DELETE FROM products WHERE id = $1",
            [id]
        );

        res.json({
            success: result.rowCount > 0
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Error al eliminar producto."
        });
    }
});

// MOSTRAR LA TIENDA
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

// INICIAR SERVIDOR DESPUÉS DE CONECTAR LA BASE DE DATOS
async function startServer() {
    try {
        await initDB();

        app.listen(PORT, () => {
            console.log(`Servidor funcionando en el puerto ${PORT}`);
        });

    } catch (error) {
        console.error("Error al iniciar el servidor:", error);
        process.exit(1);
    }
}

startServer();
