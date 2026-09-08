const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const DEFAULT_PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_FILE = path.join(__dirname, 'data', 'products.json');

// MIME types mapping
const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// Helper: load products safely
function loadProducts() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('[ALURA Server] Error reading products file:', err.message);
    return [];
  }
}

// Helper: send JSON response
function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=UTF-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(data));
}

// Helper: parse request body
function parseRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      if (body.length > 1e6) {
        // Guard against massive payloads (> 1MB)
        req.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!body) {
        return resolve({});
      }
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(new Error('Invalid JSON format'));
      }
    });
    req.on('error', reject);
  });
}

// Helper: serve static files
function serveStaticFile(reqPath, res) {
  let safePath = path.normalize(reqPath).replace(/^(\.\.[\/\\])+/, '');
  if (safePath === '/' || safePath === '\\') {
    safePath = '/index.html';
  }

  const filePath = path.join(PUBLIC_DIR, safePath);

  // Prevent directory traversal outside PUBLIC_DIR
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // If not found, return 404
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache'
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
}

// Create HTTP server
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  // Enable CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }

  // --- API Endpoints ---

  // 1. GET /api/products
  if (method === 'GET' && pathname === '/api/products') {
    const products = loadProducts();
    const { category, sort, q } = parsedUrl.query;

    let results = [...products];

    // Category filter
    if (category && category.toLowerCase() !== 'all') {
      results = results.filter(
        p => p.category.toLowerCase() === category.toLowerCase()
      );
    }

    // Search keyword query
    if (q) {
      const query = q.toLowerCase().trim();
      results = results.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.subtitle.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query) ||
        p.composition.toLowerCase().includes(query)
      );
    }

    // Sorting
    if (sort === 'price-asc') {
      results.sort((a, b) => a.price - b.price);
    } else if (sort === 'price-desc') {
      results.sort((a, b) => b.price - a.price);
    } else if (sort === 'name') {
      results.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sort === 'newest') {
      results.reverse();
    }

    return sendJSON(res, 200, {
      count: results.length,
      products: results
    });
  }

  // 2. GET /api/products/:id
  if (method === 'GET' && pathname.startsWith('/api/products/')) {
    const id = pathname.replace('/api/products/', '').trim();
    const products = loadProducts();
    const product = products.find(p => p.id.toLowerCase() === id.toLowerCase());

    if (!product) {
      return sendJSON(res, 404, { error: 'Product not found' });
    }

    return sendJSON(res, 200, product);
  }

  // 3. GET /api/categories
  if (method === 'GET' && pathname === '/api/categories') {
    const products = loadProducts();
    const categoryMap = {};

    products.forEach(p => {
      categoryMap[p.category] = (categoryMap[p.category] || 0) + 1;
    });

    const categories = Object.keys(categoryMap).map(cat => ({
      name: cat,
      count: categoryMap[cat]
    }));

    return sendJSON(res, 200, {
      total: products.length,
      categories: [
        { name: 'All', count: products.length },
        ...categories
      ]
    });
  }

  // 4. POST /api/checkout
  if (method === 'POST' && pathname === '/api/checkout') {
    try {
      const data = await parseRequestBody(req);
      const { items, customer, shippingAddress } = data;

      if (!items || !Array.isArray(items) || items.length === 0) {
        return sendJSON(res, 400, { error: 'Bag is empty or items format is invalid' });
      }

      // Calculate totals
      const allProducts = loadProducts();
      let subtotal = 0;
      const verifiedItems = [];

      for (const item of items) {
        const prod = allProducts.find(p => p.id === item.id);
        if (prod) {
          const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
          const itemTotal = prod.price * qty;
          subtotal += itemTotal;
          verifiedItems.push({
            id: prod.id,
            name: prod.name,
            size: item.size || 'M',
            color: item.color || (prod.colors[0] ? prod.colors[0].name : 'Default'),
            unitPrice: prod.price,
            quantity: qty,
            total: itemTotal,
            image: prod.images[0]
          });
        }
      }

      const shipping = 0; // Complimentary atelier courier
      const taxRate = 0.0825; // 8.25% standard luxury tax
      const estimatedTax = Math.round(subtotal * taxRate);
      const grandTotal = subtotal + shipping + estimatedTax;

      // Generate order number
      const randomSuffix = Math.floor(100000 + Math.random() * 900000);
      const orderId = `ALR-2026-${randomSuffix}`;

      // Estimated courier delivery: 3 business days from now
      const deliveryDate = new Date();
      deliveryDate.setDate(deliveryDate.getDate() + 3);

      const confirmation = {
        orderId,
        status: 'Confirmed & Sent to Atelier',
        createdAt: new Date().toISOString(),
        customer: {
          name: customer?.name || 'Valued Client',
          email: customer?.email || 'client@alura.com'
        },
        shippingAddress: shippingAddress || {
          address: 'Private Residence',
          city: 'New York',
          postalCode: '10001',
          country: 'United States'
        },
        delivery: {
          carrier: 'ALURA White-Glove Courier',
          estimatedArrival: deliveryDate.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric'
          }),
          packaging: 'Rigid Atelier Box with Silk Ribbon & Garment Dust Bag'
        },
        pricing: {
          subtotal,
          shipping: 'Complimentary Express',
          tax: estimatedTax,
          grandTotal
        },
        items: verifiedItems
      };

      return sendJSON(res, 201, confirmation);
    } catch (err) {
      return sendJSON(res, 400, { error: err.message });
    }
  }

  // 5. POST /api/newsletter
  if (method === 'POST' && pathname === '/api/newsletter') {
    try {
      const data = await parseRequestBody(req);
      const email = (data.email || '').trim().toLowerCase();

      if (!email || !email.includes('@') || !email.includes('.')) {
        return sendJSON(res, 400, { error: 'Please enter a valid email address' });
      }

      return sendJSON(res, 200, {
        success: true,
        message: `Your invitation to private salon presentations has been registered for ${email}.`
      });
    } catch (err) {
      return sendJSON(res, 400, { error: err.message });
    }
  }

  // --- Static Files ---
  serveStaticFile(pathname, res);
});

// Start listener with port fallback
function startServer(port) {
  server.listen(port, () => {
    console.log(`\n=================================================`);
    console.log(`  ALURA ATELIER — SERVER ACTIVE`);
    console.log(`  Local URL:  http://localhost:${port}`);
    console.log(`  API Ready:  http://localhost:${port}/api/products`);
    console.log(`=================================================\n`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`[ALURA Server] Port ${port} is in use, trying port ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error('[ALURA Server] Critical server error:', err);
    }
  });
}

startServer(DEFAULT_PORT);
