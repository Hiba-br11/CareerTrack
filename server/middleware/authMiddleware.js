//But: verifier si l'user est connecté avant de lui permettre d'accéder à certaines routes

const jwt = require("jsonwebtoken");//vérifier les tokens JWT
const User = require("../models/User"); //accéder à la collection des users dans BD

exports.protect = async (req, res, next) => {
  try {
    // 1. Lire le token dans le cookie
    const token = req.cookies.token; //aprés le login on récupere le token

    if (!token) {
      return res.status(401).json({ message: "Non authentifié" });
    }

    // 2. Vérifier la signature(crée avec notre clé secréte?) et l'expiration(valide encore?)
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 3. Retrouver l'utilisateur (sans son mot de passe) dans MongoDB
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({ message: "Utilisateur introuvable" });
    }

    // 4. Rendre l'utilisateur disponible pour la suite
    req.user = user;//ajoute les infos de user à la requéte
    next();
  } catch (err) {
    return res.status(401).json({ message: "Token invalide ou expiré" });
  }
};