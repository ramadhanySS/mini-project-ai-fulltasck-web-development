require("dotenv").config();

const express = require("express");
const { Pool } = require("pg");

const app = express();
const pool = new Pool({
	connectionString: process.env.DATABASE_URL,
});
const port = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: "1mb" }));
app.use((request, response, next) => {
	response.setHeader("Access-Control-Allow-Origin", "*");
	response.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
	response.setHeader("Access-Control-Allow-Headers", "Content-Type");

	if (request.method === "OPTIONS") {
		return response.sendStatus(204);
	}

	next();
});

function asyncRoute(handler) {
	return (request, response, next) => {
		Promise.resolve(handler(request, response, next)).catch(next);
	};
}

function parseProductId(value) {
	const id = Number(value);
	return Number.isInteger(id) && id > 0 ? id : null;
}

function validateProduct(body = {}) {
	const errors = [];

	if (typeof body.name !== "string" || !body.name.trim()) {
		errors.push("name harus berupa teks dan tidak boleh kosong");
	}
	if (!Number.isFinite(Number(body.price)) || Number(body.price) <= 0) {
		errors.push("price harus berupa angka lebih besar dari 0");
	}
	if (!Number.isInteger(Number(body.size_ml)) || Number(body.size_ml) <= 0) {
		errors.push("size_ml harus berupa bilangan bulat lebih besar dari 0");
	}
	if (typeof body.description !== "string") {
		errors.push("description harus berupa teks");
	}
	if (!Array.isArray(body.accords) || !body.accords.every((item) => typeof item === "string")) {
		errors.push("accords harus berupa array teks");
	}
	if (!Array.isArray(body.images) || !body.images.every((item) => typeof item === "string")) {
		errors.push("images harus berupa array teks");
	}

	return errors;
}

function validateOrder(body = {}) {
	const errors = [];

	if (typeof body.customer_name !== "string" || !body.customer_name.trim() || body.customer_name.trim().length > 120) {
		errors.push("customer_name harus berupa teks dengan panjang 1-120 karakter");
	}
	if (
		typeof body.email !== "string" ||
		!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim()) ||
		body.email.trim().length > 254
	) {
		errors.push("email harus berupa alamat email yang valid");
	}
	if (
		typeof body.shipping_address !== "string" ||
		body.shipping_address.trim().length < 8 ||
		body.shipping_address.trim().length > 500
	) {
		errors.push("shipping_address harus berisi 8-500 karakter");
	}
	if (
		!Array.isArray(body.items) ||
		body.items.length === 0 ||
		body.items.length > 50 ||
		!body.items.every((item) =>
			item &&
			parseProductId(item.product_id) !== null &&
			Number.isInteger(item.quantity) &&
			item.quantity >= 1 &&
			item.quantity <= 10
		)
	) {
		errors.push("items harus berisi 1-50 produk dengan ID valid dan jumlah 1-10");
	} else if (new Set(body.items.map((item) => Number(item.product_id))).size !== body.items.length) {
		errors.push("setiap produk hanya boleh muncul satu kali di items");
	}

	return errors;
}

app.get("/api/health", asyncRoute(async (request, response) => {
	await pool.query("SELECT 1");
	response.json({ status: "ok", database: "connected" });
}));

app.get("/api/products", asyncRoute(async (request, response) => {
	const { rows } = await pool.query("SELECT * FROM products ORDER BY id ASC");
	response.json(rows);
}));

app.get("/api/products/:id", asyncRoute(async (request, response) => {
	const id = parseProductId(request.params.id);
	if (!id) return response.status(400).json({ error: "ID produk tidak valid" });

	const { rows } = await pool.query("SELECT * FROM products WHERE id = $1", [id]);
	if (rows.length === 0) return response.status(404).json({ error: "Produk tidak ditemukan" });

	response.json(rows[0]);
}));

