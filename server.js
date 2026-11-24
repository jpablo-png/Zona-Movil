
const express = require("express");
require("dotenv").config();

const path = require("path");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const { sqlite, initDB } = require("./database");

const app = express();
const PORT = 3000;

// CONFIGURACIÓN
app.use(express.json({ limit: "1mb" }));

app.use(
    session({
        secret: process.env.SESSION_SECRET || "zona-movil-local-secret",
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            sameSite: "strict",
            secure: false,
            maxAge: 1000 * 60 * 60 * 2
        }
    })
);

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

// INICIAR SESIÓN
app.post("/api/login", async (req, res) => {
    try {
        const { username, password } = req.body || {};

        if (
            typeof username !== "string" ||
            typeof password !== "string" ||
            username !== process.env.ADMIN_USER ||
            !process.env.ADMIN_PASSWORD_HASH ||
            !(await bcrypt.compare(
                password,
                process.env.ADMIN_PASSWORD_HASH
            ))
        ) {
            return res.status(401).json({
                success: false,
                message: "Usuario o contraseña incorrectos."
            });
        }

        req.session.regenerate((err) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    message: "Error al iniciar sesión."
                });
            }

            req.session.isAdmin = true;

            res.json({ success: true });
        });

    } catch (error) {
        console.error("Error de inicio de sesión:", error);

        res.status(500).json({
            success: false,
            message: "Error al iniciar sesión."
        });
    }
});

// VERIFICAR SESIÓN
app.get("/api/session", (req, res) => {
    res.json({
        isAdmin: req.session.isAdmin === true
    });
});

// CERRAR SESIÓN
app.post("/api/logout", (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: "Error al cerrar sesión."
            });
        }

        res.clearCookie("connect.sid");

        res.json({ success: true });
    });
});

// CONSULTAR PRODUCTOS
app.get("/api/products", (req, res) => {
    try {
        const products = sqlite.prepare(`
            SELECT * FROM products
            ORDER BY id DESC
        `).all();

        res.json(products);

    } catch (error) {
        console.error("Error al consultar productos:", error);

        res.status(500).json({
            success: false,
            message: "Error al consultar productos."
        });
    }
});

// CONSULTAR PEDIDOS
app.get("/api/orders", requireAdmin, (req, res) => {
    try {
        const orders = sqlite.prepare(`
            SELECT * FROM orders
            ORDER BY id DESC
        `).all();

        res.json(orders);

    } catch (error) {
        console.error("Error al consultar pedidos:", error);

        res.status(500).json({
            success: false,
            message: "Error al consultar pedidos."
        });
    }
});

// REGISTRAR PEDIDOS
app.post("/api/orders", (req, res) => {
    try {
        const {
            customer_name,
            phone,
            address,
            items
        } = req.body || {};

        if (
            typeof customer_name !== "string" ||
            !customer_name.trim() ||
            typeof phone !== "string" ||
            !phone.trim() ||
            typeof address !== "string" ||
            !address.trim() ||
            !Array.isArray(items) ||
            items.length === 0 ||
            items.length > 100
        ) {
            return res.status(400).json({
                success: false,
                message: "Datos del pedido inválidos."
            });
        }

        const insertOrder = sqlite.prepare(`
            INSERT INTO orders
            (customer_name, phone, address, total)
            VALUES (?, ?, ?, ?)
        `);

        const findProduct = sqlite.prepare(`
            SELECT id, name, price
            FROM products
            WHERE id = ?
        `);

        const insertItem = sqlite.prepare(`
            INSERT INTO order_items
            (order_id, product_name, quantity, price)
            VALUES (?, ?, ?, ?)
        `);

        const saveOrder = sqlite.transaction(() => {
            let total = 0;
            const validItems = [];

            for (const item of items) {
                const productId = Number(item.product_id);
                const quantity = Number(item.quantity);

                if (
                    !Number.isSafeInteger(productId) ||
                    productId <= 0 ||
                    !Number.isSafeInteger(quantity) ||
                    quantity < 1 ||
                    quantity > 100
                ) {
                    throw new Error("Producto o cantidad inválidos.");
                }

                const product = findProduct.get(productId);

                if (!product) {
                    throw new Error("Uno de los productos no existe.");
                }

                const price = Number(product.price);

                total += price * quantity;

                validItems.push({
                    name: product.name,
                    price,
                    quantity
                });
            }

            if (!Number.isFinite(total) || total <= 0) {
                throw new Error("El total del pedido no es válido.");
            }

            const orderResult = insertOrder.run(
                customer_name.trim(),
                phone.trim(),
                address.trim(),
                total
            );

            const orderId = Number(orderResult.lastInsertRowid);

            for (const item of validItems) {
                insertItem.run(
                    orderId,
                    item.name,
                    item.quantity,
                    item.price
                );
            }

            return { orderId, total };
        });

        const result = saveOrder();

        res.status(201).json({
            success: true,
            orderId: result.orderId,
            message: "Pedido registrado correctamente."
        });

    } catch (error) {
        console.error("Error al registrar pedido:", error);

        res.status(400).json({
            success: false,
            message: error.message || "No se pudo registrar el pedido."
        });
    }
});

