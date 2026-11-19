import { StrictMode } from "react"; //active les verif pour detecter certains problemes
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";//active navigation entre les pages
import App from "./App";
import { AuthProvider } from "./context/AuthContext";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);