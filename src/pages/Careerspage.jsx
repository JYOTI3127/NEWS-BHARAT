import { useState, useEffect, useRef } from "react";
import {
  Mic, Globe, Edit3, Shield, Video, TrendingUp,
  CheckCircle, ArrowRight, Send, X, Briefcase, ChevronDown, MapPin, Clock, FileText,
} from "lucide-react";

import "../style.css";

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
const openRoles = [
  { id: 1, icon: <Mic size={19} />, title: "Reporter — National Desk", type: "Full-Time", location: "Delhi / Remote", desc: "Cover national politics, policy, and governance with in-depth field reporting.", skills: ["Investigative Reporting", "Source Cultivation", "Breaking News"] },
  { id: 2, icon: <Globe size={19} />, title: "Reporter — State Desk", type: "Full-Time", location: "Multiple States", desc: "Ground-level reporting from across Bharat's states. Regional language fluency preferred.", skills: ["Regional Journalism", "Field Reporting", "Hindi / Regional Language"] },
  { id: 3, icon: <Edit3 size={19} />, title: "Copy Editor", type: "Full-Time", location: "Delhi / Remote", desc: "Ensure editorial accuracy, tone consistency, and language quality across all content.", skills: ["Editorial Eye", "Fact Verification", "Style Guides"] },
  { id: 4, icon: <Shield size={19} />, title: "Fact-Check Analyst", type: "Full-Time", location: "Remote", desc: "Identify, investigate, and debunk misinformation. Build and maintain a fact-check database.", skills: ["Source Verification", "Data Analysis", "OSINT Tools"] },
  { id: 5, icon: <Video size={19} />, title: "Multimedia Journalist", type: "Full-Time", location: "Delhi", desc: "Produce video reports, reels, and visual storytelling content for digital platforms.", skills: ["Video Production", "Editing (Premiere / FCP)", "Social Storytelling"] },
  { id: 6, icon: <TrendingUp size={19} />, title: "SEO & Audience Strategist", type: "Full-Time", location: "Remote", desc: "Drive organic discovery and grow audiences through data-led content decisions.", skills: ["SEO / SEM", "Google Analytics", "Content Strategy"] },
];

/* ── APPLY MODAL ── */
function ApplyModal({ role, onClose }) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", portfolio: "", cover: "", jobType: "Full-Time", resume: null });
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Name is required";
    else if (!/^[a-zA-Z\s]+$/.test(form.name)) e.name = "Name must contain letters only";
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) e.email = "Valid email required";
    if (form.phone && !/^\d{10}$/.test(form.phone.replace(/\s/g, ""))) e.phone = "Phone must be 10 digits only";
    if (!form.cover.trim()) e.cover = "Cover note is required";
    return e;
  };

  const handleSubmit = () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSubmitted(true);
  };

  return (
    <div className="cp-modal-overlay" onClick={onClose}>
      <div className="cp-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="cp-modal-header">
          <div>
            <p className="cp-modal-label">Applying for</p>
            <h3 className="cp-modal-title">{role?.title || "Editorial Internship"}</h3>
          </div>
          <button className="cp-modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        {submitted ? (
          <div className="cp-success-box">
            <div className="cp-success-icon"><CheckCircle size={32} /></div>
            <h3 className="cp-success-title">Application Received</h3>
            <p className="cp-success-text">Thank you for applying to News4Bharat. Our editorial team will review your application and reach out within 7 working days.</p>
            <button className="cp-success-btn" onClick={onClose}>Close</button>
          </div>
        ) : (
          <div className="cp-modal-body">
            <div className="cp-form-row">
              <div className="cp-form-group">
                <label className="cp-form-label">Full Name *</label>
                <input
                  className={`cp-form-input${errors.name ? " cp-err" : ""}`}
                  placeholder="Your full name"
                  value={form.name}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^a-zA-Z\s]/g, "");
                    setForm({ ...form, name: val });
                  }}
                />
                {errors.name && <span className="cp-error-msg">{errors.name}</span>}
              </div>
              <div className="cp-form-group">
                <label className="cp-form-label">Email Address *</label>
                <input className={`cp-form-input${errors.email ? " cp-err" : ""}`} placeholder="you@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                {errors.email && <span className="cp-error-msg">{errors.email}</span>}
              </div>
            </div>
            <div className="cp-form-row">
              <div className="cp-form-group">
                <label className="cp-form-label">Phone Number</label>
                <input
                  className={`cp-form-input${errors.phone ? " cp-err" : ""}`}
                  placeholder="+91 XXXXX XXXXX"
                  value={form.phone}
                  maxLength={10}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, "");
                    setForm({ ...form, phone: val });
                  }}
                />
                {errors.phone && <span className="cp-error-msg">{errors.phone}</span>}
              </div>
              <div className="cp-form-group">
                <label className="cp-form-label">Portfolio / LinkedIn</label>
                <input className="cp-form-input" placeholder="https://..." value={form.portfolio} onChange={(e) => setForm({ ...form, portfolio: e.target.value })} />
              </div>
              <div className="cp-form-group">
                <label className="cp-form-label">Job Type *</label>
                <div style={{ display: "flex", gap: "20px", marginTop: "4px" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "7px", fontSize: "0.875rem", fontWeight: "500", cursor: "pointer" }}>
                    <input type="radio" name="jobType" value="Full-Time" checked={form.jobType === "Full-Time"} onChange={(e) => setForm({ ...form, jobType: e.target.value })} />
                    Full-Time
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: "7px", fontSize: "0.875rem", fontWeight: "500", cursor: "pointer" }}>
                    <input type="radio" name="jobType" value="Part-Time" checked={form.jobType === "Part-Time"} onChange={(e) => setForm({ ...form, jobType: e.target.value })} />
                    Part-Time
                  </label>
                </div>
              </div>
            </div>

            <div className="cp-form-group">
              <label className="cp-form-label">Resume / CV *</label>
              <div className={`cp-resume-upload${form.resume ? " cp-resume-has-file" : ""}`}>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  id="resumeInput"
                  style={{ display: "none" }}
                  onChange={(e) => setForm({ ...form, resume: e.target.files[0] })}
                />
                <label htmlFor="resumeInput" className="cp-resume-label">
                  {form.resume ? (
                    <><CheckCircle size={15} style={{ color: "#0FBC87", marginRight: "7px" }} />{form.resume.name}</>
                  ) : (
                    <><FileText size={15} style={{ marginRight: "7px" }} />Click to upload Resume (PDF, DOC)</>
                  )}
                </label>
              </div>
            </div>

            <div className="cp-form-group">
              <label className="cp-form-label">Cover Note * <span className="cp-char-count">({form.cover.length}/500)</span></label>
              <textarea className={`cp-form-textarea${errors.cover ? " cp-err" : ""}`} placeholder="Tell us why you want to join News4Bharat..." value={form.cover} maxLength={500} onChange={(e) => setForm({ ...form, cover: e.target.value })} />
              {errors.cover && <span className="cp-error-msg">{errors.cover}</span>}
            </div>
            <div className="cp-modal-footer">
              <p className="cp-modal-note">By submitting, you agree to our privacy policy. We do not share applicant data.</p>
              <button className="cp-submit-btn" onClick={handleSubmit}><Send size={14} /> Submit Application</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── ROLE CARD ── */
