import { Request, Response } from "express";
import { PrismaClient, Prisma } from "@prisma/client";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { z } from "zod";
import { Jwt } from "jsonwebtoken";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();

const phoneSchema = z
  .string()
  .regex(/^\d{10}$/, "Phone number must be exactly 10 digits");

// generate accessToken
const generateAccessToken = (user: {
    userId: string;
    phone: string;
}): string => {
  const payload = {
    userId: user.userId,
    phone: user.phone,
  };
  const jwtSecret = process.env.JWT_SECRET;
  const expiresIn = process.env.ACCESS_TOKEN_EXPIRE_IN
    ? parseInt(process.env.ACCESS_TOKEN_EXPIRE_IN)
    : "1h";

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
  phone: string;
}) => {

  try {
    const newAccessToken = generateAccessToken({userId: user.userId, phone: user.phone});
    const newRefreshToken = generateRefreshToken({userId: user.userId})

    return { newAccessToken, newRefreshToken };
  } catch (error) {
    console.log("error in generating access token: ", error);
    throw new Error("Error in generating access token!");
  }
}

// endpoints....
const registerDoctor = async (req: Request, res: Response) => {
  try {
    const phone = req.body.phone;
    // validate phone number
    phoneSchema.parse(phone);

    // check if this phone exist in database...
    const existingDoctor = await prisma.doctor.findUnique({
      where: {
        phoneNumber: phone,
      },
    });

    if (existingDoctor) {
      res
        .status(400)
        .json(
          new ApiError(
            "This phone is already registered with another account.",
            400
          )
        );
      return;
    }

    // if not exist in database then register phone...
    const createDoctor = await prisma.doctor.create({
      data: {
        phoneNumber: phone,
      },
    });
    
    // generate accessToken and refreshToken
    let accessToken;
    try {
      const { newAccessToken, newRefreshToken } = generateAccessandRefreshToken(
        {
          userId: createDoctor.id,
          phone: createDoctor.phoneNumber,
        }
      );
      accessToken = newAccessToken;
      console.log(accessToken, newRefreshToken);
      // now update refresh token in database...
      const addTokenToDatabase = await prisma.doctor.update({
        where: {
          id: createDoctor.id
        },
        data: {
          refreshToken: newRefreshToken
        }
      });
    } catch (error) {
      // if there is any error in generating access and refresh token then delete user form databse
      const deleteDoctor = await prisma.doctor.delete({
        where: {
          id: createDoctor.id
        }
      });
      res.status(500).json(new ApiError("Internal server error, try again!", 500));
      return;
    }
    

    // send OTP to validate Phone no...
    // verify OTP if not varified then delete registered doctor and send client error

    
    res
      .status(201)
      .json(
        new ApiResponse(
          "Success",
          201,
          "Account created successfully",
          {accessToken: accessToken}
        )
      );


  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("zod error: ", error);
      res.status(400).json(new ApiError("Validation error.", 400));
      return;
    }

    // prisma error
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error?.code === "P2002") {
        res
          .status(400)
          .json(new ApiError("This phone number is already in use.", 400));
        return;
      }
    } else if (error instanceof Prisma.PrismaClientInitializationError) {
      console.error("Failed to connect to database!");
      res.status(500).json(new ApiError("Couldn't connect to database.", 500));
      return;
    } else if (error instanceof Prisma.PrismaClientValidationError) {
      console.error("Invalid data.");
      res.status(400).json(new ApiError("Invalid data.", 400));
      return;
    }
    console.error("Error while registering doctor: ", error);
    res.status(500).json(new ApiError("Internal server error.", 500));
  }
};

