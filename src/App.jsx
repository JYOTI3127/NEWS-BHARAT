import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import "../src/style.css";
import BottomNav from "./components/BottomNav";
import About from "./pages/About";
import Privacy from "./pages/Privacy";
import TermsPage from "./pages/Termspage";

function App() {
  return (
    <BrowserRouter>
      <Navbar />   

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/privacy-policy" element={<Privacy />} />
        <Route path="/terms-of-service" element={<TermsPage />} />
        <Route path="/navbar" element={<Navbar />} />
        <Route path="/footer" element={<Footer />} />
      </Routes>
      <Footer />
      <BottomNav /> 
    </BrowserRouter>
  );
}

export default App;