function RoleCard({ role, onApply }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className={`cp-role-card${expanded ? " cp-role-card--open" : ""}`}>
      <div className="cp-role-top" onClick={() => setExpanded(!expanded)}>
        <div className="cp-role-icon">{role.icon}</div>
        <div className="cp-role-info">
          <h3 className="cp-role-title">{role.title}</h3>
          <div className="cp-role-meta">
            <span className="cp-role-badge"><Clock size={11} /> {role.type}</span>
            <span className="cp-role-badge cp-role-badge--loc"><MapPin size={11} /> {role.location}</span>
          </div>
        </div>
        <span className={`cp-chevron${expanded ? " cp-chevron--up" : ""}`}><ChevronDown size={17} /></span>
      </div>
      {expanded && (
        <div className="cp-role-body">
          <p className="cp-role-desc">{role.desc}</p>
          <div className="cp-skills-row">
            {role.skills.map((s, i) => <span key={i} className="cp-skill-pill">{s}</span>)}
          </div>
          <button className="cp-apply-btn" onClick={() => onApply(role)}>
            Apply Now <ArrowRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════ */
export default function CareersPage() {
  const [activeModal, setActiveModal] = useState(null);

  return (
    <div className="careers-page">

      {/* ══════════ HERO ══════════ */}
      <section className="cp-hero">
        <div className="cp-hero-bg">
          <div className="cp-hero-img" />
          <svg className="cp-hero-svg" viewBox="0 0 1400 560" preserveAspectRatio="xMidYMid slice">
            <defs>
              <linearGradient id="cpBg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#001d52" stopOpacity="0.88" />
                <stop offset="60%" stopColor="#002765" stopOpacity="0.82" />
                <stop offset="100%" stopColor="#003080" stopOpacity="0.78" />
              </linearGradient>
              <linearGradient id="cpWm" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
                <stop offset="40%" stopColor="#ffffff" stopOpacity="0.06" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
              </linearGradient>
            </defs>
            <rect width="1400" height="560" fill="url(#cpBg)" />
          </svg>
        </div>
        <div className="cp-hero-content">
          <FadeIn direction="none" delay={0.1}>
            <div className="cp-hero-badge">
              <span className="cp-badge-dot" />
              <span className="cp-badge-text">Grow With News4Bharat</span>
            </div>
          </FadeIn>
          <FadeIn direction="up" delay={0.2}>
            <h1 className="cp-hero-title">Careers at<br /><span className="cp-hero-accent">News4Bharat</span></h1>
          </FadeIn>
          <FadeIn direction="up" delay={0.3}>
            <p className="cp-hero-sub">We are building a newsroom rooted in integrity and innovation.</p>
          </FadeIn>
        </div>
      </section>

      {/* ══════════ OPEN ROLES ══════════ */}
      <section className="cp-section cp-bg-grey">
        <div className="cp-container">
          <FadeIn>
            <div className="cp-sec-hd cp-center">
              <span className="cp-label">Open Roles</span>
              <h2 className="cp-title-md">Current openings at News4Bharat</h2>
              <div className="cp-divider" />
            </div>
          </FadeIn>
          <div className="cp-roles-grid">
            {openRoles.map((role, i) => (
              <FadeIn key={role.id} delay={i * 0.06}>
                <RoleCard role={role} onApply={setActiveModal} />
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ INTERNSHIPS ══════════ */}
      <section className="cp-section cp-bg-dark">
        <div className="cp-container">
          <FadeIn direction="up">
            <div className="cp-intern-simple">
              <span className="cp-label cp-label--light">Internships</span>
              <p className="cp-intern-body">We offer editorial internships for aspiring journalists passionate about ethical reporting.</p>
              <button className="cp-intern-btn" onClick={() => setActiveModal({ title: "Editorial Internship" })}>
                <Briefcase size={16} /> Apply for Internship
              </button>
            </div>
          </FadeIn>
        </div>
      </section>

      {activeModal && <ApplyModal role={activeModal} onClose={() => setActiveModal(null)} />}
    </div>
  );
}