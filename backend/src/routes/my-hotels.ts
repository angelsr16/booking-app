import { Request, Response, Router } from "express";
import multer from "multer";
import cloudinary from "cloudinary";
import Hotel, { HotelType } from "../models/hotel";
import verifyToken from "../middleware/auth";
import { body } from "express-validator";

const router = Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

router.post(
  "/",
  verifyToken,
  [
    body("name").notEmpty().withMessage("Name is required"),
    body("city").notEmpty().withMessage("City is required"),
    body("country").notEmpty().withMessage("Country is required"),
    body("description").notEmpty().withMessage("Description is required"),
    body("type").notEmpty().withMessage("Type is required"),
    body("pricePerNight")
      .notEmpty()
      .isNumeric()
      .withMessage("Price per night is required"),
    body("facilities")
      .notEmpty()
      .isArray()
      .withMessage("Facilities is required"),
    body("").notEmpty().withMessage("City is required"),
  ],
  upload.array("imageFiles", 6),
  async (req: Request, res: Response) => {
    try {
      const imageFiles = req.files as Express.Multer.File[];
      const newHotel: HotelType = req.body;

      // 1. Upload the images to cloudinary
      const uploadPromises = imageFiles.map(async (image) => {
        const b64 = Buffer.from(image.buffer).toString("base64");
        let dataURI = "data:" + image.mimetype + ";base64," + b64;

        const res = await cloudinary.v2.uploader.upload(dataURI);
        return res.url;
      });

      const imageUrls = await Promise.all(uploadPromises);

      // 2. If upload was successful, add the URLs to the new hotel
      newHotel.imageUrls = imageUrls;
      newHotel.lastUpdated = new Date();
      newHotel.userId = req.userId;

      // 3. Save the new hotel in our database
      const hotel = new Hotel(newHotel);
      await hotel.save();
      // 4. Return a 201 status
      res.status(201).send(hotel);
    } catch (e) {
      console.log("Error creating hotel: ", e);
      res.status(500).json({ message: "Something went wrong." });
    }
  }
);

export default router;
