//But: Page de connexion(Login)

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();//on récupere login depuis useAuth()
  const navigate = useNavigate();//rediriger user vers la page profil par exemple aprés connexion
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");


  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await login(email, password);
      navigate("/profile");//si login reussie on passe à la page profil
    } catch (err) {
      setError(err.response?.data?.message || "Erreur de connexion");
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: "40px auto" }}>
      <h2>Connexion</h2>
      <form onSubmit={handleSubmit}>
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input type="password" placeholder="Mot de passe" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p style={{ color: "red" }}>{error}</p>}
        <button type="submit">Se connecter</button>
      </form>
      <p>
        Pas de compte ? <Link to="/register">S'inscrire</Link>
      </p>
    </div>
  );
}