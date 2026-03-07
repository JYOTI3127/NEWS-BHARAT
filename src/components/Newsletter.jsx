import { useState } from "react";
import { Mail } from "lucide-react";
import "../style.css";

export default function Newsletter() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitted(true);
    setEmail("");
  };

  return (
    <section className="nl-root">
      <div className="nl-inner">

        {/* Left: Icon + Title */}
        <div className="nl-left">
          <Mail size={22} className="nl-icon" />
          <h2 className="nl-title">Subscribe to Our Newsletter</h2>
        </div>

        {/* Right: Input + Button */}
        <div className="nl-right">
          {submitted ? (
            <p className="nl-success">Thank you for subscribing!</p>
          ) : (
            <form className="nl-form" onSubmit={handleSubmit}>
              <input
                type="email"
                className="nl-input"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <button type="submit" className="nl-btn">Subscribe</button>
            </form>
          )}
        </div>

      </div>
    </section>
  );
}