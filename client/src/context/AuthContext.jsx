//But: permet de gerer l'authentification de user dans l'app React

import { createContext, useContext, useEffect, useState } from "react";
import api from "../api";

const AuthContext = createContext(null);

//rendre les infos d'authentification accessibles à tous les composants(profil/dashborad..) contenus dans App
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); //1er etat:User
  const [loading, setLoading] = useState(true);//2eme etat:loading (verifier si back encore en train de verifier la session de user)

  // Au chargement : le cookie existe-t-il encore ? Si oui, on récupère l'utilisateur
  useEffect(() => {
    api
      .get("/auth/me") //enovyer une requete au backend
      .then((res) => setUser(res.data.user)) //si backend reconnait user
      .catch(() => setUser(null)) //si la requete echoue(user non connecté:JWT n'existe plus)
      .finally(() => setLoading(false));
  }, []);

  //connecter user
  const login = async (email, password) => {
    const res = await api.post("/auth/login", { email, password });//le back vérifie les identifiants et crée un JWT et l'envoie dans un coookie httponly et il renvoie les infos de user
    setUser(res.data.user); //enregistre l'user
  };

  //déconnecter user:on envoie requete POST vers backend et demande au nav de supp le cookie JWT et mettre user à null
  const logout = async () => {
    await api.post("/auth/logout");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);