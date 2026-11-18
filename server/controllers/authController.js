//But: recevoir les infos par le form, les vérifier, sécuriser le mdp, enregistrer le nouvel user dans BD

const bcrypt = require("bcrypt"); //bib pour hacher le mdp
const User = require("../models/User"); //importer le modéle dans models/user.js

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; //vérifier le format de mail

exports.register = async (req, res) => {
  try {
    const { nom, prenom, email, password, specialite, niveau } = req.body; //récupere le infos

    //Validation des champs
    const errors = {};

    if (!nom || !nom.trim()) errors.nom = "Le nom est obligatoire";
    if (!prenom || !prenom.trim()) errors.prenom = "Le prénom est obligatoire";

    if (!email || !EMAIL_REGEX.test(email.trim())) {
      errors.email = "Email invalide";
    }

    if (!password || typeof password !== "string" || password.length < 8) {
      errors.password = "Le mot de passe doit contenir au moins 8 caractères";
    }

    //s'il existe des erreurs 
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ errors });
    }

    // Vérifier que l'email n'est pas déjà pris(si 2 mails se tapent 2 fois -> HTTP 409)
    const emailNormalise = email.trim().toLowerCase();
    const existant = await User.findOne({ email: emailNormalise });
    if (existant) {
      return res
        .status(409)
        .json({ errors: { email: "Cet email est déjà utilisé" } });
    }

    //Hacher le mot de passe (10 = coût du hachage)
    const motDePasseHache = await bcrypt.hash(password, 10);

    // Créer l'utilisateur
    const user = await User.create({
      nom,
      prenom,
      email: emailNormalise,
      password: motDePasseHache,
      specialite,
      niveau,
    });

    // Répondre SANS le mot de passe(envoyer la rep au front)
    res.status(201).json({
      message: "Compte créé avec succès",
      user: {
        id: user._id,
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
        specialite: user.specialite,
        niveau: user.niveau,
      },
    });
  } catch (err) {
    console.error("Erreur register :", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};