const loginDoctor = async (req: Request, res: Response) => {
  try {
    const phone = req.body.phone;
    // validate phone number
    phoneSchema.parse(phone);

    // check if this phone exist in database...
    const existingDoctor = await prisma.doctor.findUnique({
      where: {
        phoneNumber: phone,
      },
    });
    if (!existingDoctor) {
      res
        .status(404)
        .json(
          new ApiError(
            "Account not found",
            404
          )
        );
      return;
    }

    // generate accessToken and refreshToken
    let accessToken;
    try {
      const { newAccessToken, newRefreshToken } = generateAccessandRefreshToken(
        {
          userId: existingDoctor.id,
          phone: existingDoctor.phoneNumber,
        }
      );
      accessToken = newAccessToken;
      console.log(accessToken, newRefreshToken);
      // now update refresh token in database...
      const addTokenToDatabase = await prisma.doctor.update({
        where: {
          id: existingDoctor.id
        },
        data: {
          refreshToken: newRefreshToken
        }
      });
    } catch (error) {
      // if there is any error in generating access and refresh token then delete user form databse
      const deleteDoctor = await prisma.doctor.delete({
        where: {
          id: existingDoctor.id
        }
      });
      res.status(500).json(new ApiError("Internal server error, try again!", 500));
      return;
    }

    // send OTP to verify current user...

    res.status(200).json(new ApiResponse("Success", 200, "Logged in!", {accessToken: accessToken}));

  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("zod error: ", error);
      res.status(400).json(new ApiError("Validation error.", 400));
      return;
    }

    // prisma error
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error?.code === "P2002") {
        res
          .status(400)
          .json(new ApiError("This phone number is already in use.", 400));
        return;
      }
    } else if (error instanceof Prisma.PrismaClientInitializationError) {
      console.error("Failed to connect to database!");
      res.status(500).json(new ApiError("Couldn't connect to database.", 500));
      return;
    } else if (error instanceof Prisma.PrismaClientValidationError) {
      console.error("Invalid data.");
      res.status(400).json(new ApiError("Invalid data.", 400));
      return;
    }
    console.error("Error while login: ", error);
    res.status(500).json(new ApiError("Internal server error.", 500));
  }
};

const logoutDoctor = async (req: Request, res: Response) => {
  try {
    const doctorCredential = req.body.credentials;
    if(!doctorCredential || !doctorCredential.userId || !doctorCredential.phone) {
      res.status(400).json(new ApiError("invalid credentials.", 400));
      return;
    }
    const newAccessToken = generateAccessToken({userId: "abcd", phone: "0000000000"});
    // delete refreshToken from database...
    const result = await prisma.doctor.update({
      where: {
        id: doctorCredential.userId
      },
      data: {
        refreshToken: null
      }
    });
    if (!result) {
      res.status(404).json(new ApiError("User not found.", 404));
      return;
    }

    res.status(200).json(new ApiResponse("Success", 200, "Logged out", null));
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("zod error: ", error);
      res.status(400).json(new ApiError("Validation error.", 400));
      return;
    }

    // prisma error...
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error("Prisma known error: ", error);
      res.status(400).json(new ApiError("Database error.", 400));
      return;
    } else if (error instanceof Prisma.PrismaClientUnknownRequestError) {
      console.error("Prisma unknown error: ", error);
      res.status(500).json(new ApiError("Unknown database error.", 500));
      return;
    }
    
    console.error("Error while login: ", error);
    res.status(500).json(new ApiError("Internal server error.", 500));
  }
}

