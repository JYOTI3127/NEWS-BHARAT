import React from 'react';
import '../App.css';
import logo from "../assets/NEWS4BHARAT LOGO 6.png";
import { FaFacebookF, FaTwitter, FaLinkedinIn, FaYoutube } from "react-icons/fa";



function Footer() {
    return (
        <footer className="footer">
            <div className="footer-container">
                <div className="footer-section">
                    <div className="footer-section">
                        <img src={logo} alt="News Logo" className="footer-logo" />
                    </div>                    <p>Your trusted source for news, analysis, and insights from around the world.</p>
                    <div className="social-links">
                        <a href="https://facebook.com" aria-label="Facebook" target="_blank">
                            <FaFacebookF />
                        </a>

                        <a href="https://twitter.com" aria-label="Twitter" target="_blank">
                            <FaTwitter />
                        </a>

                        <a href="https://linkedin.com" aria-label="LinkedIn" target="_blank">
                            <FaLinkedinIn />
                        </a>

                        <a href="https://youtube.com" aria-label="YouTube" target="_blank">
                            <FaYoutube />
                        </a>
                    </div>

                </div>

                <div className="footer-section">
                    <h4> Categories</h4>
                    <ul>
                        <li><a href="#politics">Politics</a></li>
                        <li><a href="#business">Business</a></li>
                        <li><a href="#technology">Technology</a></li>
                        <li><a href="#sports">Sports</a></li>
                        <li><a href="#entertainment">Entertainment</a></li>
                    </ul>
                </div>

                <div className="footer-section">
                    <h4>Company</h4>
                    <ul>
                        <li><a href="#about">About Us</a></li>
                        <li><a href="#team">Our Team</a></li>
                        <li><a href="#careers">Careers</a></li>
                        <li><a href="#contact">Contact</a></li>
                        <li><a href="#advertise">Advertise</a></li>
                    </ul>
                </div>

                <div className="footer-section">
                    <h4>Resources</h4>
                    <ul>
                        <li><a href="#help">Help Center</a></li>
                        <li><a href="#privacy">Privacy Policy</a></li>
                        <li><a href="#terms">Terms of Service</a></li>
                        <li><a href="#guidelines">Editorial Guidelines</a></li>
                        <li><a href="#sitemap">Sitemap</a></li>
                    </ul>
                </div>

                <div className="footer-section newsletter">
                    <h4>Stay Updated</h4>
                    <p>Subscribe to our daily newsletter</p>
                    <form className="newsletter-form">
                        <input type="email" placeholder="Enter your email" />
                        <button type="submit">Subscribe</button>
                    </form>
                </div>
            </div>

            <div className="footer-bottom">
                <p>&copy; 2026 NewsDaily. All rights reserved.</p>
                <p>Made with React + Vite</p>
            </div>
        </footer>
    );
}

export default Footer