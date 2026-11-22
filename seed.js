
const db = require("./database");

// PRODUCTOS ORIGINALES DE ZONA-MOVIL
const products = [
    {
        name: "Samsung Galaxy S24 Ultra",
        price: 4497000,
        image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBLHEc7d_w3-5YHWhPY8hffod13KuxsUeDaQq1IHLU_Wv3zIvarRieAv1lMQd_gxf4VrQBiIemBsYLrKUXHN8bIkTNGDAM2Q8m5LTT-0bPe3ovQjDYcek8whuDjlDsEUlhiPvcFjzdVfwo19fVqaa2sk3H42Y3k8gjJzbAdf5bFd__TBx_8gGuGHlK_VwX2HDguvFgR4y1w3n1cIMtadv8odZN9Nl9NIlH8wUWifLo"
    },
    {
        name: "iPhone 15 Pro Max",
        price: 4151000,
        image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBZH4oQgkthZy1U7Gc7kHmk8VFqnmxnd-rJH6PRDcQegd2CGPgTc1kCDLHozcf9-SotZhj7HtrVJxpgAWAuGCBDcHHLF8ZGoVgvEN8n7IkziupTcPzeTt_7QEseo_5a4YuiOPIWpzPj-8yrnB58nnPyAzJG35HgE_ln52bSxvK-GyAHoJKKVgyh61_d39Nxj4stdYP_hCpfartP3gWfmxXm5od8zeLhXNcdSNc7Jg4"
    },
    {
        name: "Google Pixel 8 Pro",
        price: 3112000,
        image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBGNpdntzeXhi5KMe01P5_NAdMEywfP-2uhGhC-F28wxgC7CqVEkBTbID4IgK-FGsmPaIX62JYH284X6Tu6UUg3xgbwTDx4p0BI0o_MKWINWFFC6L2ZQNUtAcpCQo2GUUrnBUBXzcab_COERkZZd_mA5paHwKzHsatnHlovCDCtvHKUeKRo4XXV5lPoCRXaG-KPgM3GWnsN_IQZc_qPKA03aEA-gSq6OlcVcAl8om4"
    },
    {
        name: "AirPods Pro (2.ª Gen)",
        price: 862000,
        image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBezT4jzooDPNPDZtdsyEeLDip3l-Ut2IUJqielgd9ekPazpaR-qV54HWqxBRUxcaM02uoNu_Hac_EbpAxOLLVAKtMkqkGZuZkEFDcjEA_NG3nmwokbT6nfWVcJrGB8_A6pYMvxxo5PqtL_C3kIg47KB09Ol7MvpYfzKKaXA1t4pBfylbllaWz3PWOVIFa17rDMZRGiY-UzX7XXjFXW31mtnulIbXIxHaPUs2bd7Rw"
    },
    {
        name: "Cargador Anker Prime 140W GaN",
        price: 225000,
        image: "https://lh3.googleusercontent.com/aida-public/AB6AXuAD1kogonB2-j95_4euHtqftkoYfex3o1hv4gOVXb0CffPeTWeznfCXPN5EPQfdWi-D1Hh3On3fljd7iJGG2C_gUbFLUZycjHoS56qQWyNJ_hL7C1lv3RcgWX8dZC6HoUW4eq1Np92q-Hrb4fz_-aHQN2xXI_ouljNWZG2dKI6RVjXgyswq2sWV5p1VkpvIlU1iabTES-UeB1qTP03R9e0mOmSLqdec8y0TnuuZ1xI"
    },
    {
        name: "Apple Watch Ultra 2",
        price: 2766000,
        image: "https://lh3.googleusercontent.com/aida-public/AB6AXuB9HXdljbuOB3Jm6xtW7TGcNKNeD4mc5foED0ARF-Tli-JzwhfhHayLGZ3jkZcANRB2wi7VGm74p2dnU14xg3cKOvj3VWA5C0zLdGZgwjxi6bbIozcOKK0tnUXlUfWP8-NMXUY1FVFw-zbxY0ST9tFSfa_4Z_8cviOVk9404moTxnlkn8xktYx8ntXxkLI2xdj5s-WF6HEo3AzUk8BoyC4276LgCssfU7rzxDJhylI"
    },
    {
        name: "Xiaomi 14 Ultra",
        price: 3805000,
        image: "https://lh3.googleusercontent.com/aida-public/AB6AXuCNPxLKQk998ZL-ZKcvvtxZtuN7wQ5W6sQI3XXzgOzLFJcneCLkOtrIjtZXl6whsOuA92B7o8n3PXMWYW6t4hvJh2O7v1-kke-Y38fVzMQPE35JNysGCymUiJh4b5xWK5VoHWo9g599D9GS_BXHjU6Ti4oABU7Al1WuWI6hfdF34NIFMU3QvyDpY3sVe8X3lSoqyWlp70y5po91sxRWm3isAiDmS4yAsOwolwIIeg4"
    },
    {
        name: "Batería Magnética Anker MagGo 10K",
        price: 204000,
        image: "https://lh3.googleusercontent.com/aida-public/AB6AXuC0aMfawVZrlND3jHsiBTbwaKXZU_IFlTC4akUArJ4_XXiKLR0YKjMLFzrxzE771PTjWb08WAljm6EQpOQme9EyaRh2we0LRof8glsh0XT2i5JD-Zg4EaKeS5BUCYfbKYCb-mPizxHjfKJoexxnU937tzmUaD8n8aK0elXydL8Gyg6nXZaQyHOkRqgz529HOYf13QDboVWSmmZ-1EN95fY0SLxpDSEKiQfD81eW8os"
    }
];

// INSERTAR SOLO SI LA TABLA ESTÁ VACÍA
const total = db.prepare("SELECT COUNT(*) AS cantidad FROM products").get();

if (total.cantidad === 0) {
    const insert = db.prepare(`
        INSERT INTO products (name, price, image)
        VALUES (?, ?, ?)
    `);

    const seed = db.transaction(() => {
        products.forEach(product => {
            insert.run(product.name, product.price, product.image);
        });
    });

    seed();
    console.log("Se guardaron los 8 productos originales.");
} else {
    console.log("La base de datos ya tiene productos. No se realizaron cambios.");
}

db.close();
