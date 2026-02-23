import logo from "../assets/NEWS4BHARAT LOGO 5 (1).png";

const PlayStoreIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M3.18 23.76c.3.17.64.24.99.2l13.2-12-3.15-3.15L3.18 23.76z" />
    <path d="M22.1 10.55L19.2 8.9l-3.5 3.1 3.5 3.1 2.94-1.67a1.67 1.67 0 0 0 0-2.88z" />
    <path d="M2.1.44a1.67 1.67 0 0 0-.1.58v22a1.67 1.67 0 0 0 .1.58l.1.1 12.3-12.3v-.3L2.2.34l-.1.1z" />
    <path d="M14.17 13.26l-3.15 3.15 3.15 3.15 5.03-2.87-5.03-3.43z" opacity=".8" />
  </svg>
);

const FacebookIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);

const TwitterIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const YoutubeIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.96C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.96A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z" />
    <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="#07070e" />
  </svg>
);

const InstagramIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

const WhatsappIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
    <path d="M12.05 2C6.495 2 2 6.493 2 12.05c0 1.923.507 3.726 1.392 5.282L2 22l4.783-1.37C8.27 21.508 10.122 22 12.05 22 17.606 22 22 17.507 22 11.95 22 6.493 17.606 2 12.05 2zm0 18.125c-1.737 0-3.363-.476-4.759-1.303l-.342-.202-3.547 1.016 1.016-3.459-.222-.356C3.176 14.608 2.75 13.37 2.75 12.05c0-5.138 4.162-9.3 9.3-9.3s9.3 4.162 9.3 9.3-4.162 9.075-9.3 9.075z" />
  </svg>
);

