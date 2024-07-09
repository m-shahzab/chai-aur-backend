import multer from "multer";

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./public/temp");
  },
  filename: (_, file, cb) => {
    cb(null, file.originalname);
  },
});

export const multerUploader = multer({ storage });