// AGREGAR PRODUCTO
app.post("/api/products", requireAdmin, (req, res) => {
    try {
        const { name, price, image } = req.body || {};
        const productPrice = Number(price);

        if (
            typeof name !== "string" ||
            !name.trim() ||
            !Number.isFinite(productPrice) ||
            productPrice <= 0 ||
            (image !== undefined && typeof image !== "string")
        ) {
            return res.status(400).json({
                success: false,
                message: "Datos del producto inválidos."
            });
        }

        const result = sqlite.prepare(`
            INSERT INTO products (name, price, image)
            VALUES (?, ?, ?)
        `).run(
            name.trim(),
            productPrice,
            image || ""
        );

        res.status(201).json({
            success: true,
            id: Number(result.lastInsertRowid)
        });

    } catch (error) {
        console.error("Error al agregar producto:", error);

        res.status(500).json({
            success: false,
            message: "Error al agregar producto."
        });
    }
});

// EDITAR PRODUCTO
app.put("/api/products/:id", requireAdmin, (req, res) => {
    try {
        const id = Number(req.params.id);
        const { name, price, image } = req.body || {};
        const productPrice = Number(price);

        if (
            !Number.isSafeInteger(id) ||
            id <= 0 ||
            typeof name !== "string" ||
            !name.trim() ||
            !Number.isFinite(productPrice) ||
            productPrice <= 0 ||
            (image !== undefined && typeof image !== "string")
        ) {
            return res.status(400).json({
                success: false,
                message: "Datos del producto inválidos."
            });
        }

        const result = sqlite.prepare(`
            UPDATE products
            SET name = ?, price = ?, image = ?
            WHERE id = ?
        `).run(
            name.trim(),
            productPrice,
            image || "",
            id
        );

        if (result.changes === 0) {
            return res.status(404).json({
                success: false,
                message: "Producto no encontrado."
            });
        }

        res.json({ success: true });

    } catch (error) {
        console.error("Error al editar producto:", error);

        res.status(500).json({
            success: false,
            message: "Error al editar producto."
        });
    }
});

// ELIMINAR PRODUCTO
app.delete("/api/products/:id", requireAdmin, (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isSafeInteger(id) || id <= 0) {
            return res.status(400).json({
                success: false,
                message: "ID inválido."
            });
        }

        const result = sqlite.prepare(`
            DELETE FROM products
            WHERE id = ?
        `).run(id);

        if (result.changes === 0) {
            return res.status(404).json({
                success: false,
                message: "Producto no encontrado."
            });
        }

        res.json({ success: true });

    } catch (error) {
        console.error("Error al eliminar producto:", error);

        res.status(500).json({
            success: false,
            message: "No se pudo eliminar el producto."
        });
    }
});

// MOSTRAR LA TIENDA
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

// INICIAR SERVIDOR
async function startServer() {
    try {
        initDB();

        app.listen(PORT, () => {
            console.log(
                `Zona-Movil funcionando en http://localhost:${PORT}`
            );
        });

    } catch (error) {
        console.error("Error al iniciar el servidor:", error);
        process.exit(1);
    }
}

startServer();
