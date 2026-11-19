//But: la page Mon Profil (consulter infos personnelles/modifier nom/enregistrer modif dans BD ..)

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import { useAuth } from "../context/AuthContext";

export default function Profile() {
  const { user, setUser, logout } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    nom: user.nom,
    prenom: user.prenom,
    specialite: user.specialite,
    niveau: user.niveau,
  });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  //enregistre les modifications
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setMessage("");
    try {
      const res = await api.put("/profile", form);
      setUser(res.data.user);
      setMessage("Profil mis à jour");
    } catch (err) {
      setErrors(err.response?.data?.errors || {});
    }
  };

  //Lorsque user clique sur logout
  const handleLogout = async () => {
    await logout();
    navigate("/login");//on redirige user vers page login
  };

  return (
    <div style={{ maxWidth: 400, margin: "40px auto" }}>
      <h2>Mon profil</h2>
      <p>Email : {user.email}</p>
      <form onSubmit={handleSubmit}>
        <input name="nom" placeholder="Nom" value={form.nom} onChange={handleChange} />
        {errors.nom && <p style={{ color: "red" }}>{errors.nom}</p>}

        <input name="prenom" placeholder="Prénom" value={form.prenom} onChange={handleChange} />
        {errors.prenom && <p style={{ color: "red" }}>{errors.prenom}</p>}

        <input name="specialite" placeholder="Spécialité" value={form.specialite} onChange={handleChange} />
        <input name="niveau" placeholder="Niveau d'études" value={form.niveau} onChange={handleChange} />

        {message && <p style={{ color: "green" }}>{message}</p>}
        <button type="submit">Enregistrer</button>
      </form>
      <button onClick={handleLogout}>Se déconnecter</button>
    </div>
  );
}