const addDoctorBasicDetails = async (req: Request, res: Response) => {
  try {
    const doctorCredential = req.body.credentials;
    const {
      name,
      gender,
      speciality,
      experiance,
      state,
      district,
      city,
      appointmentFee,
      // credentials,
    } = req.body;
    if(!name || !gender || !speciality || !experiance || !state || !district || !city || !appointmentFee) {
      res.status(400).json(new ApiError("All fields are required.", 400));
      return;
    } 
    if(!doctorCredential || !doctorCredential.userId) {
      res.status(400).json(new ApiError("Credentials are missing.", 400));
      return;
    }
    
    // check if detail already exist...
    const existingDetails = await prisma.doctorDetails.findUnique({
      where: {
        doctorId: doctorCredential.userId
      }
    });
    if(existingDetails) {
      res.status(400).json(new ApiError("Details already exist for the same doctor.", 400));
      return;
    }

    // add data to the doctorDetails table...
    const basicData = await prisma.doctorDetails.create({
      data: {
        doctorId: doctorCredential.userId,
        name: name,
        gender: gender,
        speciality: speciality,
        experience: experiance.parseInt(),
        state: state,
        district: district,
        city: city,
        appointmentFee: appointmentFee.parseInt()
      }
    });
    if(!basicData) {
      res.status(500).json(new ApiError("Failed to add data.", 500));
      return;
    }

    res.status(201).json(new ApiResponse("Success", 201, "data added successfully.", basicData));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error("Prisma known error: ", error);
      res.status(400).json(new ApiError("Database error.", 400));
      return;
    } else if (error instanceof Prisma.PrismaClientUnknownRequestError) {
      console.error("Prisma unknown error: ", error);
      res.status(500).json(new ApiError("Unknown database error.", 500));
      return;
    }
    
    console.error("Error adding basic details: ", error);
    res.status(500).json(new ApiError("Internal server error.", 500));
  }
}

const addDoctorEducationDetails = async (req: Request, res: Response) => {
  try {
    const doctorCredential = req.body.credentials;
    const {
      degree,
      collegeUniversity,
      completionYear
      // credentials,
    } = req.body;
    if(!degree || !completionYear || !collegeUniversity) {
      res.status(400).json(new ApiError("All fields are required.", 400));
      return;
    } 
    if(!doctorCredential || !doctorCredential.userId) {
      res.status(400).json(new ApiError("Credentials are missing.", 400));
      return;
    }
    
    // check if detail already exist...
    const existingDetails = await prisma.doctorEducation.findUnique({
      where: {
        doctorId: doctorCredential.userId
      }
    });
    if(existingDetails) {
      res.status(400).json(new ApiError("Details already exist for the same doctor.", 400));
      return;
    }

    // add data to the doctorDetails table...
    const educationData = await prisma.doctorEducation.create({
      data: {
        doctorId: doctorCredential.userId,
        degree: degree,
        collegeUniversity: collegeUniversity,
        completionYear: completionYear.parseInt()
      }
    });
    if(!educationData) {
      res.status(500).json(new ApiError("Failed to add data.", 500));
      return;
    }

    res.status(201).json(new ApiResponse("Success", 201, "data added successfully.", educationData));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error("Prisma known error: ", error);
      res.status(400).json(new ApiError("Database error.", 400));
      return;
    } else if (error instanceof Prisma.PrismaClientUnknownRequestError) {
      console.error("Prisma unknown error: ", error);
      res.status(500).json(new ApiError("Unknown database error.", 500));
      return;
    }
    
    console.error("Error adding education details: ", error);
    res.status(500).json(new ApiError("Internal server error.", 500));
  }
}

const addDoctorRegistrationDetails = async (req: Request, res: Response) => {
  try {
    const doctorCredential = req.body.credentials;
    const {
      registrationNo,
      registrationCouncil,
      registrationYear,
      // credentials,
    } = req.body;
    if(!registrationNo || !registrationCouncil || !registrationYear) {
      res.status(400).json(new ApiError("All fields are required.", 400));
      return;
    } 
    if(!doctorCredential || !doctorCredential.userId) {
      res.status(400).json(new ApiError("Credentials are missing.", 400));
      return;
    }
    
    // check if detail already exist...
    const existingDetails = await prisma.doctorRegistration.findUnique({
      where: {
        doctorId: doctorCredential.userId
      }
    });
    if(existingDetails) {
      res.status(400).json(new ApiError("Details already exist for the same doctor.", 400));
      return;
    }

    // add data to the doctorDetails table...
    const registrationData = await prisma.doctorRegistration.create({
      data: {
        doctorId: doctorCredential.userId,
        registrationNumber: registrationNo,
        registrationCouncil: registrationCouncil,
        registrationYear: registrationYear
      }
    });
    if(!registrationData) {
      res.status(500).json(new ApiError("Failed to add data.", 500));
      return;
    }

    res.status(201).json(new ApiResponse("Success", 201, "data added successfully.", registrationData));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error("Prisma known error: ", error);
      res.status(400).json(new ApiError("Database error.", 400));
      return;
    } else if (error instanceof Prisma.PrismaClientUnknownRequestError) {
      console.error("Prisma unknown error: ", error);
      res.status(500).json(new ApiError("Unknown database error.", 500));
      return;
    }
    
    console.error("Error adding registration details: ", error);
    res.status(500).json(new ApiError("Internal server error.", 500));
  }
}

