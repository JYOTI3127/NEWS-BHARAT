import { useState, useEffect } from "react";

// ── DATA ──────────────────────────────────────────────────────
const trendingTopics = [
  "Breaking News",
  "Politics Today",
  "Latest India News",
  "World Headlines",
  "Business Updates",
  "Stock Market",
  "Technology News",
  "Entertainment Buzz",
  "Bollywood News",
  "Sports Highlights",
  "Cricket Updates",
  "Weather Today",
  "Elections 2026"
];
const latestNews = [
  { id:1, title:"Lorem Ipsum Dolor Sit Amet Consetetur Sadipscing", desc:"Elitr Sed Diam Nonumy Eirmod Tempor Invidunt Ut Labore" },
  { id:2, title:"Lorem Ipsum Dolor Sit Amet Consetetur Sadipscing", desc:"Elitr Sed Diam Nonumy Eirmod Tempor Invidunt Ut Labore" },
  { id:3, title:"Lorem Ipsum Dolor Sit Amet Consetetur Sadipscing", desc:"Elitr Sed Diam Nonumy Eirmod Tempor Invidunt Ut Labore" },
  { id:4, title:"Lorem Ipsum Dolor Sit Amet Consetetur Sadipscing", desc:"Elitr Sed Diam Nonumy Eirmod Tempor Invidunt Ut Labore" },
];

const featureCards = [
  { 
    id: 1, 
    image: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&q=80", 
    title: "The story of Nikhil Gupta remains unclear, but when CIA agents were caught ..." 
  },
  { 
    id: 2, 
    image: "https://images.unsplash.com/photo-1482731215275-a1f151646268?w=600&q=80", 
    title: "The story of Nikhil Gupta remains unclear, but when CIA agents were caught ..." 
  },
  { 
    id: 3, 
    image: "https://images.unsplash.com/photo-1578496781379-7dcfb995293d?w=600&q=80", 
    title: "The story of Nikhil Gupta remains unclear, but when CIA agents were caught ..." 
  },
];

const liveUpdates = [
  { id: 1, time: "3:19 PM", text: "It was a small question, yet nearly 3,000 people showed up. They came. They came." },
  { id: 2, time: "3:19 PM", text: "It was a small question, yet nearly 3,000 people showed up. They came. They came." },
  { id: 3, time: "3:19 PM", text: "It was a small question, yet nearly 3,000 people showed up. They came. They came." },
  { id: 4, time: "3:19 PM", text: "It was a small question, yet nearly 3,000 people showed up. They came. They came." },
  { id: 5, time: "3:19 PM", text: "It was a small question, yet nearly 3,000 people showed up. They came. They came." },
  { id: 6, time: "3:19 PM", text: "It was a small question, yet nearly 3,000 people showed up. They came. They came." },
  { id: 7, time: "3:20 PM", text: "It was a small question, yet nearly 3,000 people showed up. They came. They came." },
  { id: 8, time: "3:21 PM", text: "It was a small question, yet nearly 3,000 people showed up. They came. They came." },
];

const bannerSlides = [
  {
    leftBg:"#1e5c42",
    brand1:"PRATIYOGITA", brand2:"DARPAN",
    price:"PRICE \u20B9125.00", date:"FEBRUARY 2024",
    tagline:"WHERE EXCELLENCE GUIDES THE SUCCESS",
    midBg:"#f5a000", midTag:"Semi Annual",
    midBoxBg:"#6a1fa2",
    midL1:"Current", midL2:"Affairs", midL3:"Special",
    rightBg:"#f5e000",
    rl:"MOST USEFUL FOR", rb:"UNION & STATE", rs:"CIVIL SERVICES EXAM",
  },
  {
    leftBg:"#0d3b6e",
    brand1:"COMPETITION", brand2:"TIMES",
    price:"PRICE \u20B9150.00", date:"MARCH 2024",
    tagline:"YOUR GATEWAY TO SUCCESS",
    midBg:"#e53935", midTag:"Annual",
    midBoxBg:"#b71c1c",
    midL1:"General", midL2:"Knowledge", midL3:"Special",
    rightBg:"#b2fab4",
    rl:"BEST RESOURCE FOR", rb:"SSC & BANKING", rs:"EXAMINATION PREP",
  },
  {
    leftBg:"#1a1a2e",
    brand1:"CAREER", brand2:"LAUNCHER",
    price:"PRICE \u20B999.00", date:"APRIL 2024",
    tagline:"LAUNCHING CAREERS SINCE 1995",
    midBg:"#7b1fa2", midTag:"Monthly",
    midBoxBg:"#4a148c",
    midL1:"Reasoning", midL2:"& Aptitude", midL3:"Special",
    rightBg:"#ffe082",
    rl:"TOP CHOICE FOR", rb:"UPSC & STATE PSC", rs:"ASPIRANTS NATIONWIDE",
  },
];

