import { useState, useEffect, useRef } from "react";
import "react-phone-input-2/lib/style.css";
import PhoneInput from "react-phone-input-2";
import {
  Mail, MapPin, Phone, Send, CheckCircle,
  Linkedin, Twitter, Instagram, Facebook,
  Monitor, FileText, Star, BookOpen, Users, Zap,
  CheckCircle2,
} from "lucide-react";
import PageSeo from "../components/PageSeo";
import { STATIC_PAGE_SEO } from "../lib/staticPageSeo";
import AdvertisementSlot from "../components/AdvertisementSlot";
import "../style.css";
import contactBg from "../assets/contact Us.jpg.jpeg";

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
  }, [threshold]);
  return [ref, visible];
};

const FadeIn = ({ children, delay = 0, direction = "up", className = "" }) => {
  const [ref, visible] = useInView();
  const dirClasses = {
    up: "translate-y-7",
    left: "-translate-x-7",
    right: "translate-x-7",
    none: "",
  };
  const delayClass = `delay-[${delay}s]`;
  const visibilityClass = visible ? "opacity-100 translate-none" : `opacity-0 ${dirClasses[direction]}`;
  return (
    <div
      ref={ref}
      className={`${className} ${visibilityClass} ${delayClass} transition-opacity transition-transform duration-[700ms] ease-[cubic-bezier(.22,.68,0,1.2)]`}
    >
      {children}
    </div>
  );
};

/* ── DATA ── */
const offices = [
  { city: "Noida", address: "B-904, iThum Tower, Block B, Sector 62, Noida, Uttar Pradesh" },
  { city: "Agra", address: "405, 4th Floor, Maruti Plaza, Sanjay Place, Agra, Uttar Pradesh" },
];

const socialLinks = [
  { icon: <Linkedin size={18} />, label: "LinkedIn", href: "https://www.linkedin.com/company/news4bharat" },
  { icon: <Twitter size={18} />, label: "Twitter", href: "https://x.com/news4_bharat" },
  { icon: <Instagram size={18} />, label: "Instagram", href: "https://www.instagram.com/news4_bharat" },
  { icon: <Facebook size={18} />, label: "Facebook", href: "https://www.facebook.com/share/1GxJQvxefr/?mibextid=wwXIfr" },
];

const adOpportunities = [
  { icon: <Monitor size={18} />, title: "Display Ads" },
  { icon: <FileText size={18} />, title: "Sponsored Articles (Clearly Labeled)" },
  { icon: <Star size={18} />, title: "Brand Features" },
  { icon: <BookOpen size={18} />, title: "Newsletter Sponsorships" },
  { icon: <Users size={18} />, title: "Event Partnerships" },
  { icon: <Zap size={18} />, title: "Custom Content Campaigns" },
];

const whyPartner = [
  "Credible News Environment",
  "Targeted Audience Reach",
  "Policy and Business Readers",
  "High Engagement Content",
];

const contactEmails = [
  { label: "Editorial Queries", email: "editorial@news4bharat.com" },
  { label: "PR & Communications", email: "press@news4bharat.com" },
  { label: "Advertisements", email: "advertisement@news4bharat.com" },
  { label: "General Queries", email: "info@news4bharat.com" },

];

const contactPhones = [
  { label: "Landline", number: "0562 4004545", href: "tel:05624004545" },
  { label: "Mobile", number: "+91 8279993074", href: "tel:+918279993074" },
];

const CONTACT_API_URL = "https://news4bharat.cloud/api/contact-queries/";

const formatApiErrors = (data) => {
  const errorData = data?.error || data?.errors || data;

  if (!errorData || typeof errorData !== "object") {
    return data?.message || data?.detail || "";
  }

  return Object.entries(errorData)
    .flatMap(([field, value]) => {
      const label = field
        .replace(/_/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase());
      const messages = Array.isArray(value) ? value : [value];
      return messages.map((message) => `${label}: ${message}`);
    })
    .join(" ");
};

