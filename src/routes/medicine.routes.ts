import { Router } from "express";
import {
  getAllMedicine,
  getMedicinesByBrand,
  getMedicinesByName,
  getMedicinesByCategory,
  getMedicinesByDisease,
  addData,
  allCategories,
  allManufacturer,
  allBrands
} from "../controllers/medicine.controllers";

const router = Router();

router.route("/create/data").post(addData);
router.route("/").get(getAllMedicine);
router.route("/allCategories").get(allCategories);
router.route("/allManufacturer").get(allManufacturer);
router.route("/allBrand").get(allBrands);
router.route("/getMedicineByBrand").get(getMedicinesByBrand);
router.route("/getMedicineByCategory").get(getMedicinesByCategory);


export default router;