const addWorkDay = async (req: Request, res: Response) => {
  try {
    const doctorCredential = req.body.credentials; 
    if(!doctorCredential || !doctorCredential.userId) {
      res.status(400).json(new ApiError("Credentials are missing.", 400));
      return;
    }

    const {monday, tuesday, wednesday, thursday, friday, saturday, sunday} = req.body;

    // check if workday is already created.
    const existingWorkDay = await prisma.doctorWorkDay.findUnique({
      where: {
        doctorId: doctorCredential.userId
      }
    });
    if(existingWorkDay) {
      res.status(400).json(new ApiError("Work-day already exist.", 400));
      return;
    }

    // create workday
    const workday = await prisma.doctorWorkDay.create({
      data: {
        doctorId: doctorCredential.userId,
        monday: monday,
        tuesday: tuesday,
        wednesday: wednesday,
        thursday: thursday,
        friday: friday,
        saturday: saturday,
        sunday: sunday
      }
    });
    if(!workday) {
      res.status(500).json(new ApiError("Failed to create workday.", 500));
      return;
    }

    res.status(201).json(new ApiResponse("Success", 201, "Workday created.", workday));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error("Prisma known error: ", error);
      res.status(400).json(new ApiError("Database error.", 400));
      return;
    } else if (error instanceof Prisma.PrismaClientUnknownRequestError) {
      console.error("Prisma unknown error: ", error);
      res.status(500).json(new ApiError("Unknown database error.", 500));
      return;
    }
    
    console.error("Error adding work-day details: ", error);
    res.status(500).json(new ApiError("Internal server error.", 500));
  }
}

const addClinicData = async (req: Request, res:Response) => {
  try {
    const doctorCredential = req.body.credentials;
    const {
      clinicName,
      clinicSpeciality,
      clinicContactNo,  // array of two contact numbers...
      clinicRegistrationNo,
      clinicSignBoard,
      state,
      district,
      city,
      pincode,
      nearby,
      // credentials,
    } = req.body;
    if (
      !clinicName ||
      !clinicSpeciality ||
      !clinicContactNo ||
      !clinicRegistrationNo ||
      !clinicSignBoard ||
      !state ||
      !district ||
      !city ||
      !pincode ||
      !nearby
    ) {
      res.status(400).json(new ApiError("All fields are required.", 400));
      return;
    } 
    if (!doctorCredential || !doctorCredential.userId) {
      res.status(400).json(new ApiError("Credentials are missing.", 400));
      return;
    }
    
    // check if doctor is unique...
    const existingDetails = await prisma.clinic.findUnique({
      where: {
        doctorId: doctorCredential.userId
      }
    });
    if(existingDetails) {
      res.status(400).json(new ApiError("This doctor is already registered to a clinic.", 400));
      return;
    }
    // check is clinic is unique...
    const existingClinic = await prisma.clinic.findUnique({
      where: {
        clinicRegistrationNo: clinicRegistrationNo
      }
    });
    if(existingClinic) {
      res.status(400).json(new ApiError("This clinic is already registered to a doctor.", 400));
      return;
    }

    // add data to the doctorDetails table...
    const clinicData = await prisma.clinic.create({
      data: {
        doctorId: doctorCredential.userId,
        clinicName: clinicName,
        clinicRegistrationNo: clinicRegistrationNo,
        clinicSpeciality: clinicSpeciality,
        clinicSignBoard: clinicSignBoard,
        clinicContactNo: clinicContactNo,
        state: state,
        district: district,
        city: city,
        pincode: pincode,
        nearbyLocation: nearby
      }
    });
    if(!clinicData) {
      res.status(500).json(new ApiError("Failed to add data.", 500));
      return;
    }

    res.status(201).json(new ApiResponse("Success", 201, "data added successfully.", clinicData));
  } catch (error) {
    if(error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error("Prisma known error: ", error);
      res.status(400).json(new ApiError("Database error.", 400));
      return;
    } else if (error instanceof Prisma.PrismaClientUnknownRequestError) {
      console.error("Prisma unknown error: ", error);
      res.status(500).json(new ApiError("Unknown database error.", 500));
      return;
    }

    console.error("Error while adding clinic data: ", error);
    res.status(500).json(new ApiError("Internal server error.", 500));
  }
}

