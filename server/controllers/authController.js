//But: recevoir les infos par le form, les vérifier, sécuriser le mdp, enregistrer le nouvel user dans BD

const jwt = require("jsonwebtoken");
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

//but: permet à utilisateur déja inscrit de se connecter à son compte en utilisant son email et mdp
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body; //recupere les données

    // 1. vérifier que les champs sont remplis
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email et mot de passe obligatoires" });
    }

    // 2. Chercher l'utilisateur
    const user = await User.findOne({ email: email.trim().toLowerCase() });

    // 3. Comparer avec le hash (même message d'erreur dans les deux cas)
    const motDePasseValide = user
      ? await bcrypt.compare(password, user.password)
      : false;

    if (!user || !motDePasseValide) {
      return res.status(401).json({ message: "Email ou mot de passe incorrect" });
    }

    // 4. Créer le JWT: Json Web Token:permet de reconnaitre user à la prochaine fois
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d", //token expire aprés 7 jrs
    });

    // 5.placer token JWT dans un cookie httpOnly()
    res.cookie("token", token, {
      httpOnly: true,//empeche js de lire le cookie
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 jours en millisecondes
    });

    // 6. Répondre SANS le mot de passe
    res.json({
      message: "Connexion réussie",
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
    console.error("Erreur login :", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};


// Est de permettre à un utilisateur connecté de se déconnecter de son compte en supprimant le cookie qui contient JWT
exports.logout = (req, res) => {
    //supprimer le cookie JWT
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });

  res.json({ message: "Déconnexion réussie" });
};

//récupere les infos de user connecté dans CareerTrack
exports.me = (req, res) => {
  res.json({ user: req.user });
};