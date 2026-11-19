// But:Permet de :Demarrer le backend/configurer Express, connecter MongoDB, préparer communication avec frontend

require("dotenv").config(); //charger les variables du .env(#config():lit le fichier .env et rend ses var accessibles)
const express = require("express"); //créer serveur backend(#require():importer un module pour utiliser ses fonc)
const mongoose = require("mongoose"); //communiquer avec mongodb
const cookieParser = require("cookie-parser");//lire les cookies réçus
const cors = require("cors");//autoriser communication entre front et back
const app = express(); //créer app Express(recevoir requetes/envoyer rep...)

// permet au serveur de comprendre les données envoyées au format json dans le body des requetes HTTP
app.use(express.json());
// Permet de lire les cookies (on en aura besoin pour le JWT)
app.use(cookieParser());
// Autorise le frontend React à appeler l'API ET à envoyer des cookies
app.use(
  cors({
    origin: process.env.CLIENT_URL, //recupere l'@ du front depuis .env
    credentials: true,//autorise envoie des cookies dans les requetes
  })
);

// Route de test(verifier si serveur fonctionne correctement)
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

const authRoutes = require("./routes/authRoutes");
app.use("/api/auth", authRoutes);
const profileRoutes = require("./routes/profileRoutes");
app.use("/api/profile", profileRoutes);

//Mongoose connecte à MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connecté");
    app.listen(process.env.PORT || 5000, () =>{
      console.log(`Serveur démarré sur le port 5000`);
  });
  })
  .catch((err) => console.error("Erreur MongoDB :", err)); //si la connexion échoue