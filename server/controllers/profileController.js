//permet de consulter et modifier le profil dans CareerTrack

const User = require("../models/User");

// Consulter le profil
exports.getProfile = (req, res) => {
  // req.user a déjà été chargé par le middleware protect (sans mot de passe)
  res.json({ user: req.user });
};

// Modifier le profil
exports.updateProfile = async (req, res) => {
  try {
    const { nom, prenom, specialite, niveau } = req.body;//recupere les nouvelles infos

    // 1. Validation
    const errors = {};

    if (nom !== undefined && !String(nom).trim()) {
      errors.nom = "Le nom ne peut pas être vide";
    }
    if (prenom !== undefined && !String(prenom).trim()) {
      errors.prenom = "Le prénom ne peut pas être vide";
    }

    //vérifier s'il existe des erreurs
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ errors });
    }

    // 2. On ne garde QUE les champs autorisés
    const updates = {};//contient uniquement les infos que user a le droit de modifier
    if (nom !== undefined) updates.nom = String(nom).trim();
    if (prenom !== undefined) updates.prenom = String(prenom).trim();
    if (specialite !== undefined) updates.specialite = String(specialite).trim();
    if (niveau !== undefined) updates.niveau = String(niveau).trim();

    // 3. Mettre à jour l'utilisateur connecté
    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true, // renvoie le document APRÈS modification
      runValidators: true,
    }).select("-password");

    res.json({ message: "Profil mis à jour", user });
  } catch (err) {
    console.error("Erreur updateProfile :", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};