app.post("/api/orders", asyncRoute(async (request, response) => {
	const errors = validateOrder(request.body);
	if (errors.length) return response.status(400).json({ errors });

	const client = await pool.connect();
	try {
		await client.query("BEGIN");
		const productIds = [...new Set(request.body.items.map((item) => Number(item.product_id)))];
		const { rows: products } = await client.query(
			"SELECT id, name, price FROM products WHERE id = ANY($1::integer[]) FOR UPDATE",
			[productIds],
		);
		const productsById = new Map(products.map((product) => [product.id, product]));
		if (productsById.size !== productIds.length) {
			await client.query("ROLLBACK");
			return response.status(400).json({ error: "Satu atau lebih produk tidak ditemukan" });
		}

		const items = request.body.items.map((item) => {
			const product = productsById.get(Number(item.product_id));
			return {
				product,
				quantity: item.quantity,
				subtotalCents: Math.round(Number(product.price) * 100) * item.quantity,
			};
		});
		const totalCents = items.reduce((sum, item) => sum + item.subtotalCents, 0);
		const { rows: orderRows } = await client.query(
			`INSERT INTO orders (customer_name, email, shipping_address, total_amount)
			 VALUES ($1, $2, $3, $4)
			 RETURNING id, customer_name, email, shipping_address, total_amount, created_at`,
			[
				request.body.customer_name.trim(),
				request.body.email.trim(),
				request.body.shipping_address.trim(),
				(totalCents / 100).toFixed(2),
			],
		);
		const order = orderRows[0];

		for (const item of items) {
			await client.query(
				`INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity, subtotal)
				 VALUES ($1, $2, $3, $4, $5, $6)`,
				[
					order.id,
					item.product.id,
					item.product.name,
					Number(item.product.price).toFixed(2),
					item.quantity,
					(item.subtotalCents / 100).toFixed(2),
				],
			);
		}

		await client.query("COMMIT");
		response.status(201).json({ ...order, items: items.map(({ product, quantity, subtotalCents }) => ({
			product_id: product.id,
			product_name: product.name,
			quantity,
			subtotal: (subtotalCents / 100).toFixed(2),
		})) });
	} catch (error) {
		await client.query("ROLLBACK");
		throw error;
	} finally {
		client.release();
	}
}));

app.post("/api/products", asyncRoute(async (request, response) => {
	const errors = validateProduct(request.body);
	if (errors.length) return response.status(400).json({ errors });

	const { name, price, size_ml: sizeMl, description, accords, images } = request.body;
	const { rows } = await pool.query(
		`INSERT INTO products (name, price, size_ml, description, accords, images)
		 VALUES ($1, $2, $3, $4, $5, $6)
		 RETURNING *`,
		[name.trim(), price, sizeMl, description.trim(), accords, JSON.stringify(images)],
	);

	response.status(201).json(rows[0]);
}));

app.put("/api/products/:id", asyncRoute(async (request, response) => {
	const id = parseProductId(request.params.id);
	if (!id) return response.status(400).json({ error: "ID produk tidak valid" });

	const errors = validateProduct(request.body);
	if (errors.length) return response.status(400).json({ errors });

	const { name, price, size_ml: sizeMl, description, accords, images } = request.body;
	const { rows } = await pool.query(
		`UPDATE products
		 SET name = $1, price = $2, size_ml = $3, description = $4,
				 accords = $5, images = $6, updated_at = CURRENT_TIMESTAMP
		 WHERE id = $7
		 RETURNING *`,
		[name.trim(), price, sizeMl, description.trim(), accords, JSON.stringify(images), id],
	);
	if (rows.length === 0) return response.status(404).json({ error: "Produk tidak ditemukan" });

	response.json(rows[0]);
}));

app.delete("/api/products/:id", asyncRoute(async (request, response) => {
	const id = parseProductId(request.params.id);
	if (!id) return response.status(400).json({ error: "ID produk tidak valid" });

	const { rowCount } = await pool.query("DELETE FROM products WHERE id = $1", [id]);
	if (rowCount === 0) return response.status(404).json({ error: "Produk tidak ditemukan" });

	response.status(204).end();
}));

app.use((error, request, response, next) => {
	if (response.headersSent) return next(error);
	if (error instanceof SyntaxError && "body" in error) {
		return response.status(400).json({ error: "JSON request tidak valid" });
	}

	console.error(error);
	response.status(500).json({ error: "Terjadi kesalahan pada server" });
});

