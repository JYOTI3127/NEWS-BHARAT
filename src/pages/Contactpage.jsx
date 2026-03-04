import { useState, useEffect, useRef } from "react";
import {
  Mail, MapPin, Send, CheckCircle,
  Linkedin, Twitter, Instagram, Facebook,
  Monitor, FileText, Star, BookOpen, Users, Zap,
  CheckCircle2,
} from "lucide-react";
import "./ContactPage.css";

/* ── FADE IN HOOK ── */
const useInView = (threshold = 0.12) => {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return [ref, visible];
};

const FadeIn = ({ children, delay = 0, direction = "up", className = "" }) => {
  const [ref, visible] = useInView();
  const dirMap = { up: "translateY(28px)", left: "translateX(-28px)", right: "translateX(28px)", none: "none" };
  return (
    <div ref={ref} className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "none" : dirMap[direction],
        transition: `opacity 0.7s cubic-bezier(.22,.68,0,1.2) ${delay}s, transform 0.7s cubic-bezier(.22,.68,0,1.2) ${delay}s`,
      }}>
      {children}
    </div>
  );
};

/* ── DATA ── */
const offices = [
  { city: "Noida", address: "B-904, iThum Tower, Block B, Sector 62, Noida, Uttar Pradesh" },
  { city: "Agra",  address: "405, 4th Floor, Maruti Plaza, Sanjay Place, Agra, Uttar Pradesh" },
];

const socialLinks = [
  { icon: <Linkedin  size={18} />, label: "LinkedIn",  href: "#" },
  { icon: <Twitter   size={18} />, label: "Twitter",   href: "#" },
  { icon: <Instagram size={18} />, label: "Instagram", href: "#" },
  { icon: <Facebook  size={18} />, label: "Facebook",  href: "#" },
];

const adOpportunities = [
  { icon: <Monitor  size={18} />, title: "Display Ads" },
  { icon: <FileText size={18} />, title: "Sponsored Articles (Clearly Labeled)" },
  { icon: <Star     size={18} />, title: "Brand Features" },
  { icon: <BookOpen size={18} />, title: "Newsletter Sponsorships" },
  { icon: <Users    size={18} />, title: "Event Partnerships" },
  { icon: <Zap      size={18} />, title: "Custom Content Campaigns" },
];

const whyPartner = [
  "Credible News Environment",
  "Targeted Audience Reach",
  "Policy and Business Readers",
  "High Engagement Content",
];

/* ── CONTACT FORM ── */
function ContactForm() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!form.name.trim())    e.name    = "Name is required";
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) e.email = "Valid email required";
    if (!form.subject.trim()) e.subject = "Subject is required";
    if (!form.message.trim()) e.message = "Message is required";
    return e;
  };

  const handleSubmit = () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="ct-form-success">
        <div className="ct-success-icon"><CheckCircle size={34} /></div>
        <h3 className="ct-success-title">Message Sent</h3>
        <p className="ct-success-text">Thank you for reaching out to News 4 Bharat. We will get back to you at info@news4bharat.com within 24 hours.</p>
        <button className="ct-success-reset" onClick={() => { setForm({ name: "", email: "", subject: "", message: "" }); setSubmitted(false); }}>
          Send Another Message
        </button>
      </div>
    );
  }

  return (
    <div className="ct-form-wrap">
      <div className="ct-form-row">
        <div className="ct-form-group">
          <label className="ct-form-label">Full Name *</label>
          <input className={`ct-form-input${errors.name ? " ct-err" : ""}`} placeholder="Your full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          {errors.name && <span className="ct-error-msg">{errors.name}</span>}
        </div>
        <div className="ct-form-group">
          <label className="ct-form-label">Email Address *</label>
          <input className={`ct-form-input${errors.email ? " ct-err" : ""}`} placeholder="you@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          {errors.email && <span className="ct-error-msg">{errors.email}</span>}
        </div>
      </div>
      <div className="ct-form-group">
        <label className="ct-form-label">Subject *</label>
        <input className={`ct-form-input${errors.subject ? " ct-err" : ""}`} placeholder="How can we help?" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
        {errors.subject && <span className="ct-error-msg">{errors.subject}</span>}
      </div>
      <div className="ct-form-group">
        <label className="ct-form-label">Message * <span className="ct-char-count">({form.message.length}/600)</span></label>
        <textarea className={`ct-form-textarea${errors.message ? " ct-err" : ""}`} placeholder="Write your message here..." value={form.message} maxLength={600} onChange={(e) => setForm({ ...form, message: e.target.value })} />
        {errors.message && <span className="ct-error-msg">{errors.message}</span>}
      </div>
      <button className="ct-submit-btn" onClick={handleSubmit}>
        <Send size={15} /> Send Message
      </button>
    </div>
  );
}