// ── ICONS ─────────────────────────────────────────────────────
const ChevL = ({c="#555", s=22}) => (
  <span style={{color:c, fontSize:s+"px", lineHeight:"1", userSelect:"none", display:"block", fontWeight:"bold"}}>‹</span>
);

const ChevR = ({c="#555", s=22}) => (
  <span style={{color:c, fontSize:s+"px", lineHeight:"1", userSelect:"none", display:"block", fontWeight:"bold"}}>›</span>
);

const ClockSvg = () => (
  <svg width={9} height={9} viewBox="0 0 24 24" fill="none" stroke="#D80100" strokeWidth="2.5" strokeLinecap="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);

const FlameSvg = () => (
  <svg width={22} height={30} viewBox="0 0 22 30">
    <path d="M11 2C11 2 5 9 5 16a6 6 0 0 0 12 0C17 9 11 2 11 2z" fill="#f9a825"/>
    <path d="M11 20a2.5 2.5 0 0 1-2.5-2.5C8.5 15.5 11 12 11 12s2.5 3.5 2.5 5A2.5 2.5 0 0 1 11 20z" fill="#fff"/>
  </svg>
);

// ── TRENDING BAR ──────────────────────────────────────────────
function TrendingBar() {
  const [off, setOff] = useState(0);
  const vis = 8;
  const max = trendingTopics.length - vis;

  return (
    <div style={{
      display:"flex", alignItems:"center",
      background:"#fff",
      padding:"30px 12px", height:"52px", gap:"12px"
    }}>
      {/* Label */}
      <div style={{flexShrink:0}}>
        <div style={{fontSize:"13px",fontWeight:"600",color:"#333",fontFamily:"'Poppins', sans-serif",lineHeight:"1.15"}}>TRENDING</div>
        <div style={{fontSize:"13px",fontWeight:"600",color:"#333",fontFamily:"'Poppins', sans-serif",lineHeight:"1.15"}}>NEWS :</div>
      </div>

      {/* Prev */}
      <button
        onClick={()=>setOff(o=>Math.max(0,o-1))}
        disabled={off===0}
        style={{width:"0px",height:"29px",borderRadius:"50%",border:"1.5px solid #bbb",background:"#fff",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,cursor:off===0?"default":"pointer"}}
      >
        <ChevL c={off===0?"black":"black"} s={22}/>
      </button>

      {/* Topic buttons */}
      <div style={{display:"flex",gap:"8px",flex:1}}>
        {trendingTopics.slice(off, off+vis).map((t,i)=>(
          <button key={i+off}
            style={{padding:"5px 14px",border:"1.5px solid #ccc",borderRadius:"9px",background:"#fff",fontSize:"11.5px",fontWeight:"600",color:"grey",fontFamily:"'Poppins', sans-serif",letterSpacing:"0.02em",whiteSpace:"nowrap",cursor:"pointer",transition:"all 0.15s",flexShrink:0}}
            onMouseEnter={e=>{e.currentTarget.style.background="#D80100";e.currentTarget.style.color="#fff";e.currentTarget.style.borderColor="#D80100";}}
            onMouseLeave={e=>{e.currentTarget.style.background="#fff";e.currentTarget.style.color="#222";e.currentTarget.style.borderColor="#ccc";}}
          >{t}</button>
        ))}
      </div>

      {/* Next — ✅ FIX: c aur s pass karo, color/size nahi */}
      <button
        onClick={()=>setOff(o=>Math.min(max,o+1))}
        disabled={off>=max}
        style={{width:"28px",height:"28px",borderRadius:"50%",border:"1.5px solid #bbb",background:"#fff",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,cursor:off>=max?"default":"pointer"}}
      >
        <ChevR c={off>=max?"#ccc":"#444"} s={22}/>
      </button>
    </div>
  );
}

// ── SECTION HEADER ────────────────────────────────────────────
function SecHeader({title}) {
  return (
    <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"10px"}}>
      <div style={{width:"4px",height:"20px",background:"#D80100",borderRadius:"1px"}}/>
      <span style={{fontSize:"20px",fontWeight:"bold",color:"#111",fontFamily:"'Poppins'",letterSpacing:"0.02em"}}>{title}</span>
    </div>
  );
}

