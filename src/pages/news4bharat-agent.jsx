import { useState, useRef } from "react";
import {
    Star, Radio, Newspaper, Flame, Lightbulb,
    Plus, X, Eye, Download, ArrowLeft,
    Image, Link, Upload, Clock, Tag, AlignLeft, Type
} from "lucide-react";

const BRAND = { blue: "#1950DF", gold: "#FEAD17", red: "#FA2E1A", green: "#0FBC87", black: "#0a0a0a" };

const SECTIONS = [
    { id: "hero",       icon: Star,      label: "Hero Story",      max: 1, color: BRAND.blue },
    { id: "breaking",   icon: Radio,     label: "Breaking News",    max: 5, color: BRAND.red },
    { id: "topStories", icon: Newspaper, label: "Top Stories",      max: 3, color: BRAND.blue },
    { id: "moreBharat", icon: Flame,     label: "More From Bharat", max: 4, color: BRAND.gold },
    { id: "explainers", icon: Lightbulb, label: "Explainers",       max: 3, color: BRAND.green },
];

const CATEGORIES = [
    "Politics", "Economy", "Technology", "Sports", "Health", "Security",
    "Diplomacy", "Infrastructure", "Education", "Markets", "Energy",
    "Entertainment", "Startups", "Cricket", "Space",
];

const UNSPLASH = {
    Politics: "1532375810709-75b1da00537c", Economy: "1611974789855-9c2a0a7236a3",
    Technology: "1526374965328-7f61d4dc18c5", Sports: "1540747913346-19e32dc3e97e",
    Health: "1631217868264-e5b90bb7e133", Security: "1558618666-fcd25c85cd64",
    Diplomacy: "1504711434969-e33886168f5c", Infrastructure: "1508739773434-c26b3d09e071",
    Education: "1570126618953-d437176e8c79", Markets: "1611974789855-9c2a0a7236a3",
    Energy: "1590283603385-17ffb3a7f29f", Entertainment: "1516251193007-45ef944ab0c6",
    Startups: "1526374965328-7f61d4dc18c5", Default: "1504711434969-e33886168f5c",
    Cricket: "1540747913346-19e32dc3e97e", Space: "1457364887197-9150188c107b",
};

const CAT_COLOR = {
    Politics: "#FA2E1A", Economy: "#0FBC87", Technology: "#1950DF", Sports: "#1950DF",
    Health: "#0FBC87", Security: "#FA2E1A", Diplomacy: "#1950DF", Infrastructure: "#FEAD17",
    Education: "#808080", Markets: "#0FBC87", Energy: "#0FBC87", Entertainment: "#FEAD17",
    Startups: "#1950DF", Cricket: "#1950DF", Space: "#1950DF", Default: "#1950DF",
};

const uimg = (cat, w = 600) =>
    `https://images.unsplash.com/photo-${UNSPLASH[cat] || UNSPLASH.Default}?w=${w}&q=80&fit=crop`;

const esc = (s) => String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const cc = (c) => CAT_COLOR[c] || CAT_COLOR.Default;

const emptyArticle = (section = "breaking") => ({
    id: Date.now() + Math.random(),
    section,
    title: "",
    summary: "",
    heroBody: "",
    category: "Economy",
    date: new Date().toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }),
    readTime: "3 min read",
    url: "",
    imageUrl: "",
    imageBase64: "",
});

const getImg = (a, w = 600) => {
    if (a.imageBase64) return a.imageBase64;
    if (a.imageUrl) return a.imageUrl;
    return uimg(a.category, w);
};

