import { useState, useEffect } from "react";

// ── DATA ──────────────────────────────────────────────────────
const healthFeatured = {
  img: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=700&q=80",
  category: "HEALTH",
  date: "Mar 6, 2026",
  title: "New health policy set to transform the country's healthcare system — key changes explained",
};

const healthSmallCard = {
  img: "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&q=80",
  category: "WELLNESS",
  date: "Mar 5, 2026",
  title: "A 30-minute daily walk can reduce the risk of heart disease by up to 40%",
};

const healthMidCards = [
  {
    id: 1,
    img: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&q=80",
    category: "FITNESS",
    date: "Mar 4, 2026",
    title: "Rising mental health crisis in India — cases of depression increasing rapidly among youth",
  },
  {
    id: 2,
    img: "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=400&q=80",
    category: "MEDICINE",
    date: "Mar 3, 2026",
    title: "Successful trial of a new medicine for diabetes patients, expected to launch soon",
  },
  {
    id: 3,
    img: "https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=400&q=80",
    category: "NUTRITION",
    date: "Mar 2, 2026",
    title: "Blend of Ayurveda and modern science — 5 effective ways to boost immunity",
  },
];

const sidebarNews = [
  { 
    id: 1, 
    img: "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=200&q=80", 
    category: "BOLLYWOOD", 
    date: "Mar 6", 
    title: "A new revolution in the film industry as OTT platforms change the direction of cinema" 
  },
  { 
    id: 2, 
    img: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=200&q=80", 
    category: "OTT", 
    date: "Mar 5", 
    title: "Indian content dominates the list of most watched web series worldwide" 
  },
  { 
    id: 3, 
    img: "https://images.unsplash.com/photo-1608889825103-eb5ed706fc64?w=200&q=80", 
    category: "MUSIC", 
    date: "Mar 4", 
    title: "Announcement made for the release of the biggest music album of the year" 
  },
  { 
    id: 4, 
    img: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=200&q=80", 
    category: "AWARDS", 
    date: "Mar 3", 
    title: "Filmfare Awards 2026 announced — find out who won the Best Actor title" 
  },
  { 
    id: 5, 
    img: "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=200&q=80", 
    category: "CELEBRITY", 
    date: "Mar 2", 
    title: "Rare and unseen photos of Bollywood celebrities go viral among fans" 
  },
];

// ── Section Header ─────────────────────────────────────────────
function SectionHeader({ title }) {
  return (
    <div className="nps-section-header">
      <div className="nps-section-header-left">
        <div className="nps-section-bar" />
        <span className="nps-section-title">{title}</span>
      </div>
      <a href="#" className="nps-read-more-link">Read More›</a>
    </div>
  );
}

// ── Category Tag ───────────────────────────────────────────────
function CategoryTag({ label }) {
  return <span className="hs-cat-tag">{label}</span>;
}

// ── Date Label ─────────────────────────────────────────────────
function DateLabel({ date }) {
  return <span className="hs-date">{date}</span>;
}

// ── HEALTH SECTION ────────────────────────────────────────────
export function EntertainmentSection() {
  return (
    <div className="nps-entertainment">
      <SectionHeader title="HEALTH" />

      <div className="nps-ent-layout">

        {/* ── LEFT + MIDDLE ── */}
        <div className="nps-ent-left-mid">

          {/* Featured big card */}
          <div className="hs-featured-card">
            <div className="hs-featured-img-wrap">
              <img src={healthFeatured.img} alt="featured" />
              <div className="hs-featured-overlay">
                <CategoryTag label={healthFeatured.category} />
                <p className="hs-featured-title">{healthFeatured.title}</p>
                <DateLabel date={healthFeatured.date} />
              </div>
            </div>
          </div>

          {/* Small card below featured */}
          <div className="hs-small-card">
            <div className="hs-small-img">
              <img src={healthSmallCard.img} alt="small" />
            </div>
            <div className="hs-small-text">
              <CategoryTag label={healthSmallCard.category} />
              <p className="hs-small-title">{healthSmallCard.title}</p>
              <DateLabel date={healthSmallCard.date} />
            </div>
          </div>

          {/* Middle: 3 horizontal cards */}
          <div className="hs-mid-col">
            {healthMidCards.map(card => (
              <div key={card.id} className="hs-mid-card">
                <div className="hs-mid-img">
                  <img src={card.img} alt={card.title} />
                </div>
                <div className="hs-mid-text">
                  <CategoryTag label={card.category} />
                  <p className="hs-mid-title">{card.title}</p>
                  <DateLabel date={card.date} />
                </div>
              </div>
            ))}
          </div>

        </div>

        {/* ── SIDEBAR ── */}
        <div className="nps-health-sidebar">
          <div className="nps-health-header">
            <span className="nps-health-header-text">ENTERTAINMENT</span>
          </div>
          <div className="nps-health-scroll">
            {sidebarNews.map(item => (
              <div key={item.id} className="nps-health-item">
                <div className="nps-health-img">
                  <img src={item.img} alt="news" />
                </div>
                <div className="nps-health-text-wrap">
                  <span className="hs-sidebar-cat">{item.category}</span>
                  <p className="nps-health-text">{item.title}</p>
                  <span className="hs-sidebar-date">{item.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

export default EntertainmentSection;