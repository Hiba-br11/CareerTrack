//but: définir le route qui permettent à un user connecté de consulter et de modifier son profil

const express = require("express");
const { getProfile, updateProfile } = require("../controllers/profileController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// protect s'applique à toutes les routes de ce fichier
router.use(protect);

router.get("/", getProfile);
router.put("/", updateProfile);

module.exports = router;