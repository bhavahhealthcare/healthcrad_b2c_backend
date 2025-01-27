import { ApiResponse } from "../utils/ApiResponse";
import { ApiError } from "../utils/ApiError";
import { PrismaClient, UserType } from "@prisma/client";
import { Request, Response } from "express";
import { z } from "zod";
import bcrypt, { hash } from "bcrypt";
import jwt from "jsonwebtoken";

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
const phoneSchema = z.string().regex(/^\d{10}$/, "Phone number must be exactly 10 digits");
function generateOtp(): string {
  const otp = Math.floor(100000 + Math.random() * 900000);
  return otp.toString();
}



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
    if (user){
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

    const payload = {
      id: newUser.userID,
      email: newUser.email,
      phone: newUser.phone,
    };
    if (!jwtSecret) {
      throw new Error("JWT secret is not defined");
    }
    let token;
    try {
      token = jwt.sign(payload, jwtSecret);
    } catch (err) {
      await prisma.users.delete({
        where: { phone },
      });
      console.error("Token generation failed:", err);
      res.status(500).json({ message: "User registration failed" });
      return; 
    }

    res.status(201).json({ message: "User registered successfully", token });
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
      phoneSchema.parse(phone)
    } catch (error) {
      const errorMessage = (error as z.ZodError).message;
      console.log(errorMessage);
      res.status(400).json(new ApiError("validation error", 400, undefined, errorMessage));
      return;
    }

    // check if user registered
    const user = await prisma.users.findUnique({
      where: {
        phone: phone
      }
    });
    if(!user) {
      res.status(404).json({message: "User Not Found!"});
      return;
    }
    const OTP = generateOtp();
    // this OTP will be sent via phone no and will be saved in database.

    // jwt...
    const payload = {
      id: user.userID,
      email: user.email,
      phone: user.phone,
    };
    if(!jwtSecret) {
      res.status(500).json({message: "Internal Server Error!"});
      return;
    }
    let token;
    try {
      token = jwt.sign(payload, jwtSecret);
    } catch (error) {
      console.log(error);
      res.status(500).json({message: "JWT Token Not Generated!"});
      return;
    }

    res.status(200).json({message: "log in successful!", token: token});

  } catch (error) {
    console.error("Error during Login:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};


// Update Phone no...
const updatePhone = async (req: Request, res: Response) => {
  const { phone } = req.body;

  // validate phone no...
  try {
    phoneSchema.parse(phone);
  } catch (error) {
    const errorMessage = (error as z.ZodError).message;
    console.log(errorMessage);
    res.status(400).json(new ApiError("Invalid Phone No!", 400, undefined, errorMessage));
    return;
  }

  // check if user Exist...
  const user = await prisma.users.findUnique({
    where: {
      phone: phone
    }
  });
  if(!user) {
    res.status(404).json(new ApiResponse("Failed", 400, "User not Found", undefined));
  }
  // verify phone no...
  const OTP = generateOtp();
  // OTP will be sent to the user vis phone no and will be stored to database

  
}

export { getAllUsers, registerUser, loginUser };