/* ── EMAIL HELPER — mobile pe mail app, desktop pe Gmail web ── */
const getMailHref = (email, subject = "", body = "") => {
  const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent);

  if (isMobile) {
    const params = new URLSearchParams();
    if (subject) params.set("subject", subject);
    if (body) params.set("body", body);
    const query = params.toString();
    return `mailto:${email}${query ? `?${query}` : ""}`;
  }

  const params = new URLSearchParams({
    view: "cm",
    fs: "1",
    to: email,
  });

  if (subject) params.set("su", subject);
  if (body) params.set("body", body);

  return `https://mail.google.com/mail/?${params.toString()}`;
};

/* ── CONTACT FORM ── */
function ContactForm() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", phone: "91", message: "" });
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);

  useEffect(() => {
    if (!submitted) return undefined;

    const timer = window.setTimeout(() => {
      setSubmitted(false);
      setSubmitResult(null);
    }, 5000);

    return () => window.clearTimeout(timer);
  }, [submitted]);

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) e.email = "Valid email required";
    if (!form.subject.trim()) e.subject = "Subject is required";
    if (!form.phone.trim()) e.phone = "Number is required";
    else if (!/^\+?\d{10,15}$/.test(form.phone.trim())) e.phone = "Enter a valid phone number";
    if (!form.message.trim()) e.message = "Message is required";
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    const phoneNumber = form.phone.trim().startsWith("+")
      ? form.phone.trim()
      : `+${form.phone.trim()}`;

    setIsSubmitting(true);
    setErrors({});
    setSubmitResult(null);
    setSubmitted(false);

    try {
      const response = await fetch(CONTACT_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: form.name.trim(),
          email: form.email.trim(),
          phone_number: phoneNumber,
          subject: form.subject.trim(),
          message: form.message.trim(),
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(formatApiErrors(data) || "Message submit nahi ho paya. Please try again.");
      }

      setSubmitResult(data);
      setForm({ name: "", email: "", subject: "", phone: "91", message: "" });
      setSubmitted(true);
    } catch (error) {
      setErrors({ form: error.message || "Message submit nahi ho paya. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="ct-form-wrap">
      {submitted && (
        <div className="ct-submit-success" role="status" aria-live="polite">
          <span className="ct-submit-success-icon">
            <CheckCircle size={20} />
          </span>
          <div className="ct-submit-success-copy">
            <strong>Message received</strong>
            <span>{submitResult?.message || "Thank you for reaching out. Our team will get back to you soon."}</span>
          </div>
        </div>
      )}
      <div className="ct-form-row">
        <div className="ct-form-group">
          <label className="ct-form-label">Full Name *</label>
          <input className={`ct-form-input${errors.name ? " ct-err" : ""}`} placeholder="Your full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          {errors.name && <span className="ct-error-msg">{errors.name}</span>}
        </div>
        <div className="ct-form-group">
          <label className="ct-form-label">Email Address *</label>
          <input type="email" className={`ct-form-input${errors.email ? " ct-err" : ""}`} placeholder="you@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          {errors.email && <span className="ct-error-msg">{errors.email}</span>}
        </div>
      </div>
      <div className="ct-form-row">
        <div className="ct-form-group">
          <label className="ct-form-label">Subject *</label>
          <input className={`ct-form-input${errors.subject ? " ct-err" : ""}`} placeholder="How can we help?" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
          {errors.subject && <span className="ct-error-msg">{errors.subject}</span>}
        </div>
        <div className="ct-form-group">
          <label className="ct-form-label">Number *</label>
          <PhoneInput
            country={"in"}
            prefix="+"
            value={form.phone}
            onChange={(phone) => setForm({ ...form, phone })}
            inputClass="ct-form-input"
            containerClass="ct-phone-container"
          />
          {errors.phone && <span className="ct-error-msg">{errors.phone}</span>}
        </div>
      </div>
      <div className="ct-form-group">
        <label className="ct-form-label">Message * <span className="ct-char-count">({form.message.length}/600)</span></label>
        <textarea className={`ct-form-textarea${errors.message ? " ct-err" : ""}`} placeholder="Write your message here..." value={form.message} maxLength={600} onChange={(e) => setForm({ ...form, message: e.target.value })} />
        {errors.message && <span className="ct-error-msg">{errors.message}</span>}
      </div>
      {errors.form && <span className="ct-error-msg">{errors.form}</span>}
      <button className="ct-submit-btn" onClick={handleSubmit} disabled={isSubmitting}>
        <Send size={15} /> {isSubmitting ? "Sending..." : "Send Message"}
      </button>
    </div>
  );
}

/* ══════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════ */
export default function ContactPage() {
  return (
    <>
      {/* <PageSeo
        title="Contact News4Bharat | Get in Touch with Our Team"
        description="Reach out to News4Bharat for feedback, partnerships, press inquiries, or support. We’re here to assist you."
        keywords="contact News4Bharat, news website contact India, media inquiries"
        path="/contact-us"
      /> */}
      <PageSeo
        {...STATIC_PAGE_SEO["/contact-us"]}
      />
      <aside className="home-layout-ad home-layout-ad--left" aria-label="Left advertisement">
        <AdvertisementSlot page="home" placement="home_side_left" variant="sideRail" className="home-side-ad home-side-ad--left" dismissible minWidth={1024} />
      </aside>
      <aside className="home-layout-ad home-layout-ad--right" aria-label="Right advertisement">
        <AdvertisementSlot page="home" placement="home_side_right" variant="sideRail" className="home-side-ad home-side-ad--right" dismissible minWidth={1024} />
      </aside>
      <AdvertisementSlot page="contact" placement="home_top" variant="leaderboard" className="home-top-ad home-top-ad--desktop" minWidth={769} />
      <AdvertisementSlot page="contact" placement="home_top_mobile" variant="mobileStrip" className="home-top-ad home-top-ad--mobile" maxWidth={768} />
      <div className="contact-page">

        {/* ══════════ HERO ══════════ */}
        <section className="ct-hero relative w-full max-[768px]:!h-auto max-[768px]:!min-h-0 max-[768px]:aspect-[3/2]">
          <img
            src={contactBg}
            alt="Contact News4Bharat"
            className="absolute inset-0 z-0 h-full w-full object-cover object-center"
          />
          <div className="ct-hero-overlay" />
          {/* <div className="ct-hero-content">
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
          </div> */}
        </section>

        {/* ══════════ CONTACT + FORM ══════════ */}
        <section className="ct-main">
          <div className="ct-container">
            <h1 className="sr-only">Contact News4Bharat</h1>
            <div className="ct-split">

              {/* LEFT � contact info */}
              <div className="ct-split-left">

                {/* Contact Emails */}
                <FadeIn direction="left" delay={0.05}>
                  <div className="ct-info-block">
                    <span className="ct-label">Contact Us</span>
                    <p className="ct-contact-desc">
                      We'd be glad to hear from you. We aim to respond to all queries within 24�48 hours.
                    </p>
                    <div className="ct-email-list">
                      {contactEmails.map(({ label, email }) => (
                        <div key={email} className="ct-email-row">
                          <span className="ct-email-tag">{label}</span>
                          <a
                            href={getMailHref(email)}
                            className="ct-email-link"
                            target="_blank"
                            rel="noreferrer"
                          >
                            <Mail size={14} /> {email}
                          </a>
                        </div>
                      ))}
                      {contactPhones.map(({ label, number, href }) => (
                        <div key={number} className="ct-email-row">
                          <span className="ct-email-tag">{label}</span>
                          <a href={href} className="ct-email-link">
                            <Phone size={14} /> {number}
                          </a>
                        </div>
                      ))}
                    </div>
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

              {/* RIGHT � form */}
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
                    <a
                      href={getMailHref("info@news4bharat.com")}
                      className="ct-ad-cta-email"
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Mail size={15} /> info@news4bharat.com
                    </a>
                  </div>
                </div>
              </FadeIn>
            </div>
          </div>
        </section>

      </div>
    </>
  );
}
