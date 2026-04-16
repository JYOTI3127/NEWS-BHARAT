import { useState, useEffect, useRef } from "react";
import {
  Mic, Globe, Edit3, Shield, Video, TrendingUp,
  CheckCircle, ArrowRight, Send, X, Briefcase, MapPin, Clock, FileText,
} from "lucide-react";
import PageSeo from "../components/PageSeo";
import careerBg from "../assets/career-img.png";

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
                <div className="flex gap-5 mt-1">
                  <label className="flex items-center gap-[7px] text-[0.875rem] font-medium cursor-pointer">
                    <input type="radio" name="jobType" value="Full-Time" checked={form.jobType === "Full-Time"} onChange={(e) => setForm({ ...form, jobType: e.target.value })} />
                    Full-Time
                  </label>
                  <label className="flex items-center gap-[7px] text-[0.875rem] font-medium cursor-pointer">
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
                  className="hidden"
                  onChange={(e) => setForm({ ...form, resume: e.target.files[0] })}
                />
                <label htmlFor="resumeInput" className="cp-resume-label">
                  {form.resume ? (
                    <><CheckCircle size={15} className="text-[#0FBC87] mr-[7px]" />{form.resume.name}</>
                  ) : (
                    <><FileText size={15} className="mr-[7px]" />Click to upload Resume (PDF, DOC)</>
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
  return (
    <div className="cp-role-card cp-role-card--open">
      <div className="cp-role-top">
        <div className="cp-role-icon">{role.icon}</div>
        <div className="cp-role-info">
          <h3 className="cp-role-title">{role.title}</h3>
          <div className="cp-role-meta">
            <span className="cp-role-badge"><Clock size={11} /> {role.type}</span>
            <span className="cp-role-badge cp-role-badge--loc"><MapPin size={11} /> {role.location}</span>
          </div>
        </div>
      </div>
      <div className="cp-role-body">
        <p className="cp-role-desc">{role.desc}</p>
        <div className="cp-skills-row">
          {role.skills.map((s, i) => <span key={i} className="cp-skill-pill">{s}</span>)}
        </div>
        <button className="cp-apply-btn" onClick={() => onApply(role)}>
          Apply Now <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════ */
export default function CareersPage() {
  const [activeModal, setActiveModal] = useState(null);

  return (
    <>
      <PageSeo
        title="Careers at News4Bharat | Jobs in Media & Journalism India"
        description="Explore career opportunities at News4Bharat. Join our team of journalists, editors, and content creators shaping the future of news in India."
        path="/careers"
      />
      <div className="careers-page">

        {/* ══════════ HERO ══════════ */}
        <section className="cp-hero">
          <div className="cp-hero-bg">
            <img
              src={careerBg}
              alt=""
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: "center",
              
                zIndex: 0,
              }}
            />
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
    </>
  );
}
