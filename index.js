require("dotenv").config();
const http = require("http");
const { neon } = require("@neondatabase/serverless");

// Connect to Neon
const sql = neon(process.env.DATABASE_URL);

// Helper to parse POST JSON body
const parseBody = (req) =>
  new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(err);
      }
    });
  });

// Create books table if not exists
async function createBooksTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS books (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      published_year INT
    )
  `;
  console.log("Books table ready!");
}

// Function to set CORS headers
function setCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*"); // allow any origin
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );
}

// Handle requests
const requestHandler = async (req, res) => {
  setCorsHeaders(res);

  // Handle preflight request for CORS
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }

  if (req.url === "/" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("Server is running\n");
  } 
  else if (req.url === "/add-book" && req.method === "POST") {
    try {
      const { title, author, published_year } = await parseBody(req);

      const result = await sql`
        INSERT INTO books (title, author, published_year)
        VALUES (${title}, ${author}, ${published_year})
        RETURNING *
      `;

      res.writeHead(201, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result[0]));
    } catch (err) {
      console.error(err);
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Invalid request or database error" }));
    }
  } 
  else if (req.url === "/books" && req.method === "GET") {
    try {
      const books = await sql`SELECT * FROM books ORDER BY id ASC`;
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(books));
    } catch (err) {
      console.error(err);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Database error" }));
    }
  } 
  else {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not Found\n");
  }
};

// Start server
http.createServer(requestHandler).listen(process.env.PORT || 3000, async () => {
  await createBooksTable();
  console.log(`Server running at http://localhost:${process.env.PORT || 3000}`);
});