async function startServer() {
	await pool.query(`
		CREATE TABLE IF NOT EXISTS products (
			id SERIAL PRIMARY KEY,
			name TEXT NOT NULL,
			price NUMERIC(10, 2) NOT NULL CHECK (price > 0),
			size_ml INTEGER NOT NULL CHECK (size_ml > 0),
			description TEXT NOT NULL DEFAULT '',
			accords TEXT[] NOT NULL DEFAULT '{}',
			images JSONB NOT NULL DEFAULT '[]',
			created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
		)
	`);
	await pool.query(`
		CREATE TABLE IF NOT EXISTS app_metadata (
			key TEXT PRIMARY KEY,
			created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
		)
	`);
	await pool.query(`
		CREATE TABLE IF NOT EXISTS orders (
			id SERIAL PRIMARY KEY,
			customer_name TEXT NOT NULL,
			email TEXT NOT NULL,
			shipping_address TEXT NOT NULL,
			total_amount NUMERIC(12, 2) NOT NULL CHECK (total_amount > 0),
			created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
		)
	`);
	await pool.query(`
		CREATE TABLE IF NOT EXISTS order_items (
			id SERIAL PRIMARY KEY,
			order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
			product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
			product_name TEXT NOT NULL,
			unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price > 0),
			quantity INTEGER NOT NULL CHECK (quantity > 0),
			subtotal NUMERIC(12, 2) NOT NULL CHECK (subtotal > 0)
		)
	`);

	const client = await pool.connect();
	try {
		await client.query("BEGIN");
		const { rowCount } = await client.query(
			"INSERT INTO app_metadata (key) VALUES ('initial-product-seeded') ON CONFLICT DO NOTHING",
		);

		if (rowCount > 0) {
			await client.query(
				`INSERT INTO products (name, price, size_ml, description, accords, images)
				 SELECT $1, $2, $3, $4, $5, $6
				 WHERE NOT EXISTS (SELECT 1 FROM products)`,
				[
					"Molecule 01 + Champaca",
					135,
					100,
					"Molecule 01 mengangkat Iso E Super, molekul dengan kesan kayu yang lembut dan dekat dengan kulit. Dipadukan dengan Champaca, hasilnya memberi kontras floral yang hangat dan transparan.",
					["Woody", "Floral", "Aromatic"],
					JSON.stringify([
						"https://scdn.speedsize.com/54343ecb-8aeb-4686-af82-3f829e50d808/www.escentric.com/cdn/shop/files/M01_Champaca_100ml_Solo_St_On_Bottle_OnBaseLine.jpg?v=1762356623&width=1100",
						"https://scdn.speedsize.com/54343ecb-8aeb-4686-af82-3f829e50d808/www.escentric.com/cdn/shop/files/1280x1280_CHAMPACA_4.jpg?v=1784023303&width=1100",
						"https://scdn.speedsize.com/54343ecb-8aeb-4686-af82-3f829e50d808/www.escentric.com/cdn/shop/files/M01_Champaca_100ml_Bottle_Carton_St_On_OnBaseLine.jpg?v=1762356623&width=1100",
					]),
				],
			);
		}

		await client.query(
			"INSERT INTO app_metadata (key) VALUES ('second-product-seeded') ON CONFLICT DO NOTHING",
		);

		const { rowCount: escentric04Migration } = await client.query(
			"INSERT INTO app_metadata (key) VALUES ('escentric-04-product-seeded') ON CONFLICT DO NOTHING",
		);
		if (escentric04Migration > 0) {
			const product = [
				"Escentric 04",
				130,
				100,
				"Escentric 04 menonjolkan Javanol, molekul sandalwood yang transparan, dengan kesegaran grapefruit merah muda dan lime. Juniper, pink pepper, orris, dan rose melengkapi aroma woody yang segar dan berkilau.",
				["Grapefruit", "Sandalwood", "Woody", "Fresh"],
				JSON.stringify([
					"https://cdn.shopify.com/s/files/1/0855/9220/files/E04_100ml_Solo_St_On_Bottle.jpg?v=1739882715",
					"https://cdn.shopify.com/s/files/1/0855/9220/files/E04_100ml_Bottle_Carton_St_On.jpg?v=1739882715",
				]),
			];
			const { rows: existingProducts } = await client.query(
				"SELECT id FROM products WHERE name IN ('Escentric 04', 'Molecule 02') ORDER BY CASE WHEN name = 'Escentric 04' THEN 0 ELSE 1 END LIMIT 1",
			);

			if (existingProducts.length) {
				await client.query(
					`UPDATE products
					 SET name = $1, price = $2, size_ml = $3, description = $4, accords = $5, images = $6,
						 updated_at = CURRENT_TIMESTAMP
					 WHERE id = $7`,
					[...product, existingProducts[0].id],
				);
			} else {
				await client.query(
					`INSERT INTO products (name, price, size_ml, description, accords, images)
					 VALUES ($1, $2, $3, $4, $5, $6)`,
					product,
				);
			}
		}

		await client.query("COMMIT");
	} catch (error) {
		await client.query("ROLLBACK");
		throw error;
	} finally {
		client.release();
	}

	app.listen(port, () => {
		console.log(`API berjalan di http://localhost:${port}`);
	});
}

if (require.main === module) {
	startServer().catch((error) => {
		console.error("Gagal menginisialisasi database PostgreSQL:", error);
		process.exitCode = 1;
	});
}

module.exports = { app, pool, startServer };