// ── Newsletter HTML Builder ───────────────────────────────────────────────────
function buildHTML(articles, meta) {
    const secs = { hero: [], breaking: [], topStories: [], moreBharat: [], explainers: [] };
    articles.forEach((a) => { if (a.title.trim()) secs[a.section]?.push(a); });

    const h  = secs.hero?.[0];
    const br = secs.breaking    || [];
    const ts = secs.topStories  || [];
    const mb = secs.moreBharat  || [];
    const ex = secs.explainers  || [];

    const brHTML = br.map((a) => `
    <tr><td style="padding:12px 0;border-bottom:1px solid #e5e3de;">
      <table width="100%" cellpadding="0" cellspacing="0"><tr>
        <td width="72" valign="top" style="padding-right:14px;">
          <img src="${getImg(a, 200)}" width="72" height="30" style="display:block;border-radius:2px;object-fit:cover;" alt="${esc(a.category)}"/>
        </td>
        <td valign="top">
          <div style="font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:${cc(a.category)};margin-bottom:3px;">${esc(a.category)}</div>
          <div style="font-size:12px;font-weight:600;color:#1a1a1a;line-height:1.45;margin-bottom:3px;">${esc(a.title)}</div>
          <div style="font-size:9px;color:#6b6b6b;">${esc(a.date)} · ${esc(a.readTime)}</div>
        </td>
      </tr></table>
    </td></tr>`).join("");

    const tsHTML = ts.map((a) => `
    <tr><td style="padding:18px 0;border-bottom:1px solid #e5e3de;">
      <table width="100%" cellpadding="0" cellspacing="0"><tr>
        <td width="180" valign="top" style="padding-right:18px;">
          <img src="${getImg(a, 400)}" width="180" height="120" style="display:block;border-radius:2px;object-fit:cover;" alt="${esc(a.category)}"/>
        </td>
        <td valign="top">
          <div style="font-size:8px;font-weight:700;text-transform:uppercase;color:${cc(a.category)};margin-bottom:6px;">${esc(a.category)}</div>
          <div style="font-size:14px;font-weight:700;color:#1a1a1a;line-height:1.4;margin-bottom:6px;">${esc(a.title)}</div>
          <div style="font-size:11px;color:#6b6b6b;line-height:1.7;margin-bottom:10px;">${esc(a.summary)}</div>
          <a href="${a.url || '#'}" style="font-size:9px;font-weight:700;color:${cc(a.category)};text-decoration:none;text-transform:uppercase;">Read More →</a>
        </td>
      </tr></table>
    </td></tr>`).join("");

    const mbRows = [];
    for (let i = 0; i < mb.length; i += 2) {
        const pair = mb.slice(i, i + 2);
        mbRows.push(`<tr><td style="padding:16px 0;border-bottom:1px solid #e5e3de;">
      <table width="100%" cellpadding="0" cellspacing="0"><tr>
        ${pair.map((a) => `<td width="50%" valign="top" style="padding-right:10px;">
          <img src="${getImg(a, 300)}" width="100%" height="100" style="display:block;border-radius:2px;object-fit:cover;margin-bottom:8px;" alt="${esc(a.category)}"/>
          <div style="font-size:8px;font-weight:700;text-transform:uppercase;color:${cc(a.category)};margin-bottom:4px;">${esc(a.category)}</div>
          <div style="font-size:12px;font-weight:700;color:#1a1a1a;line-height:1.4;margin-bottom:4px;">${esc(a.title)}</div>
          <div style="font-size:10px;color:#6b6b6b;line-height:1.6;">${esc(a.summary)}</div>
        </td>`).join("")}
      </tr></table>
    </td></tr>`);
    }

    const exHTML = ex.map((a, i) => `
    <tr><td style="padding:14px 0;border-bottom:${i < ex.length - 1 ? "1px solid #1c1c1c" : "none"};">
      <table width="100%" cellpadding="0" cellspacing="0"><tr>
        <td width="28" valign="top"><div style="font-size:11px;font-weight:800;color:#FEAD17;">${String(i + 1).padStart(2, "0")}</div></td>
        <td valign="top">
          <div style="font-size:12px;font-weight:600;color:#fff;line-height:1.45;margin-bottom:3px;">${esc(a.title)}</div>
          <div style="font-size:10px;color:#555;line-height:1.6;margin-bottom:6px;">${esc(a.summary)}</div>
          <span style="font-size:8px;font-weight:600;text-transform:uppercase;color:#0FBC87;border:1px solid #1e3d33;padding:2px 8px;border-radius:20px;">${esc(a.readTime)}</span>
        </td>
      </tr></table>
    </td></tr>`).join("");

    return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<title>News4Bharat — Issue #${esc(meta.issueNum)}</title>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800&family=DM+Serif+Display:ital@0;1&display=swap" rel="stylesheet">
</head><body style="margin:0;padding:0;background:#ece9e3;font-family:'Poppins',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px;">
<table width="640" cellpadding="0" cellspacing="0" style="background:#fff;box-shadow:0 2px 40px rgba(0,0,0,0.10);">

  <!-- HEADER -->
  <tr><td style="padding:24px 36px 0;border-bottom:1px solid #e5e3de;">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td>
        ${meta.logoUrl
            ? `<img src="${meta.logoUrl}" alt="News4Bharat" style="height:48px;display:block;"/>`
            : `<div style="font-size:22px;font-weight:800;color:#0a0a0a;font-family:'Poppins',sans-serif;">News<span style="color:#1950DF;">4</span>Bharat</div>`
        }
      </td>
      <td align="right">
        <div style="font-size:9px;color:#6b6b6b;text-transform:uppercase;letter-spacing:1.5px;">Issue #${esc(meta.issueNum)}</div>
        <div style="font-size:11px;font-weight:600;color:#1a1a1a;margin-top:2px;">${esc(meta.weekDate)}</div>
      </td>
    </tr></table>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;"><tr>
      <td width="25%" height="3" style="background:#1950DF;"></td>
      <td width="25%" height="3" style="background:#FA2E1A;"></td>
      <td width="25%" height="3" style="background:#0FBC87;"></td>
      <td width="25%" height="3" style="background:#FEAD17;"></td>
    </tr></table>
  </td></tr>

  ${h ? `<tr><td style="padding:32px 36px;border-bottom:1px solid #e5e3de;">
    <div style="margin-bottom:16px;">
      <span style="display:inline-block;width:7px;height:7px;background:#1950DF;border-radius:50%;margin-right:7px;vertical-align:middle;"></span>
      <span style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#1950DF;">${esc(h.category)}</span>
    </div>
    <img src="${getImg(h, 800)}" width="100%" height="280" style="display:block;object-fit:cover;border-radius:2px;margin-bottom:20px;" alt="${esc(h.category)}"/>
    <div style="font-family:'DM Serif Display',serif;font-size:28px;line-height:1.25;color:#0a0a0a;margin-bottom:12px;">${esc(h.title)}</div>
    <div style="font-size:13px;color:#6b6b6b;line-height:1.8;margin-bottom:18px;">${esc(h.heroBody || h.summary)}</div>
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td><span style="font-size:10px;color:#aaa;">By <b style="color:#1a1a1a;">News4Bharat</b> · ${esc(h.date)}</span></td>
      <td align="right"><a href="${h.url || '#'}" style="display:inline-block;background:#1950DF;color:#fff;font-size:10px;font-weight:700;text-transform:uppercase;padding:9px 20px;text-decoration:none;border-radius:2px;">Read Full Story</a></td>
    </tr></table>
  </td></tr>` : ""}

  ${br.length ? `<tr><td style="padding:24px 36px 16px;">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td width="24" height="3" style="background:#FA2E1A;border-radius:2px;"></td>
      <td style="padding-left:12px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:2.5px;color:#6b6b6b;">Breaking News</td>
      <td style="border-top:1px solid #e5e3de;"></td>
    </tr></table>
  </td></tr>
  <tr><td style="background:#F7F6F3;border-top:2px solid #FA2E1A;padding:0 36px 4px;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="padding:16px 0 14px;border-bottom:1px solid #e5e3de;">
        <span style="background:#FA2E1A;color:#fff;font-size:9px;font-weight:800;text-transform:uppercase;padding:4px 10px;border-radius:2px;">Breaking</span>
        <span style="font-size:12px;font-weight:700;color:#1a1a1a;margin-left:8px;">This Week's Headlines</span>
        <span style="float:right;font-size:9px;color:#6b6b6b;">${br.length} Stories</span>
      </td></tr>${brHTML}
    </table>
  </td></tr>` : ""}

  ${ts.length ? `<tr><td style="padding:24px 36px 16px;">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td width="24" height="3" style="background:#1950DF;border-radius:2px;"></td>
      <td style="padding-left:12px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:2.5px;color:#6b6b6b;">Top Stories</td>
      <td style="border-top:1px solid #e5e3de;"></td>
    </tr></table>
  </td></tr>
  <tr><td style="padding:0 36px 8px;"><table width="100%" cellpadding="0" cellspacing="0">${tsHTML}</table></td></tr>` : ""}

  ${mb.length ? `<tr><td style="padding:24px 36px 16px;">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td width="24" height="3" style="background:#FEAD17;border-radius:2px;"></td>
      <td style="padding-left:12px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:2.5px;color:#6b6b6b;">More From Bharat</td>
      <td style="border-top:1px solid #e5e3de;"></td>
    </tr></table>
  </td></tr>
  <tr><td style="padding:0 36px 8px;"><table width="100%" cellpadding="0" cellspacing="0">${mbRows.join("")}</table></td></tr>` : ""}

  ${ex.length ? `<tr><td style="background:#0a0a0a;padding:28px 36px;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="padding-bottom:20px;">
        <span style="background:#FEAD17;color:#0a0a0a;font-size:9px;font-weight:800;text-transform:uppercase;padding:5px 12px;">Explainers</span>
        <span style="font-size:10px;color:#555;margin-left:10px;">Understand the story behind the story</span>
      </td></tr>${exHTML}
    </table>
  </td></tr>` : ""}

  <!-- FOOTER -->
  <tr><td style="background:#F7F6F3;padding:28px 36px;border-top:1px solid #e5e3de;text-align:center;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td align="center" style="padding-bottom:14px;">
        ${meta.logoUrl
            ? `<img src="${meta.logoUrl}" alt="News4Bharat" style="height:36px;display:inline-block;"/>`
            : `<span style="font-size:16px;font-weight:800;color:#0a0a0a;font-family:'Poppins',sans-serif;">News<span style="color:#1950DF;">4</span>Bharat</span>`
        }
      </td></tr>
      <tr><td align="center" style="padding-bottom:16px;">
        <a href="#" style="font-size:9px;color:#6b6b6b;text-decoration:none;text-transform:uppercase;margin:0 10px;">Home</a>
        <a href="#" style="font-size:9px;color:#6b6b6b;text-decoration:none;text-transform:uppercase;margin:0 10px;">Politics</a>
        <a href="#" style="font-size:9px;color:#6b6b6b;text-decoration:none;text-transform:uppercase;margin:0 10px;">Economy</a>
        <a href="#" style="font-size:9px;color:#6b6b6b;text-decoration:none;text-transform:uppercase;margin:0 10px;">Sports</a>
        <a href="#" style="font-size:9px;color:#6b6b6b;text-decoration:none;text-transform:uppercase;margin:0 10px;">Unsubscribe</a>
      </td></tr>
      <tr><td><div style="height:1px;background:#e5e3de;margin:0 0 16px;"></div></td></tr>
      <tr><td align="center" style="font-size:9px;color:#bbb;line-height:1.8;">
        © ${new Date().getFullYear()} News4Bharat Media Pvt. Ltd. All rights reserved.<br/>
        <a href="#" style="color:#aaa;">news4bharat.com</a> · <a href="#" style="color:#aaa;">Unsubscribe</a>
      </td></tr>
    </table>
  </td></tr>

</table></td></tr></table></body></html>`;
}

// ── Image Picker ──────────────────────────────────────────────────────────────
function ImagePicker({ article, onUpdate }) {
    const fileRef = useRef();
    const [mode, setMode] = useState(
        article.imageBase64 ? "upload" : article.imageUrl ? "url" : "auto"
    );

    const handleFile = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            onUpdate("imageBase64", ev.target.result);
            onUpdate("imageUrl", "");
            setMode("upload");
        };
        reader.readAsDataURL(file);
    };

    const clearImage = () => {
        onUpdate("imageBase64", "");
        onUpdate("imageUrl", "");
        setMode("auto");
    };

    const previewSrc = article.imageBase64 || article.imageUrl || uimg(article.category, 300);

    const modeBtn = (key, Icon, label) => (
        <button key={key} onClick={() => { setMode(key); if (key === "auto") clearImage(); }}
            style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", border: `1px solid ${mode === key ? BRAND.blue : "#ddd"}`, borderRadius: 6, fontSize: 11, fontWeight: 600, background: mode === key ? "#eff6ff" : "#fff", color: mode === key ? BRAND.blue : "#777", cursor: "pointer" }}>
            <Icon size={12} />{label}
        </button>
    );

    return (
        <div>
            <label style={{ fontSize: 10, fontWeight: 700, color: "#888", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Article Image</label>
            <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                {modeBtn("auto",   Image,  "Auto")}
                {modeBtn("url",    Link,   "Image URL")}
                {modeBtn("upload", Upload, "Upload")}
            </div>
            {mode === "url" && (
                <input
                    style={{ padding: "8px 10px", border: "1px solid #ddd", borderRadius: 6, fontSize: 12, width: "100%", outline: "none", marginBottom: 8, fontFamily: "inherit" }}
                    value={article.imageUrl}
                    onChange={(e) => { onUpdate("imageUrl", e.target.value); onUpdate("imageBase64", ""); }}
                    placeholder="https://example.com/image.jpg"
                />
            )}
            {mode === "upload" && (
                <div style={{ marginBottom: 8 }}>
                    <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFile} />
                    <button onClick={() => fileRef.current?.click()}
                        style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", border: "1px dashed #ccc", borderRadius: 6, fontSize: 12, fontWeight: 600, color: "#777", background: "#fafafa", cursor: "pointer" }}>
                        <Upload size={13} /> Choose Image File
                    </button>
                    {article.imageBase64 && <span style={{ fontSize: 11, color: BRAND.green, marginTop: 4, display: "block" }}>Image uploaded!</span>}
                </div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 6 }}>
                <img src={previewSrc} alt="preview"
                    style={{ width: 80, height: 56, objectFit: "cover", borderRadius: 4, border: "1px solid #e5e3de" }}
                    onError={(e) => { e.target.src = uimg(article.category, 300); }}
                />
                <div style={{ fontSize: 11, color: "#888" }}>
                    {article.imageBase64 ? "Uploaded image" : article.imageUrl ? "Custom URL" : "Auto category image"}
                    {(article.imageBase64 || article.imageUrl) && (
                        <button onClick={clearImage} style={{ marginLeft: 8, fontSize: 10, color: BRAND.red, background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>Reset</button>
                    )}
                </div>
            </div>
        </div>
    );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function NewsletterAgent() {
    const [step, setStep]         = useState(1);
    const [issueNum, setIssueNum] = useState("001");
    const [weekDate, setWeekDate] = useState(new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }));
    const [logoBase64, setLogoBase64] = useState("");
    const [articles, setArticles] = useState([
        { ...emptyArticle("hero"),     id: 1 },
        { ...emptyArticle("breaking"), id: 2 },
        { ...emptyArticle("breaking"), id: 3 },
    ]);
    const [htmlOut, setHtmlOut] = useState("");
    const logoRef = useRef();

    const updateArticle = (id, field, value) =>
        setArticles((a) => a.map((x) => (x.id === id ? { ...x, [field]: value } : x)));

    const addArticle = () => setArticles((a) => [...a, { ...emptyArticle("breaking") }]);
    const removeArticle = (id) => setArticles((a) => a.filter((x) => x.id !== id));

    const secCount = {};
    SECTIONS.forEach((s) => (secCount[s.id] = 0));
    articles.forEach((a) => { secCount[a.section] = (secCount[a.section] || 0) + 1; });

    const handleLogo = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => setLogoBase64(ev.target.result);
        reader.readAsDataURL(file);
    };

    const buildPreview = () => {
        setHtmlOut(buildHTML(articles, { issueNum, weekDate, logoUrl: logoBase64 }));
        setStep(2);
    };

    const download = () => {
        const b = new Blob([htmlOut], { type: "text/html" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(b);
        a.download = `n4b-issue-${issueNum}.html`;
        a.click();
    };

    const hasContent = articles.some((a) => a.title.trim());
    const inp = { padding: "8px 10px", border: "1px solid #ddd", borderRadius: 6, fontSize: 12, width: "100%", outline: "none", fontFamily: "'Poppins', sans-serif" };
    const card = { background: "#fff", borderRadius: 10, padding: 20, border: "1px solid #e8e8e8", marginBottom: 12 };
    const STEPS = ["Fill Articles", "Preview & Download"];

    return (
        <div style={{ fontFamily: "'Poppins', sans-serif", minHeight: "100vh", background: "#f0f2f5", color: "#1a1a1a" }}>


            {/* Step Nav */}
            <div style={{ background: "#fff", borderBottom: "1px solid #eee" }}>
                <div style={{ display: "flex", maxWidth: 860, margin: "0 auto" }}>
                    {STEPS.map((s, i) => {
                        const active = step === i + 1, done = step > i + 1;
                        return (
                            <div key={i} style={{ padding: "13px 24px", fontSize: 12, fontWeight: 600, flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, color: active ? BRAND.blue : done ? BRAND.green : "#bbb", borderBottom: active ? `2px solid ${BRAND.blue}` : done ? `2px solid ${BRAND.green}` : "2px solid transparent" }}>
                                <span style={{ width: 20, height: 20, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, background: done ? BRAND.green : active ? BRAND.blue : "#eee", color: done || active ? "#fff" : "#bbb", flexShrink: 0 }}>{done ? "✓" : i + 1}</span>
                                {s}
                            </div>
                        );
                    })}
                </div>
            </div>

            <div style={{ maxWidth: 860, margin: "0 auto", padding: "24px 16px 48px" }}>

                {/* STEP 1 */}
                {step === 1 && (
                    <div>
                        {/* Edition Setup */}
                        <div style={card}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                                <div style={{ width: 4, height: 22, background: BRAND.blue, borderRadius: 2 }} />
                                <div style={{ fontSize: 15, fontWeight: 700 }}>Edition Setup</div>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12, marginBottom: 14 }}>
                                <div>
                                    <label style={{ fontSize: 10, fontWeight: 700, color: "#888", display: "block", marginBottom: 5, textTransform: "uppercase" }}>Issue #</label>
                                    <input style={inp} value={issueNum} onChange={(e) => setIssueNum(e.target.value)} placeholder="001" />
                                </div>
                                <div>
                                    <label style={{ fontSize: 10, fontWeight: 700, color: "#888", display: "block", marginBottom: 5, textTransform: "uppercase" }}>Week of</label>
                                    <input style={inp} value={weekDate} onChange={(e) => setWeekDate(e.target.value)} placeholder="March 21, 2026" />
                                </div>
                            </div>

                            {/* Logo Upload */}
                            <div>
                                <label style={{ fontSize: 10, fontWeight: 700, color: "#888", display: "block", marginBottom: 6, textTransform: "uppercase" }}>Newsletter Logo</label>
                                <input ref={logoRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleLogo} />
                                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                    <button onClick={() => logoRef.current?.click()}
                                        style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", border: "1px dashed #ccc", borderRadius: 6, fontSize: 12, fontWeight: 600, color: "#777", background: "#fafafa", cursor: "pointer" }}>
                                        <Upload size={13} /> Upload Logo
                                    </button>
                                    {logoBase64 && (
                                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                            <img src={logoBase64} alt="logo preview" style={{ height: 36, objectFit: "contain", border: "1px solid #e5e3de", borderRadius: 4, padding: 4 }} />
                                            <button onClick={() => setLogoBase64("")} style={{ fontSize: 10, color: BRAND.red, background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>Remove</button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Section Counter */}
                        <div style={{ ...card, padding: "14px 20px" }}>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                                {SECTIONS.map((s) => {
                                    const count = secCount[s.id], full = count >= s.max;
                                    const Icon = s.icon;
                                    return (
                                        <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 20, fontSize: 11, background: full ? "#fff5f5" : "#f6f9ff", border: `1px solid ${full ? "#fecaca" : "#dbeafe"}` }}>
                                            <Icon size={12} color={full ? BRAND.red : BRAND.blue} />
                                            <span style={{ fontWeight: 600, color: full ? BRAND.red : BRAND.blue }}>{s.label}</span>
                                            <span style={{ borderRadius: 20, padding: "1px 7px", fontSize: 10, fontWeight: 800, background: full ? BRAND.red : "#dbeafe", color: full ? "#fff" : BRAND.blue }}>{count}/{s.max}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Articles */}
                        {articles.map((a, idx) => {
                            const sec = SECTIONS.find((s) => s.id === a.section);
                            const SecIcon = sec?.icon || Star;
                            return (
                                <div key={a.id} style={{ ...card, borderLeft: `3px solid ${sec?.color || "#ddd"}` }}>
                                    {/* Header */}
                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                            <SecIcon size={16} color={sec?.color} />
                                            <span style={{ fontSize: 13, fontWeight: 700, color: sec?.color }}>Article {idx + 1}</span>
                                        </div>
                                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                            <select value={a.section} onChange={(e) => updateArticle(a.id, "section", e.target.value)}
                                                style={{ padding: "5px 8px", border: "1px solid #ddd", borderRadius: 6, fontSize: 11, fontWeight: 600, background: "#fff", outline: "none", fontFamily: "'Poppins', sans-serif" }}>
                                                {SECTIONS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                                            </select>
                                            {articles.length > 1 && (
                                                <button onClick={() => removeArticle(a.id)} style={{ width: 28, height: 28, border: "1px solid #ddd", borderRadius: 6, background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                                    <X size={13} color="#ccc" />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Category + Date */}
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                                        <div>
                                            <label style={{ fontSize: 10, fontWeight: 700, color: "#888", display: "flex", alignItems: "center", gap: 4, marginBottom: 4, textTransform: "uppercase" }}>
                                                <Tag size={10} /> Category
                                            </label>
                                            <select value={a.category} onChange={(e) => updateArticle(a.id, "category", e.target.value)}
                                                style={{ ...inp, background: "#fff" }}>
                                                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label style={{ fontSize: 10, fontWeight: 700, color: "#888", display: "flex", alignItems: "center", gap: 4, marginBottom: 4, textTransform: "uppercase" }}>
                                                <Clock size={10} /> Date
                                            </label>
                                            <input style={inp} value={a.date} onChange={(e) => updateArticle(a.id, "date", e.target.value)} placeholder="Sat, 21 Mar" />
                                        </div>
                                    </div>

                                    {/* Title */}
                                    <div style={{ marginBottom: 10 }}>
                                        <label style={{ fontSize: 10, fontWeight: 700, color: "#888", display: "flex", alignItems: "center", gap: 4, marginBottom: 4, textTransform: "uppercase" }}>
                                            <Type size={10} /> Title
                                        </label>
                                        <input style={inp} value={a.title} onChange={(e) => updateArticle(a.id, "title", e.target.value)} placeholder="Punchy headline — max 12 words" />
                                    </div>

                                    {/* Summary */}
                                    <div style={{ marginBottom: 10 }}>
                                        <label style={{ fontSize: 10, fontWeight: 700, color: "#888", display: "flex", alignItems: "center", gap: 4, marginBottom: 4, textTransform: "uppercase" }}>
                                            <AlignLeft size={10} /> Summary
                                        </label>
                                        <textarea style={{ ...inp, height: 72, resize: "vertical" }} value={a.summary} onChange={(e) => updateArticle(a.id, "summary", e.target.value)} placeholder="2-3 sentence summary..." />
                                    </div>

                                    {/* Hero Body */}
                                    {a.section === "hero" && (
                                        <div style={{ marginBottom: 10 }}>
                                            <label style={{ fontSize: 10, fontWeight: 700, color: "#888", display: "flex", alignItems: "center", gap: 4, marginBottom: 4, textTransform: "uppercase" }}>
                                                <AlignLeft size={10} /> Hero Body
                                            </label>
                                            <textarea style={{ ...inp, height: 80, resize: "vertical" }} value={a.heroBody} onChange={(e) => updateArticle(a.id, "heroBody", e.target.value)} placeholder="3-4 sentence lead paragraph..." />
                                        </div>
                                    )}

                                    {/* Image Picker */}
                                    <div style={{ marginBottom: 10, padding: 14, background: "#f9fafb", borderRadius: 8, border: "1px solid #e8e8e8" }}>
                                        <ImagePicker article={a} onUpdate={(field, value) => updateArticle(a.id, field, value)} />
                                    </div>

                                    {/* URL + Read Time */}
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                                        <div>
                                            <label style={{ fontSize: 10, fontWeight: 700, color: "#888", display: "flex", alignItems: "center", gap: 4, marginBottom: 4, textTransform: "uppercase" }}>
                                                <Link size={10} /> Article URL
                                            </label>
                                            <input style={inp} value={a.url} onChange={(e) => updateArticle(a.id, "url", e.target.value)} placeholder="https://..." />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: 10, fontWeight: 700, color: "#888", display: "flex", alignItems: "center", gap: 4, marginBottom: 4, textTransform: "uppercase" }}>
                                                <Clock size={10} /> Read Time
                                            </label>
                                            <input style={inp} value={a.readTime} onChange={(e) => updateArticle(a.id, "readTime", e.target.value)} placeholder="3 min read" />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        <button onClick={addArticle} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 16px", background: "#fafafa", border: "1px dashed #ccc", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 600, color: "#777", width: "100%", marginBottom: 12, fontFamily: "'Poppins', sans-serif" }}>
                            <Plus size={14} /> Add Another Article
                        </button>

                        <button onClick={buildPreview} disabled={!hasContent} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: 14, background: hasContent ? BRAND.blue : "#ccc", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: hasContent ? "pointer" : "not-allowed", width: "100%", fontFamily: "'Poppins', sans-serif" }}>
                            <Eye size={16} /> Preview Newsletter
                        </button>
                    </div>
                )}

                {/* STEP 2 */}
                {step === 2 && (
                    <div>
                        <div style={{ background: "#fff", borderRadius: 10, padding: "16px 20px", border: "1px solid #e8e8e8", marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                            <div>
                                <div style={{ fontSize: 15, fontWeight: 700 }}>Newsletter Ready!</div>
                                <div style={{ fontSize: 12, color: "#888", marginTop: 1 }}>Issue #{issueNum} · {weekDate} · {articles.filter((a) => a.title.trim()).length} articles</div>
                            </div>
                            <div style={{ display: "flex", gap: 8 }}>
                                <button onClick={() => setStep(1)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "#f4f4f4", border: "1px solid #ddd", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'Poppins', sans-serif" }}>
                                    <ArrowLeft size={13} /> Edit
                                </button>
                                <button onClick={download} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 20px", background: BRAND.green, color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Poppins', sans-serif" }}>
                                    <Download size={13} /> Download HTML
                                </button>
                            </div>
                        </div>

                        <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: "12px 16px", marginBottom: 12, fontSize: 12, color: "#92400e" }}>
                            Download karo → Gmail open karo → Compose → HTML content paste karo → Send!
                        </div>

                        <div style={{ borderRadius: 10, overflow: "hidden", border: "1px solid #ddd", boxShadow: "0 4px 24px rgba(0,0,0,.07)" }}>
                            <div style={{ background: "#e8e8e8", padding: "10px 16px", display: "flex", alignItems: "center", gap: 6 }}>
                                {["#FA2E1A", "#FEAD17", "#0FBC87"].map((c, i) => <div key={i} style={{ width: 10, height: 10, borderRadius: "50%", background: c }} />)}
                                <div style={{ flex: 1, background: "#fff", borderRadius: 4, padding: "3px 10px", fontSize: 10, color: "#888", marginLeft: 8 }}>newsletter preview — issue #{issueNum}</div>
                            </div>
                            <iframe srcDoc={htmlOut} style={{ width: "100%", height: 750, border: "none", display: "block" }} title="Newsletter Preview" />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
