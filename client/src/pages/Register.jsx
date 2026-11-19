//But:Page d'inscription(remplir les infos/mdp/email)

import { useState } from "react"; //stocker et modifier les données dans React
import { Link, useNavigate } from "react-router-dom"; //créer un lien entre 2 pages sans recharger le site
import api from "../api";//pour communiquer avec backend


export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    nom: "",
    prenom: "",
    email: "",
    password: "",
    specialite: "",
    niveau: "",
  });
  const [errors, setErrors] = useState({});//contient les erreurs(mail utilisé ou mdp doit etre de 8 caractéres)
  const [message, setMessage] = useState("");//seul msg(erreur server)

  //s'execute chaque fois que user modifie un champ du form
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  //s'execute lors de soumission
  const handleSubmit = async (e) => {
    e.preventDefault();//empeche rechargement de site
    setErrors({});
    setMessage("");
    //envoyer les données au backend
    try {
      await api.post("/auth/register", form);
      navigate("/login");
    } catch (err) {
      setErrors(err.response?.data?.errors || {});
      setMessage(err.response?.data?.message || "");
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: "40px auto" }}>
      <h2>Inscription</h2>
      <form onSubmit={handleSubmit}>
        <input name="nom" placeholder="Nom" value={form.nom} onChange={handleChange} />
        {errors.nom && <p style={{ color: "red" }}>{errors.nom}</p>}

        <input name="prenom" placeholder="Prénom" value={form.prenom} onChange={handleChange} />
        {errors.prenom && <p style={{ color: "red" }}>{errors.prenom}</p>}

        <input name="email" type="email" placeholder="Email" value={form.email} onChange={handleChange} />
        {errors.email && <p style={{ color: "red" }}>{errors.email}</p>}

        <input name="password" type="password" placeholder="Mot de passe (8 caractères min.)" value={form.password} onChange={handleChange} />
        {errors.password && <p style={{ color: "red" }}>{errors.password}</p>}

        <input name="specialite" placeholder="Spécialité" value={form.specialite} onChange={handleChange} />
        <input name="niveau" placeholder="Niveau d'études" value={form.niveau} onChange={handleChange} />

        {message && <p style={{ color: "red" }}>{message}</p>}
        <button type="submit">Créer mon compte</button>
      </form>
      <p>
        Déjà inscrite ? <Link to="/login">Se connecter</Link>
      </p>
    </div>
  );
}