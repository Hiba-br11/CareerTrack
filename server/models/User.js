//But: definir la structure d'un utilisateur dans MongoDB

const mongoose = require("mongoose"); 

//schema est comme un modele qui decrit la structure d'un doc dans MongoDB
const userSchema = new mongoose.Schema(
  {
    nom: { type: String, required: true, trim: true }, //trim:supp les espaces de deb et fin
    prenom: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true }, // sera stocké HACHÉ 
    specialite: { type: String, trim: true, default: "" },
    niveau: { type: String, trim: true, default: "" },
  },
  { timestamps: true } //ajoute 2 dates(création et modification)
);

module.exports = mongoose.model("User", userSchema); //crée le modéle user