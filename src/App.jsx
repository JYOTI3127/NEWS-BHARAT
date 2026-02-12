import React from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import BreakingNews from './components/BreakingNews';
import NewsGrid from './components/NewsGrid';
import TrendingSection from './components/TrendingSection';
import CategorySection from './components/CategorySection';
import './App.css';
import Footer from './components/Footer';

function App() {
  return (
    <div className="App">
      <Navbar />
      <BreakingNews />
      <Hero />
      <NewsGrid />
      <TrendingSection />
      <CategorySection />
      <Footer />
    </div>
  );
}

export default App;