import express from "express"; 
import cors from "cors";
import dotenv from "dotenv";
import fileRoutes from "./src/routes/fileRoutes.js"
import authRoutes from "./src/routes/userRoutes.js"
import versionRoutes from "./src/routes/versionRoutes.js";
import permissionRoutes from "./src/routes/permissionRoutes.js"
import corsOptions from "./src/config/corsConfig.js";

dotenv.config();
const app = express()

app.use(express.json())
app.use(cors(corsOptions));

app.use("/files", fileRoutes)
app.use("/auth", authRoutes)
app.use("/permissions", permissionRoutes)
app.use("/versions", versionRoutes);

app.get("/app-test", (req,res)=>{
    res.status(200).json({success: "application is running"})
})

const PORT = process.env.PORT || 8000;
app.listen(PORT, ()=>{console.log(`server is running on PORT ${PORT}`)})