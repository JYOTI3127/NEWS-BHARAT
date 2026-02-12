import React, { useState } from 'react';
import '../App.css';
import logo from "../assets/NEWS4BHARAT LOGO.png";


function Navbar() {
    const [menuOpen, setMenuOpen] = useState(false);

    return (
        <nav className="navbar">
            <div className="navbar-container">
                <div className="navbar-logo">
                    <img src={logo} alt="News Logo" className="logo-img" />
                </div>

                <button
                    className="menu-toggle"
                    onClick={() => setMenuOpen(!menuOpen)}
                >
                    ☰
                </button>

                <ul className={`nav-links ${menuOpen ? 'active' : ''}`}>
                    <li><a href="#home" className="active">Home</a></li>
                    <li><a href="#politics">Politics</a></li>
                    <li><a href="#business">Business</a></li>
                    <li><a href="#technology">Technology</a></li>
                    <li><a href="#sports">Sports</a></li>
                    <li><a href="#entertainment">Entertainment</a></li>
                    <li><a href="#world">World</a></li>
                </ul>

                <div className="nav-actions">
                    {/* <button className="search-btn">🔍</button> */}
                    <button className="subscribe-btn">Subscribe</button>
                </div>
            </div>
        </nav>
    );
}

export default Navbar;