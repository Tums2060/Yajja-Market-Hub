import "dotenv/config";
import { defineConfig } from "drizzle-kit";
import path from "path";

const dialect = (process.env.DB_DIALECT ?? "postgres").toLowerCase();
const isMysql = dialect === "mysql" || dialect === "mariadb";

function mysqlCredentials() {
  const url = process.env.DATABASE_URL;
  if (url && /^mysql:\/\//i.test(url)) return { url };
  return {
    host: process.env.DB_HOST ?? "127.0.0.1",
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? "root",
    password: process.env.DB_PASSWORD ?? "",
    database: process.env.DB_NAME ?? "",
  };
}

export default isMysql
  ? defineConfig({
    schema: path.join(__dirname, "./src/schema-mysql/index.ts"),
    out: path.join(__dirname, "./drizzle-mysql"),
    dialect: "mysql",
    dbCredentials: mysqlCredentials(),
  })
  : (() => {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL, ensure the database is provisioned");
    }
    return defineConfig({
      schema: path.join(__dirname, "./src/schema/index.ts"),
      out: path.join(__dirname, "./drizzle"),
      dialect: "postgresql",
      dbCredentials: { url: process.env.DATABASE_URL },
    });
  })();