const addHospitalData = async (req: Request, res:Response) => {
  try {
    const doctorCredential = req.body.credentials;
    const {
      hospitalName,
      hospitalSpeciality,
      hospitalContactNo, // array to two contact numbers...
      hospitalRegistrationNo,
      hospitalSignBoard,
      state,
      district,
      city,
      pincode,
      nearby,
      // credentials,
    } = req.body;
    if (
      !hospitalName ||
      !hospitalSpeciality ||
      !hospitalContactNo ||
      !hospitalRegistrationNo ||
      !hospitalSignBoard ||
      !state ||
      !district ||
      !city ||
      !pincode ||
      !nearby
    ) {
      res.status(400).json(new ApiError("All fields are required.", 400));
      return;
    } 
    if (!doctorCredential || !doctorCredential.userId) {
      res.status(400).json(new ApiError("Credentials are missing.", 400));
      return;
    }
    

    // check is hospital is unique...
    const existinghospital = await prisma.hospital.findUnique({
      where: {
        hospitalRegistrationNo: hospitalRegistrationNo
      }
    });
    if(existinghospital) {
      res.status(400).json(new ApiError("This clinic is already registered to a doctor.", 400));
      return;
    }

    // add data to the doctorDetails table...
    const hospitalData = await prisma.hospital.create({
      data: {
        hospitalName: hospitalName,
        hospitalRegistrationNo: hospitalRegistrationNo,
        hospitalSpeciality: hospitalSpeciality,
        hospitalSignBoard: hospitalSignBoard,
        hospitalContactNo: hospitalContactNo,
        state: state,
        district: district,
        city: city,
        pincode: pincode,
        nearbyLocation: nearby
      }
    });
    if(!hospitalData) {
      res.status(500).json(new ApiError("Failed to add data.", 500));
      return;
    }

    res.status(201).json(new ApiResponse("Success", 201, "data added successfully.", hospitalData));
  } catch (error) {
    if(error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error("Prisma known error: ", error);
      res.status(400).json(new ApiError("Database error.", 400));
      return;
    } else if (error instanceof Prisma.PrismaClientUnknownRequestError) {
      console.error("Prisma unknown error: ", error);
      res.status(500).json(new ApiError("Unknown database error.", 500));
      return;
    }

    console.error("Error while adding hospital data: ", error);
    res.status(500).json(new ApiError("Internal server error.", 500));
  }
}

const addAppointments = async (req: Request, res: Response) => {
  try {
    
  } catch (error) {
    if(error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error("Prisma known error: ", error);
      res.status(400).json(new ApiError("Database error.", 400));
      return;
    } else if (error instanceof Prisma.PrismaClientUnknownRequestError) {
      console.error("Prisma unknown error: ", error);
      res.status(500).json(new ApiError("Unknown database error.", 500));
      return;
    }

    console.error("Error while adding hospital data: ", error);
    res.status(500).json(new ApiError("Internal server error.", 500));
  }
}



export {
  registerDoctor,
  loginDoctor,
  logoutDoctor,
  addDoctorBasicDetails,
  addDoctorEducationDetails,
  addDoctorRegistrationDetails,
  addWorkDay,
  addClinicData,
  addHospitalData,
  addAppointments
}