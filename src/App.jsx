
import React from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Home from "./pages/Home";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import BottomNav from "./components/BottomNav";
import ScrollToTop from "./components/ScrollToTop";
import About from "./pages/About";
import Privacy from "./pages/Privacy";
import TermsPage from "./pages/Termspage";
import FoundersNote from "./pages/Foundersnote";
import EditorialPolicy from "./pages/Editorialpolicy";
import CareersPage from "./pages/Careerspage";
import ContactPage from "./pages/Contactpage";
import CommingSoon from "./pages/ComingSoon";
import ArticleDetails from "./pages/ArticleDetails";
import SixtySecondsPage from "./pages/SixtySecondsPage";

import "../src/style.css";
import CategoryPage from "./pages/Categorypage";

function Layout() {

  const location = useLocation();

  const hideLayout = location.pathname === "/CommingSoon";

  return (
    <>
      {!hideLayout && <Navbar />}

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/privacy-policy" element={<Privacy />} />
        <Route path="/terms-of-service" element={<TermsPage />} />
        <Route path="/founders-note" element={<FoundersNote />} />
        <Route path="/editorial-policy" element={<EditorialPolicy />} />
        <Route path="/careers" element={<CareersPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/CommingSoon" element={<CommingSoon />} />
        <Route path="/category/:slug" element={<CategoryPage />} />
         <Route path="/article/:slug" element={<ArticleDetails />} />
         <Route path="/60-seconds/:slug" element={<SixtySecondsPage />} />
     
      </Routes>

      {!hideLayout && <Footer />}
      {!hideLayout && <BottomNav />}
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Layout />
    </BrowserRouter>
  );
}

export default App;
