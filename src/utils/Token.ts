import jwt from "jsonwebtoken";
import { ApiError } from "./ApiError";

// generate accessToken
const generateAccessToken = (user: {
	userId: string;
	email: string;
	phone: string;
}): string => {
	try {
		const payload = {
			userId: user.userId,
			email: user.email,
			phone: user.phone,
		};
		const jwtSecret = process.env.JWT_SECRET;
		const expiresIn = process.env.ACCESS_TOKEN_EXPIRE_IN
			? parseInt(process.env.ACCESS_TOKEN_EXPIRE_IN)
			: "1h";
		// console.log(expiresIn);

		if (!jwtSecret) {
			throw new Error("JWT secret is not defined in environment variables");
		}

		return jwt.sign(payload, jwtSecret, { expiresIn });
	} catch (error) {
		console.error("Token generation failed:", error);
		throw new Error("Token generation failed");
	}
};

// generate refreshToken
const generateRefreshToken = (user: { userId: string }): string => {
	try {
		const payload: Object = { userId: user.userId };
		const expiresIn = process.env.REFRESH_TOKEN_EXPIRE_IN
			? parseInt(process.env.REFRESH_TOKEN_EXPIRE_IN)
			: "7d";

		const secret = process.env.REFRESH_TOKEN_SECRET;
		if (!secret) {
			throw new Error("Missing REFRESH_TOKEN_SECRET in environment variable");
		}

		return jwt.sign(payload, secret, { expiresIn: expiresIn });
	} catch (error) {
		console.error("Refresh-Token generation failed:", error);
		throw new Error("Token generation failed");
	}
};
// generate access and refresh token...
const generateAccessandRefreshToken = (user: {
	userId: string;
	email: string;
	phone: string;
}) => {
	try {
		const accessTokenSecret = process.env.JWT_SECRET;
		const refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET;
		const accessTokenExpire = process.env.ACCESS_TOKEN_EXPIRE_IN
			? parseInt(process.env.ACCESS_TOKEN_EXPIRE_IN)
			: "15min";
		const refreshTokenExpire = process.env.REFRESH_TOKEN_EXPIRE_IN
			? parseInt(process.env.REFRESH_TOKEN_EXPIRE_IN)
			: "7d";

		if (!accessTokenSecret || !refreshTokenSecret)
			throw new ApiError("Secret  is not defined!", 500);


		const newAccessToken = jwt.sign(
			{
				userId: user.userId,
				email: user.email,
				phone: user.phone,
			},
			accessTokenSecret,
			{ expiresIn: accessTokenExpire }
		);
		const newRefreshToken = jwt.sign(
			{
				userId: user.userId,
			},
			refreshTokenSecret,
			{ expiresIn: refreshTokenExpire }
		);

		return { newAccessToken, newRefreshToken };
	} catch (error) {
		if(error instanceof ApiError) throw error;
		throw new ApiError("Error in generating access token!", 500);
	}
};

export {
	generateAccessToken,
	generateRefreshToken,
	generateAccessandRefreshToken,
};
