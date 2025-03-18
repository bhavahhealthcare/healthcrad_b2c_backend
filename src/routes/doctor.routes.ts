import { Router } from "express";
import { verifyToken } from "../middlewares/validateCredential.middlewares";
import {
  registerDoctor,
  loginDoctor,
  logoutDoctor,
  addDoctorBasicDetails,
  addDoctorEducationDetails,
  addDoctorRegistrationDetails,
  addWorkDay,
  addClinicData,
  addHospitalData,
  addAppointments,
} from "../controllers/doctor.controllers";

const router = Router()

router.route("/register").post(registerDoctor)
router.route("/login").get(loginDoctor)
router.route("/logout").get(logoutDoctor)
router.route("/basicDetails").post(verifyToken,addDoctorBasicDetails)
router.route("/educationDetails").post(verifyToken, addDoctorEducationDetails)
router.route("/registrationDetails").post(verifyToken, addDoctorRegistrationDetails)
router.route("/workday").post(verifyToken, addWorkDay)
router.route("/clinicDetails").post(verifyToken, addClinicData)
router.route("/hospitalDetails").post(verifyToken, addHospitalData)
router.route("/clinicOrHospitalAddress").post(verifyToken, addAppointments)
// make a route for refresh access token...

export default router