const footerLinks = {
  "News": ["India", "World", "Politics", "Crime", "Business", "Science"],
  "Entertainment": ["Bollywood", "Hollywood", "OTT", "Music", "Fashion", "Awards"],
  "Sports": ["Cricket", "Football", "Kabaddi", "Hockey", "Tennis", "IPL"],
  "More": ["Lifestyle", "Technology", "Auto", "Travel", "Religion", "Education"],
};

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Hind:wght@400;500;600;700&display=swap');

  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    background: #0a0a0f;
    font-family: 'Hind', sans-serif;
  }

  .ft-root {
    background: #07070e;
    border-top: 3px solid #D80100;
    font-family: 'Hind', sans-serif;
    color: #e8e8f0;
    width: 100%;
  }

  .ft-top {
    max-width: 1262px;
    margin: 0 auto;
    padding: 44px 20px 36px;
    display: grid;
    grid-template-columns: 300px 1fr;
    gap: 60px;
  }

  .ft-brand {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .ft-logo-img {
    width: 223px;
    object-fit: contain;
    object-position: left;
  }

  .ft-brand-desc {
    font-size: 13.5px;
    line-height: 1.8;
    color: rgba(255,255,255,0.38);
  }

  .ft-social-title {
    font-size: 11px;
    letter-spacing: 2.5px;
    color: rgba(255,255,255,0.25);
    text-transform: uppercase;
    font-weight: 600;
  }

  .ft-social-row {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .ft-social-icon {
    width: 36px;
    height: 36px;
    border-radius: 8px;
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.08);
    color: rgba(255,255,255,0.55);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    text-decoration: none;
    transition: all 0.22s ease;
  }

  .ft-social-icon:hover {
    transform: translateY(-3px);
  }

  .ft-social-icon.fb:hover { background: #1877f2; border-color: #1877f2; color: #fff; }
  .ft-social-icon.tw:hover { background: #111; border-color: #333; color: #fff; }
  .ft-social-icon.yt:hover { background: #ff0000; border-color: #ff0000; color: #fff; }
  .ft-social-icon.ig:hover { background: linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366); border-color: transparent; color: #fff; }
  .ft-social-icon.wa:hover { background: #25d366; border-color: #25d366; color: #fff; }

  .ft-playstore {
    display: flex;
    align-items: center;
    gap: 10px;
    background: #000;
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 10px;
    padding: 10px 16px;
    cursor: pointer;
    text-decoration: none;
    transition: all 0.22s ease;
    width: fit-content;
  }

  .ft-playstore:hover {
    border-color: rgba(216,1,0,0.5);
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(216,1,0,0.12);
  }

  .ft-playstore-icon {
    color: #fff;
    display: flex;
    align-items: center;
  }

  .ft-playstore-text {
    display: flex;
    flex-direction: column;
    line-height: 1.2;
  }

  .ft-playstore-small {
    font-size: 9px;
    color: rgba(255,255,255,0.45);
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }

  .ft-playstore-big {
    font-size: 14px;
    font-weight: 700;
    color: #fff;
  }

  .ft-links-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 32px;
  }

  .ft-col {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .ft-col-heading {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 19px;
    letter-spacing: 2px;
    color: #fff;
    padding-bottom: 12px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
    position: relative;
  }

  .ft-col-heading::after {
    content: '';
    position: absolute;
    bottom: -1px;
    left: 0;
    width: 30px;
    height: 2px;
    background: #D80100;
    border-radius: 2px;
  }

  .ft-col-list {
    display: flex;
    flex-direction: column;
    gap: 9px;
  }

  .ft-col-link {
    font-size: 13.5px;
    color: rgba(255,255,255,0.42);
    text-decoration: none;
    cursor: pointer;
    transition: all 0.18s;
    display: flex;
    align-items: center;
    gap: 0;
  }

  .ft-col-link:hover {
    color: #fff;
    padding-left: 6px;
    border-left: 2px solid #D80100;
  }

  .ft-mid-divider {
    max-width: 1262px;
    margin: 0 auto;
    padding: 0 20px;
  }

  .ft-mid-divider-line {
    height: 1px;
    background: rgba(255,255,255,0.06);
  }

  .ft-bottom {
    max-width: 1262px;
    margin: 0 auto;
    padding: 20px 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    flex-wrap: wrap;
  }

  .ft-copyright {
    font-size: 12.5px;
    color: rgba(255,255,255,0.28);
    line-height: 1.6;
  }

  .ft-copyright strong {
    color: #D80100;
    font-weight: 700;
  }

  .ft-policy-links {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }

  .ft-policy-link {
    font-size: 12px;
    color: rgba(255,255,255,0.28);
    text-decoration: none;
    cursor: pointer;
    transition: color 0.18s;
    padding: 0 4px;
  }

  .ft-policy-link:hover {
    color: #fff;
  }

  .ft-policy-dot {
    width: 3px;
    height: 3px;
    background: rgba(255,255,255,0.15);
    border-radius: 50%;
    flex-shrink: 0;
  }

  @media (max-width: 1024px) {
    .ft-top {
      grid-template-columns: 260px 1fr;
      gap: 40px;
    }
    .ft-links-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (max-width: 768px) {
    .ft-top {
      grid-template-columns: 1fr;
      gap: 32px;
      padding: 36px 16px 28px;
    }
    .ft-links-grid {
      grid-template-columns: repeat(2, 1fr);
      gap: 24px;
    }
    .ft-bottom {
      flex-direction: column;
      align-items: flex-start;
      padding: 18px 16px;
    }
  }

  @media (max-width: 480px) {
    .ft-links-grid {
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
    }
  }
`;

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <>
      <style>{styles}</style>
      <footer className="ft-root">

        {/* TOP SECTION */}
        <div className="ft-top">

          {/* LEFT BRAND */}
          <div className="ft-brand">

            <img
              className="ft-logo-img"
              src={logo}
              alt="News4Bharat"
            />

            <p className="ft-brand-desc">
              News4Bharat — Latest news from India and the world, breaking news and unbiased journalism. Every moment, every story.
            </p>

            <div>
              <div className="ft-social-title" style={{ marginBottom: '10px' }}>Follow Us</div>
              <div className="ft-social-row">
                <a className="ft-social-icon fb" href="#" title="Facebook"><FacebookIcon /></a>
                <a className="ft-social-icon tw" href="#" title="Twitter/X"><TwitterIcon /></a>
                <a className="ft-social-icon yt" href="#" title="YouTube"><YoutubeIcon /></a>
                <a className="ft-social-icon ig" href="#" title="Instagram"><InstagramIcon /></a>
                <a className="ft-social-icon wa" href="#" title="WhatsApp"><WhatsappIcon /></a>
              </div>
            </div>

            <a className="ft-playstore" href="#" target="_blank" rel="noreferrer">
              <span className="ft-playstore-icon"><PlayStoreIcon /></span>
              <div className="ft-playstore-text">
                <span className="ft-playstore-small">Get it on</span>
                <span className="ft-playstore-big">Google Play</span>
              </div>
            </a>

          </div>

          {/* RIGHT LINKS */}
          <div className="ft-links-grid">
            {Object.entries(footerLinks).map(([heading, links]) => (
              <div className="ft-col" key={heading}>
                <div className="ft-col-heading">{heading}</div>
                <div className="ft-col-list">
                  {links.map(link => (
                    <a className="ft-col-link" key={link} href="#">{link}</a>
                  ))}
                </div>
              </div>
            ))}
          </div>

        </div>

        {/* DIVIDER */}
        <div className="ft-mid-divider">
          <div className="ft-mid-divider-line" />
        </div>

        {/* BOTTOM BAR */}
        <div className="ft-bottom">
          <p className="ft-copyright">
            © {year} <strong>News4Bharat</strong>. All rights reserved. All news and content are protected under copyright.
          </p>
          <div className="ft-policy-links">
            <a className="ft-policy-link" href="#">Privacy Policy</a>
            <div className="ft-policy-dot" />
            <a className="ft-policy-link" href="#">Terms & Conditions</a>
            <div className="ft-policy-dot" />
            <a className="ft-policy-link" href="#">Advertise</a>
            <div className="ft-policy-dot" />
            <a className="ft-policy-link" href="#">Contact Us</a>
          </div>
        </div>

      </footer>
    </>
  );
}