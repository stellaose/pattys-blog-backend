import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config({ quiet: true });

const db = `mongodb+srv://${process.env.DB_NAME}:${process.env.DB_PASSWORD}@${process.env.DB_USER}.suvynon.mongodb.net/?appName=${process.env.DB_CLUSTER_NAME}`;

const databaseConnect = {
  getConnect: () => {
    mongoose
      .connect(db)
      .then(() => console.log("Database connected successfully"));
  },
};

export default databaseConnect;
