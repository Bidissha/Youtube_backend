import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);

app.use(express.json({ limit: "16kb" }));
app.use(
  express.urlencoded({
    extended: true,
    limit: "16kb",
  })
);
app.use(express.static("public"));
app.use(cookieParser());

//importing routes
import userRouter from "./routes/user.routes.js";

// declaration of routes    app.get() for routers and controllers on same place here everythings separated so need app.use() for usage of middleware
app.use("/api/v1/users", userRouter);

export { app };
