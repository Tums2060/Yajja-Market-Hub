import express, { type Express } from "express";
import path from "path";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

// Behind Replit's reverse proxy — required so express-rate-limit can read the
// real client IP from X-Forwarded-For.
app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const uploadsDir = path.resolve(process.cwd(), "uploads");
app.use("/uploads", express.static(uploadsDir));

app.use("/api", router);

// 404 for unmatched API routes — consistent error shape.
app.use("/api", (req, res) => {
  res.status(404).json({ success: false, error: "Not found", code: "NOT_FOUND" });
});

// Centralized error handler — consistent error shape { success, error, code? }.
app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  (req as any).log?.error?.({ err }, "Unhandled error");
  const status = err?.status || err?.statusCode || 500;
  res.status(status).json({
    success: false,
    error: status === 500 ? "Internal server error" : err?.message || "Request failed",
    code: err?.code || "INTERNAL_ERROR",
  });
});

export default app;
