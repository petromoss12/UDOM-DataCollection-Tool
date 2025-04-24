import * as bcrypt from "bcryptjs";
import { Client } from "pg";

const PG_HOST = process.env.PG_HOST || "localhost";
const PG_PORT = parseInt(process.env.PG_PORT || "5432");
const PG_USER = process.env.PG_USER || "postgres";
const PG_PASSWORD = process.env.PG_PASSWORD || "ally";
const PG_DATABASE = process.env.PG_DATABASE || "DataCollection";
const USERS_TABLE = "users"; 

bcrypt.setRandomFallback((len: number) => {
  const buf = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    buf[i] = Math.random() * 256 | 0;
  }
  const numberArray: number[] = Array.from(buf);
  return numberArray;
});

async function connectToDatabase() {
  const client = new Client({
    host: PG_HOST,
    port: PG_PORT,
    user: PG_USER,
    password: PG_PASSWORD,
    database: PG_DATABASE,
  });
  await client.connect();
  return client;
}

export default async function (request: Request, context: any): Promise<Response> {
  if (request.method === "POST") {
    try {
      const client = await connectToDatabase();
      const body = await request.json();
      const username = body.username;
      const password = body.password;

      if (!username || !password) {
        await client.end();
        return new Response(
          JSON.stringify({ success: false, message: "username and password are required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const query = `SELECT id, username, password FROM ${USERS_TABLE} WHERE username = $1`;
      const result = await client.query(query, [username]);
      const user = result.rows[0];

      await client.end();

      if (user && bcrypt.compareSync(password, user.password)) {
        const token = "TEMP_TOKEN_" + Math.random().toString(36).substring(2, 15);
        const expiresIn = new Date(Date.now() + 3600000).toISOString(); // 1 hour

        const responseBody = {
          success: true,
          message: "Login successful",
          user: {
            userID: user.id, 
            username: user.username,
          },
          token: token,
          expiresin: expiresIn,
        };

        return new Response(JSON.stringify(responseBody), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } else {
        return new Response(
          JSON.stringify({ success: false, message: "Invalid credentials" }),
          {
            status: 401,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    } catch (error: any) {
      console.error("Database error during login:", error);
      return new Response(
        JSON.stringify({ success: false, message: "Login failed due to a server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  } else {
    return new Response(JSON.stringify({ message: "Method Not Allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }
}