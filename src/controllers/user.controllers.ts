import { ApiResponse } from "../utils/ApiResponse";
import { ApiError } from "../utils/ApiError";
import { PrismaClient, UserType, Prisma } from "@prisma/client";
import { Request, Response } from "express";
import { z } from "zod";
import bcrypt, { hash } from "bcrypt";
import jwt, { SignOptions } from "jsonwebtoken";
import { sendOTP } from "../utils/SendOTP";

const prisma = new PrismaClient();
const saltRounds = 10;
const jwtSecret = process.env.JWT_SECRET;
const registrationSchema = z.object({
  name: z
    .string()
    .min(3, "Full name must be at least 3 characters long")
    .max(50, "Full name must not exceed 50 characters"),

  email: z.string().email("Invalid email format"),

  password: z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .max(20, "Password must not exceed 20 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(
      /[@$!%*?&#]/,
      "Password must contain at least one special character"
    ),

  phone: z.string().regex(/^\d{10}$/, "Phone number must be exactly 10 digits"),

  dateOfBirth: z
    .string()
    .refine(
      (value) => !isNaN(Date.parse(value)),
      "Date of birth must be a valid date."
    )
    .refine((value) => {
      const dob = new Date(value);
      const today = new Date();
      const age = today.getFullYear() - dob.getFullYear();
      return age >= 0 && age <= 150; // Ensure date isn't in the future or unrealistically old.
    }, "Date of birth must be a valid age."),

  gender: z.enum(["male", "female", "other"], {
    errorMap: () => ({ message: "Gender must be Male, Female, or Other." }),
  }),
});
const phoneSchema = z
  .string()
  .regex(/^\d{10}$/, "Phone number must be exactly 10 digits");
const emailSchema = z.string().email({ message: "Invalid email format" });

function generateOtp(): string {
  const otp = Math.floor(100000 + Math.random() * 900000);
  return otp.toString();
      // await prisma.otp.create({
      //   data: {
      //     userID: user.userID,
      //     phone: newPhone,
      //     otpCode: otpCode.toString(),
      //     expiresAt: new Date(Date.now() + 10 * 60 * 1000), // OTP valid for 10 minutes
      //   },
      // });
}

// generate accessToken
const generateAccessToken = (user: {
  userId: string;
  email: string;
  phone: string;
}): string => {
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

  if (!jwtSecret)
    throw new Error("JWT secret is not defined in environment variables");

  try {
    return jwt.sign(payload, jwtSecret, { expiresIn });
  } catch (error) {
    console.error("Token generation failed:", error);
    throw new Error("Token generation failed");
  }
};
// generate refreshToken
const generateRefreshToken = (user: { userId: string }): string => {
  const payload: Object = { userId: user.userId };
  const expiresIn = process.env.REFRESH_TOKEN_EXPIRE_IN
    ? parseInt(process.env.REFRESH_TOKEN_EXPIRE_IN)
    : "7d";
  // console.log(expiresIn);

  const secret = process.env.REFRESH_TOKEN_SECRET;
  if (!secret)
    throw new Error("Missing REFRESH_TOKEN_SECRET in environment variable");

  try {
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
  const accessTokenSecret = process.env.JWT_SECRET;
  const refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET;
  const accessTokenExpire = process.env.ACCESS_TOKEN_EXPIRE_IN
    ? parseInt(process.env.ACCESS_TOKEN_EXPIRE_IN)
    : "15min";
  const refreshTokenExpire = process.env.REFRESH_TOKEN_EXPIRE_IN
    ? parseInt(process.env.REFRESH_TOKEN_EXPIRE_IN)
    : "7d";

  if (!accessTokenSecret || !refreshTokenSecret)
    throw new Error("Secret  is invalid!");

  try {
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
    console.log("error in generating access token: ", error);
    throw new Error("Error in generating access token!");
  }
};

// get all users.........................................................................
const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await prisma.users.findMany();
    res.status(200).json({ message: "OK", data: users });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// get user by id
const getUser = async (req: Request, res: Response) => {
  try {
    const userDetail = req.body.user;
    if(!userDetail || !userDetail.userId) {
      res.status(401).json(new ApiError("User details missing", 401));
      return;
    }

    const currentUser = await prisma.users.findUnique({
      where: {
        userID: userDetail.userId
      }
    });
    if(!userDetail){
      res.status(404).json(new ApiError("User detail not found!", 404));
    }
    res.status(200).json(new ApiResponse("Success", 200, "User data Fetched", currentUser))
  } catch (error) {
    console.error("Error while getting user details: ", error);
    res.status(500).json(new ApiError("Internal server error", 500));
  }
}

// register user.........................................................................
const registerUser = async (req: Request, res: Response) => {
  try {
    const { name, email, phone, password, gender, dateOfBirth } = req.body;
    console.log(req.body);

    // validate fields
    try {
      registrationSchema.parse({
        name,
        email,
        phone,
        password,
        gender,
        dateOfBirth,
      });
    } catch (error) {
      const errorMessage = (error as z.ZodError).message;
      console.log(errorMessage);
      res
        .status(400)
        .json(new ApiError("validation error", 400, undefined, errorMessage));
      return;
    }

    // check if user already exist
    const user = await prisma.users.findFirst({
      where: {
        OR: [{ phone }, { email }],
      },
    });
    if (user) {
      res.status(409).json({ message: "user already exist" });
      return;
    }

    // password hashing
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // create new user
    const newUser = await prisma.users.create({
      data: {
        name: name,
        email: email,
        phone: phone,
        password: hashedPassword,
        userType: UserType.user,
        gender: gender,
        dateOfBirth: new Date(dateOfBirth),
      },
    });

    let accessToken, refreshToken;
    try {
      accessToken = generateAccessToken({
        userId: newUser.userID,
        email: newUser.email,
        phone: newUser.phone,
      });
    } catch (err) {
      await prisma.users.delete({
        where: { phone },
      });
      console.error("Token generation failed:", err);
      res
        .status(500)
        .json(new ApiError("User registration failed", 500, undefined, null));
      return;
    }
    try {
      refreshToken = generateRefreshToken({ userId: newUser.userID });
      await prisma.users.update({
        where: {
          phone: newUser.phone,
        },
        data: {
          refreshToken: refreshToken,
        },
      });
    } catch (err) {
      await prisma.users.delete({
        where: { phone },
      });
      console.error("Token generation failed:", err);
      res
        .status(500)
        .json(new ApiError("User registration failed", 500, undefined, null));
      return;
    }

    res
      .status(201)
      .json({
        message: "User registered successfully",
        accessToken,
        refreshToken,
      });
  } catch (error) {
    console.error("Error during registration:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// login user..........................................................
const loginUser = async (req: Request, res: Response) => {
  try {
    const { phone } = req.body;
    console.log(phone);

    // validate phone no...
    try {
      phoneSchema.parse(phone);
    } catch (error) {
      const errorMessage = (error as z.ZodError).message;
      console.log(errorMessage);
      res
        .status(400)
        .json(new ApiError("validation error", 400, undefined, errorMessage));
      return;
    }
    const message = "I am testing for OTP based varification!"
    const result = await sendOTP({
      message: message,
      phoneNumber: phone,
      isTest: "true"
    });
    console.log(result);
    return;


    // check if user registered
    const user = await prisma.users.findUnique({
      where: {
        phone: phone,
      },
    });
    if (!user) {
      res.status(404).json({ message: "User Not Found!" });
      return;
    }
    const OTP = generateOtp();
    // this OTP will be sent via phone no and will be saved in database.
    

    // jwt...
    // let token;
    // try {
    //   token = generateAccessToken({
    //     userId: user.userID,
    //     email: user.email,
    //     phone: user.phone,
    //   });
    // } catch (err) {
    //   await prisma.users.delete({
    //     where: { phone },
    //   });
    //   console.error("Token generation failed:", err);
    //   res.status(500).json({ message: "User registration failed" });
    //   return;
    // }

    res.status(200).json({ message: "log in successful!", token: "no token" });
  } catch (error) {
    console.error("Error during Login:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// renew access and refresh token...
const refreshAccessToken = async (req: Request, res: Response) => {
  const refreshToken = req.headers.authorization?.split(" ")[1];
  console.log(refreshToken);
  if (!refreshToken) {
    res
      .status(401)
      .json(new ApiError("Unauthorized request: Token missing", 401));
    return;
  }
  // varify refresh token
  const secret = process.env.REFRESH_TOKEN_SECRET;
  if (!secret) throw new Error("Secret  is invalid!");

  let decodedToken: jwt.JwtPayload;
  try {
    decodedToken = jwt.verify(refreshToken, secret) as jwt.JwtPayload;
  } catch (error) {
    console.error("Invalid refresh token:", error);
    res
      .status(403)
      .json(new ApiError("Forbidden: Invalid or expired token", 403));
    return;
  }

  const { userId } = decodedToken;
  if (!userId) {
    throw new Error("Refresh token missing userId");
  }

  try {
    const user = await prisma.users.findUnique({
      where: {
        userID: userId,
      },
    });
    if (user?.refreshToken !== refreshToken) {
      res.status(404).json(new ApiError("Invalid refresh token", 404));
      return;
    }

    if (!user || !user.userID || !user.email || !user.phone) {
      throw new Error("Invalid user data!");
    }
    const { newAccessToken, newRefreshToken } = generateAccessandRefreshToken({
      userId: user.userID,
      email: user.email,
      phone: user.phone,
    });
    const result = await prisma.users.update({
      where: {
        userID: userId,
      },
      data: {
        refreshToken: newRefreshToken,
      },
    });
    console.log(result);

    res
      .status(201)
      .json(
        new ApiResponse("Success", 201, "Token Generated", {
          newAccessToken,
          newRefreshToken,
        })
      );
  } catch (error) {
    console.error(error);
    res.status(500).json(new ApiError("Internal Server error", 500));
  }
};

// Update Phone no...
const updatePhone = async (req: Request, res: Response) => {
  try {
    // const { newPhone, userDetail } = req.body;
    const newPhone = req.body.phone;
    const userDetail = req.body.user;
    console.log(userDetail);

    if (!userDetail || !userDetail.userId) {
      res.status(401).json(new ApiError("User detail missing", 401));
      return;
    }

    // validate phone no...
    try {
      phoneSchema.parse(newPhone);
    } catch (error) {
      console.error(error);
      if (error instanceof z.ZodError) {
        res.status(400).json(new ApiError("Invalid Phone Number", 400, undefined, error.errors));
        return;
      }
      res.status(500).json(new ApiError("Unexpected error during validation", 500));
      return;
    }

    // Find current user
    const currentUser = await prisma.users.findUnique({
      where: { userID: userDetail.userId },
    });

    if (!currentUser) {
      res.status(404).json(new ApiError("User not found", 404));
      return;
    }

    // Check if the new phone is the same as the current one
    if (newPhone === currentUser.phone) {
      res.status(400).json(new ApiError("Phone remains unchanged", 400));
      return;
    }

    // Check if the phone is already used by another user
    const existingUser = await prisma.users.findUnique({
      where: {
        phone: newPhone
      },
    });
    if (existingUser) {
      res
        .status(409)
        .json(new ApiError("This phone is already in use by another account", 409));
      return;
    }

    // update phone no...
    const data = await prisma.users.update({
      where: {
        userID: userDetail.userId,
      },
      data: {
        phone: newPhone,
      },
    });
    
    res.status(200).json(new ApiResponse("Success", 200, "Phone updated", data))
  } catch (error) {
    console.error("Error while updating phone: ", error);
    res.status(500).json(new ApiError("Internal server error", 500));
  }
};

// update email...
const updateEmail = async (req: Request, res: Response) => {
  try {
    // const { newEmail, userDetail } = req.body;
    const newEmail = req.body.email;
    const userDetail = req.body.user;
    console.log(newEmail);
    // validate email...
    try {
      emailSchema.parse(newEmail);
    } catch (error) {
      console.error(error);
      if (error instanceof z.ZodError) {
        res.status(400).json(new ApiError("Invalid Email", 400, undefined, error.errors));
        return;
      }
      res.status(500).json(new ApiError("Unexpected error during validation", 500));
      return;
    }

    if (!userDetail || !userDetail.userId) {
      res.status(401).json(new ApiError("User detail missing", 401));
      return;
    }

    // Find the current user
    const currentUser = await prisma.users.findUnique({
      where: { userID: userDetail.userId },
    });

    if (!currentUser) {
      res.status(404).json(new ApiError("User not found", 404));
      return;
    }

    // Check if the new email is the same as the current one
    if (newEmail === currentUser.email) {
      res.status(200).json(new ApiError("Email remains unchanged", 200));
      return;
    }

    // Check if the email is already used by another user
    const existingUser = await prisma.users.findUnique({
      where: {
        email: newEmail
      },
    });
    if (existingUser) {
      res
        .status(409)
        .json(new ApiError("Email is already in use by another account", 409));
      return;
    }

    // update email ...
    const data = await prisma.users.update({
      where: {
        userID: userDetail.userId,
      },
      data: {
        email: newEmail,
      },
    });
    res.status(200).json(new ApiResponse("Success", 200, "Email Updated", data.email))
  } catch (error) {
    console.error("Error while updating email: ", error);
    res.status(500).json(new ApiError("Internal server error", 500));
  }
};

// add address...
const addAddress = async (req: Request, res: Response) => {
  try {
    const {
      name,
      patientName,
      phone,
      state,
      pinCode,
      city,
      localityArea,
      landmark,
    } = req.body;
    console.log(req.body.user);
    if (
      !name ||
      !patientName ||
      !phone ||
      !state ||
      !pinCode ||
      !city ||
      !localityArea ||
      !landmark
    ) {
      res.status(400).json(new ApiError("All field are required", 400));
      return;
    }
    const userDetail = req.body.user;
    if (!userDetail || !userDetail.userId) {
      res.status(401).json(new ApiError("User details missing", 401));
      return;
    }

    // find is eddress exist for the user
    const result = await prisma.addressDetails.findUnique({
      where: {
        userID: userDetail.userId,
      },
    });
    if (result) {
      res
        .status(409)
        .json(new ApiError("Address already exist, try updating it!", 409));
    }

    const newAddress = await prisma.addressDetails.create({
      data: {
        userID: userDetail.userId,
        state: state,
        pinCode: pinCode,
        city: city,
        patientName: patientName,
        name: name, // this name refers to the attendent name
        phone: phone,
        localityArea: localityArea,
        landmark: landmark,
      },
    });
    if (newAddress) {
      const pushIdToUser = await prisma.users.update({
        where: {
          userID: newAddress.userID
        },
        data: {
          addressDetailsId: newAddress.id
        }
      });
      if(!pushIdToUser){
        const deleteAddress = await prisma.addressDetails.delete({
          where: {
            id: newAddress.id
          }
        });
        res.status(500).json(new ApiError("Internal server error!", 500));
      }
    }
    res.status(201).json(new ApiResponse("Success",201,"Address added successfuly",newAddress));
  } catch (error) {
    console.error("Error adding address:", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      res
        .status(500)
        .json(new ApiError("Database error while adding address", 500));
    }
    res.status(500).json(new ApiError("Internal server error", 500));
  }
};

// update address...
const updateAddress = async (req: Request, res: Response) => {
  try {
    const {
      name,
      patientName,
      phone,
      state,
      pinCode,
      city,
      localityArea,
      landmark,
    } = req.body;
    console.log(req.body.user);
    if (
      !name ||
      !patientName ||
      !phone ||
      !state ||
      !pinCode ||
      !city ||
      !localityArea ||
      !landmark
    ) {
      res.status(400).json(new ApiError("All field are required", 400));
      return;
    }
    const userDetail = req.body.user;
    if (!userDetail || !userDetail.userId) {
      res.status(401).json(new ApiError("User details missing", 401));
      return;
    }

    // finding existing address for the user
    const existingAddress = await prisma.addressDetails.findUnique({
      where: {
        userID: userDetail.userId,
      },
    });
    if (!existingAddress) {
      res
        .status(404)
        .json(new ApiError("Address don't exist, try adding it!", 404));
      return;
    } else if (
      existingAddress.name === name &&
      existingAddress.patientName === patientName &&
      existingAddress.phone === phone &&
      existingAddress.state === state &&
      existingAddress.pinCode === pinCode &&
      existingAddress.city === city &&
      existingAddress.localityArea === localityArea &&
      existingAddress.landmark === landmark
    ) {
      res
        .status(200)
        .json(
          new ApiResponse(
            "Failed",
            200,
            "Address remains unchanged",
            existingAddress
          )
        );
      return;
    }

    // update
    const updatedAddress = await prisma.addressDetails.update({
      where: {
        userID: userDetail.userId,
      },
      data: {
        state: state,
        pinCode: pinCode,
        city: city,
        patientName: patientName,
        name: name, // this name refers to the attendent name
        phone: phone,
        localityArea: localityArea,
        landmark: landmark,
      },
    });

    res.status(201).json(new ApiResponse("Success",201,"Address updated successfuly",updatedAddress));
  } catch (error) {
    console.error("Error adding address:", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      res
        .status(500)
        .json(new ApiError("Database error while adding address", 500));
    } else res.status(500).json(new ApiError("Internal server error", 500));
  }
};

export {
  getAllUsers,
  registerUser,
  getUser,
  loginUser,
  addAddress,
  refreshAccessToken,
  updatePhone,
  updateEmail,
  updateAddress,
};


