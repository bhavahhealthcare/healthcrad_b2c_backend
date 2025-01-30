import { Request, Response, NextFunction } from "express";
import Jwt from "jsonwebtoken";
import { ApiError } from "../utils/ApiError";


const verifyToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const accessToken = req.headers.authorization?.split(" ")[1];
        // console.log(accessToken);
        if(!accessToken) {
            res.status(401).json(new ApiError("Unauthorized request: Token missing", 401));
            return;
        }
        const accessTokenSecret = process.env.JWT_SECRET;
        if(!accessTokenSecret) {
            console.error("JWT_SECRET is not defined");
            res.status(500).json(new ApiError("Internal server error", 500));
            return;
        }

        const decodedInfo = Jwt.verify(accessToken, accessTokenSecret);
        req.body.user = decodedInfo;
        // console.log("Token verified");
        next();
    } catch (err) {
        console.error("Unexpected error during token verification: ", err);
        // if (err instanceof Jwt.JsonWebTokenError) {
        //     res.status(401).json(new ApiError("Invalid token", 401));
        //     return;
        // } else 
        if (err instanceof Jwt.TokenExpiredError) {
            res.status(401).json(new ApiError("Token exired", 401));
            return;
        } else res.status(500).json(new ApiError("Internal server error", 500));
    }
}


export {
    verifyToken
}