/* ══════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════ */
export default function ContactPage() {
  return (
    <div className="contact-page">

      {/* ══════════ HERO ══════════ */}
      <section className="ct-hero">
        <div className="ct-hero-img" />
        <div className="ct-hero-overlay" />
        <div className="ct-hero-content">
          <FadeIn direction="none" delay={0.1}>
            <div className="ct-hero-badge">
              <span className="ct-badge-dot" />
              <span className="ct-badge-text">Contact Us</span>
            </div>
          </FadeIn>
          <FadeIn direction="up" delay={0.2}>
            <h1 className="ct-hero-title">Contact <span className="ct-hero-accent">Us</span></h1>
          </FadeIn>
          <FadeIn direction="up" delay={0.3}>
            <p className="ct-hero-sub">We welcome reader engagement.</p>
          </FadeIn>
        </div>
      </section>

      {/* ══════════ CONTACT + FORM ══════════ */}
      <section className="ct-main">
        <div className="ct-container">
          <div className="ct-split">

            {/* LEFT — contact info */}
            <div className="ct-split-left">

              {/* General Inquiries */}
              <FadeIn direction="left" delay={0.05}>
                <div className="ct-info-block">
                  <span className="ct-label">General Inquiries</span>
                  <a href="mailto:info@news4bharat.com" className="ct-email-link">
                    <Mail size={16} /> info@news4bharat.com
                  </a>
                </div>
              </FadeIn>

              {/* Office Addresses */}
              <FadeIn direction="left" delay={0.1}>
                <div className="ct-info-block">
                  <span className="ct-label">Office Address</span>
                  <div className="ct-offices">
                    {offices.map((o, i) => (
                      <div key={i} className="ct-office-item">
                        <div className="ct-office-icon"><MapPin size={15} /></div>
                        <div>
                          <p className="ct-office-city">{o.city}</p>
                          <p className="ct-office-addr">{o.address}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </FadeIn>

              {/* Social Links */}
              <FadeIn direction="left" delay={0.15}>
                <div className="ct-info-block">
                  <span className="ct-label">Follow Us</span>
                  <div className="ct-social-row">
                    {socialLinks.map((s, i) => (
                      <a key={i} href={s.href} className="ct-social-pill">
                        {s.icon} {s.label}
                      </a>
                    ))}
                  </div>
                </div>
              </FadeIn>

            </div>

            {/* RIGHT — form */}
            <div className="ct-split-right">
              <FadeIn direction="right" delay={0.1}>
                <div className="ct-form-card">
                  <span className="ct-label">Send a Message</span>
                  <h2 className="ct-form-title">We read every message.</h2>
                  <ContactForm />
                </div>
              </FadeIn>
            </div>

          </div>
        </div>
      </section>

      {/* ══════════ ADVERTISE WITH US ══════════ */}
      <section className="ct-advertise">
        <div className="ct-container">
          <FadeIn>
            <div className="ct-ad-header">
              <span className="ct-label ct-label--light">Advertise With Us</span>
              <h2 className="ct-ad-title">Partner With News 4 Bharat</h2>
              <p className="ct-ad-sub">Reach an informed and engaged audience across Bharat.</p>
            </div>
          </FadeIn>

          <div className="ct-ad-body">
            {/* Opportunities grid */}
            <FadeIn direction="left" delay={0.1}>
              <div className="ct-ad-left">
                <p className="ct-ad-section-label">Advertising Opportunities</p>
                <div className="ct-ad-grid">
                  {adOpportunities.map((item, i) => (
                    <div key={i} className="ct-ad-item">
                      <span className="ct-ad-item-icon">{item.icon}</span>
                      <span className="ct-ad-item-text">{item.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            </FadeIn>

            {/* Why partner */}
            <FadeIn direction="right" delay={0.15}>
              <div className="ct-ad-right">
                <p className="ct-ad-section-label">Why Partner With Us?</p>
                <div className="ct-why-list">
                  {whyPartner.map((item, i) => (
                    <div key={i} className="ct-why-item">
                      <CheckCircle2 size={16} className="ct-why-icon" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
                <div className="ct-ad-cta">
                  <p className="ct-ad-cta-label">For media kit and pricing</p>
                  <a href="mailto:info@news4bharat.com" className="ct-ad-cta-email">
                    <Mail size={15} /> info@news4bharat.com
                  </a>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

    </div>
  );
}