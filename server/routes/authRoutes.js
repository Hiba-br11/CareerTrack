
//but: definir le chemin et dériger la requete
const express = require("express"); //permet de créer des routes HTTP(GET/POST/PUT...)
const { register, login, logout } = require("../controllers/authController");//on importe la fonc register

const router = express.Router();

router.post("/register", register);// si une requete POST arrive sur /register execute la fonc register
router.post("/login", login);
router.post("/logout", logout);
module.exports = router;