// ── LATEST NEWS ───────────────────────────────────────────────
function LatestNews() {
  return (
    <div style={{padding:"14px 14px"}}>
      <SecHeader title="LATEST NEWS"/>
      {latestNews.map((n,i)=>(
        <div key={n.id} style={{padding:"13px 0",borderBottom:"1.5px solid #999999",cursor:"pointer"}}
          onMouseEnter={e=>e.currentTarget.style.opacity="0.8"}
          onMouseLeave={e=>e.currentTarget.style.opacity="1"}
        >
          <div style={{fontSize:"13px",fontWeight:"500",color:"#111",fontFamily:"'Poppins', sans-serif",lineHeight:"1.4",marginBottom:"3px"}}>{n.title}</div>
          <div style={{fontSize:"11.5px",color:"#666",fontFamily:"'Poppins', sans-serif",fontWeight:"400",lineHeight:"1.35"}}>{n.desc}</div>
        </div>
      ))}
    </div>
  );
}

// ── FEATURE CARDS ─────────────────────────────────────────────
function FeatureCards() {
  const [hov, setHov] = useState(null);
  return (
    <div style={{padding:"10px",display:"flex",gap:"8px",height:"317px"}}>
      {featureCards.map((c,i)=>(
        <div key={c.id}
          onMouseEnter={()=>setHov(c.id)}
          onMouseLeave={()=>setHov(null)}
          style={{flex:"1 1 0",minWidth:0,cursor:"pointer",borderRadius:"8px",overflow:"hidden",borderBottom:"1.5px solid #999999",borderLeft:"1.5px solid #999999",borderRight:"1.5px solid #999999",boxShadow:hov===c.id?"0 4px 12px rgba(0,0,0,0.15)":"none",transition:"box-shadow 0.2s"}}
        >
          <div style={{height:"160px",overflow:"hidden"}}>
            <img src={c.image} alt="" style={{width:"100%",height:"100%",objectFit:"cover",display:"block",transform:hov===c.id?"scale(1.05)":"scale(1)",transition:"transform 0.35s ease"}}/>
          </div>
          <div style={{padding:"20px 10px 12px",background:"#fff"}}>
            <div style={{fontSize:"12px",fontWeight:"600",color:"grey",fontFamily:"Georgia,serif",lineHeight:"1.55"}}>{c.title}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── LIVE UPDATES ──────────────────────────────────────────────
function LiveUpdates() {
  return (
    <div style={{padding:"14px 10px 14px 12px",display:"flex",flexDirection:"column",height:"84%"}}>
      <SecHeader title="LIVE UPDATES"/>
      <div className="live-scroll" style={{flex:1,overflowY:"auto",maxHeight:"310px"}}>
        {liveUpdates.map((item,i)=>(
          <div key={item.id} style={{display:"flex",gap:"6px",alignItems:"flex-start",padding:"7px 0",cursor:"pointer"}}>
            <div style={{width:"7px",height:"7px",borderRadius:"50%",background:"#D80100",flexShrink:0,marginTop:"3px"}}/>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:"11px",fontWeight:"700",color:"#D80100",fontFamily:"'Poppins', sans-serif",marginBottom:"2px"}}>{item.time}</div>
              <div style={{fontSize:"11px",color:"#333",fontFamily:"'Poppins', sans-serif",lineHeight:"1.4",wordBreak:"break-word",overflowWrap:"break-word"}}>{item.text}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── BANNER ────────────────────────────────────────────────────
function Banner() {
  const [cur, setCur] = useState(0);
  const [fading, setFading] = useState(false);
  const total = bannerSlides.length;

  useEffect(()=>{
    const t = setInterval(()=>{
      setFading(true);
      setTimeout(()=>{ setCur(c=>(c+1)%total); setFading(false); },350);
    },4000);
    return ()=>clearInterval(t);
  },[]);

  const goTo = idx => { setFading(true); setTimeout(()=>{ setCur(idx); setFading(false); },350); };
  const s = bannerSlides[cur];

  return (
    <div style={{marginTop:"14px",border:"1.5px solid #ccc",borderRadius:"2px",overflow:"hidden",position:"relative",padding:"10px"}}>
      {/* Slide */}
      <div style={{display:"flex",height:"115px",opacity:fading?0:1,transform:fading?"translateY(6px)":"translateY(0)",transition:"opacity 0.35s ease,transform 0.35s ease"}}>

        {/* LEFT */}
        <div style={{flex:"0 0 38%",background:s.leftBg,position:"relative",display:"flex",alignItems:"center",padding:"12px 14px 12px 18px",overflow:"hidden"}}>
          <div style={{position:"absolute",left:0,top:0,bottom:0,width:"8px",background:"#D80100"}}/>
          <div style={{position:"absolute",bottom:0,left:"8px",right:0,height:"9px",background:"#2e7d32"}}/>
          <div style={{marginLeft:"4px",flex:1}}>
            <div style={{fontSize:"9px",color:"#aaa",fontFamily:"'Poppins', sans-serif",lineHeight:"1.4"}}>{s.price}</div>
            <div style={{fontSize:"9px",color:"#aaa",fontFamily:"'Poppins', sans-serif",lineHeight:"1.4",marginBottom:"4px"}}>{s.date}</div>
            <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
              <div>
                <div style={{fontSize:"26px",fontWeight:"900",color:"#fff",fontFamily:"Georgia,serif",lineHeight:"1.0",letterSpacing:"0.01em"}}>{s.brand1}</div>
                <div style={{fontSize:"26px",fontWeight:"900",color:"#fff",fontFamily:"Georgia,serif",lineHeight:"1.0",letterSpacing:"0.01em"}}>{s.brand2}</div>
              </div>
              <FlameSvg/>
            </div>
            <div style={{fontSize:"7px",color:"#90a4ae",fontFamily:"'Poppins', sans-serif",letterSpacing:"0.07em",marginTop:"4px",paddingBottom:"10px"}}>{s.tagline}</div>
          </div>
        </div>

        {/* MIDDLE */}
        <div style={{flex:"0 0 14%",background:s.midBg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"8px 6px",gap:"6px"}}>
          <div style={{fontSize:"11px",color:"#fff",fontFamily:"Georgia,serif",fontStyle:"italic",fontWeight:"700",textAlign:"center"}}>{s.midTag}</div>
          <div style={{background:s.midBoxBg,borderRadius:"3px",padding:"5px 6px",width:"100%",textAlign:"center"}}>
            <div style={{fontSize:"11px",color:"#fff",fontFamily:"Georgia,serif",fontWeight:"700",lineHeight:"1.3"}}>{s.midL1}</div>
            <div style={{fontSize:"11px",color:"#fff",fontFamily:"Georgia,serif",fontWeight:"700",lineHeight:"1.3"}}>{s.midL2}</div>
            <div style={{fontSize:"11px",color:"#fff",fontFamily:"Georgia,serif",fontWeight:"700",lineHeight:"1.3"}}>{s.midL3}</div>
          </div>
        </div>

        {/* RIGHT */}
        <div style={{flex:1,background:s.rightBg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"12px 24px",textAlign:"center"}}>
          <div style={{fontSize:"14px",fontWeight:"700",color:"#111",fontFamily:"'Poppins', sans-serif",marginBottom:"2px"}}>{s.rl}</div>
          <div style={{fontSize:"32px",fontWeight:"900",color:"#D80100",fontFamily:"Georgia,serif",lineHeight:"1.05"}}>{s.rb}</div>
          <div style={{fontSize:"17px",fontWeight:"900",color:"#111",fontFamily:"'Poppins', sans-serif",letterSpacing:"0.05em"}}>{s.rs}</div>
        </div>
      </div>



    </div>
  );
}

// ── Poppins font inject ───────────────────────────────────────
if (!document.getElementById("poppins-font")) {
  const link = document.createElement("link");
  link.id = "poppins-font";
  link.rel = "stylesheet";
  link.href = "https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;900&display=swap";
  document.head.appendChild(link);
}

// ── MAIN ─────────────────────────────────────────────────────
export default function TrendingNews() {
  return (
    <>
      <style>{`

        *,*::before,*::after { box-sizing:border-box; margin:0; padding:0; }
        body { background:#e2e2e2; }
        button { outline:none; border:none; font-family:inherit; }

        .page {padding-bottom:28px; background:white; }
        .inner { max-width:1300px; margin:0 auto; padding:30px 32px; background:#ffffff; }

        .grid {
          display:grid;
          grid-template-columns:450px 1fr 220px;
          margin-top:12px;
          background:#ffffff;
          height:318px;
        }

        .col-cards { padding:0; }
        .col-live { height:100%; }

        .live-scroll::-webkit-scrollbar { width:4px; }
        .live-scroll::-webkit-scrollbar-track { background:#f5f5f5; border-radius:2px; }
        .live-scroll::-webkit-scrollbar-thumb { background:#d80100; border-radius:2px; }

        @media (max-width:900px) {
          .grid { grid-template-columns:1fr 1fr; }
          .col-live { grid-column:1/-1; border-top:1px solid #e0e0e0; }
          .col-news { border-right:1px solid #e0e0e0; }
        }
        @media (max-width:560px) {
          .grid { grid-template-columns:1fr; }
          .col-news,.col-cards { border-right:none; border-bottom:1px solid #e0e0e0; }
        }
      `}</style>

      <div className="page">
        <TrendingBar/>
        <div className="inner">
          <div className="grid">
            <div className="col-news"><LatestNews/></div>
            <div className="col-cards"><FeatureCards/></div>
            <div className="col-live"><LiveUpdates/></div>
          </div>
          <Banner/>
        </div>
      </div>
    </>
  );
}