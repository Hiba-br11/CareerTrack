//But: permet de protéger certaines pages de notre APP pour qu'elles soient accessibles uniquement aux users connectés

import { Navigate } from "react-router-dom";//permet de rediriger user vers uen autre page
import { useAuth } from "../context/AuthContext";//permet de récuperer les infos(user/login/logout..)

export default function PrivateRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return <p>Chargement...</p>;

  return user ? children : <Navigate to="/login" replace />;//si user existe afficher children sion rediriger vers login
}

//3 scénarios possibles:
    //1. user connecté--> Dashboard
    //2. user non connecté--> login
    //3. vérification en cours(loading=true)-->chargement...