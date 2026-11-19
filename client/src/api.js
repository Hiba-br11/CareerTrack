import axios from "axios";// Axios permet au front React d'nvoyer des requettes HTTP au back 

const api = axios.create({
  baseURL: "http://localhost:5000/api", //@ de backend
  withCredentials: true, // envoie et reçoit le cookie httpOnly
});

export default api;