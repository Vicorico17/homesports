if (process.env.NODE_ENV === "production" || process.env.VERCEL) throw new Error("Demo mode cannot run in production.");
process.env.PICK_PREDICT_DEMO = "true";
await import("../src/server.js");
