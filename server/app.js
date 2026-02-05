import express from "express";
import cors from "cors";
import ErrorMiddleware from "./middleware/Error.js";

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.json({
    status: 200,
    success: true,
    message: "Welcome to Pattys",
  });
});

app.use(ErrorMiddleware);

export default app;
