import express from "express";
import cors from "cors";


const app = express();


// cors configuration
app.use(cors());


// common middlewares
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));



// import routers...
import userRouter from "./routes/user.routes"


// routes
app.get("/api/v1/", (req, res) => {
    res.status(200).json({
        name: "rituraj bhardwaj",
        age: 21,
        message: "Success"
    });
})
app.use("/api/v1/users", userRouter);


export default app;