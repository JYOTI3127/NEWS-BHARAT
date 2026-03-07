import { useEffect, useState } from "react";
import { FaFacebookF, FaInstagram, FaYoutube, FaLinkedin } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";

export default function ComingSoon() {

  const [time, setTime] = useState({
    days: 10,
    hours: 5,
    mins: 30,
    secs: 40
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setTime((prev) => ({
        ...prev,
        secs: prev.secs > 0 ? prev.secs - 1 : 59
      }));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div style={styles.container}>

      <div style={styles.overlay}>

        <h1 style={styles.logo}>News4Bharat</h1>

        <h2 style={styles.heading}>We're Coming Soon</h2>

        <p style={styles.text}>
          India ki trusted aur fast news website jaldi launch hone wali hai.
        </p>

        <div style={styles.timer}>
          <div style={styles.circle}>{time.days}<span style={styles.label}>Days</span></div>
          <div style={styles.circle}>{time.hours}<span style={styles.label}>Hours</span></div>
          <div style={styles.circle}>{time.mins}<span style={styles.label}>Mins</span></div>
          <div style={styles.circle}>{time.secs}<span style={styles.label}>Secs</span></div>
        </div>

        <div style={styles.emailBox}>
          <input placeholder="Enter your email" style={styles.input}/>
          <button style={styles.button}>Notify Me</button>
        </div>

        <div style={styles.socialIcons}>

          <a href="https://facebook.com/news4bharat" target="_blank" rel="noreferrer" style={styles.icon}>
            <FaFacebookF />
          </a>

          <a href="https://instagram.com/news4bharat" target="_blank" rel="noreferrer" style={styles.icon}>
            <FaInstagram />
          </a>

          <a href="https://x.com/news4bharat" target="_blank" rel="noreferrer" style={styles.icon}>
            <FaXTwitter />
          </a>

          <a href="https://youtube.com/@news4bharat" target="_blank" rel="noreferrer" style={styles.icon}>
            <FaYoutube />
          </a>

          <a href="https://linkedin.com/company/news4bharat" target="_blank" rel="noreferrer" style={styles.icon}>
            <FaLinkedin />
          </a>

        </div>

      </div>

    </div>
  );
}

const styles = {

  container:{
    height:"100vh",
    backgroundImage:"url('https://images.unsplash.com/photo-1501785888041-af3ef285b470')",
    backgroundSize:"cover",
    backgroundPosition:"center",
    display:"flex",
    justifyContent:"center",
    alignItems:"center"
  },

  overlay:{
    textAlign:"center",
    color:"white",
    background:"rgba(0,0,0,0.55)",
    padding:"60px",
    borderRadius:"12px",
    maxWidth:"600px"
  },

  logo:{
    fontSize:"28px",
    marginBottom:"10px"
  },

  heading:{
    fontSize:"48px",
    marginBottom:"10px"
  },

  text:{
    marginBottom:"30px",
    lineHeight:"1.6"
  },

  timer:{
    display:"flex",
    justifyContent:"center",
    gap:"20px",
    marginBottom:"30px"
  },

  circle:{
    width:"80px",
    height:"80px",
    borderRadius:"50%",
    background:"white",
    color:"black",
    display:"flex",
    flexDirection:"column",
    justifyContent:"center",
    alignItems:"center",
    fontWeight:"bold"
  },

  label:{
    fontSize:"12px"
  },

  emailBox:{
    display:"flex",
    justifyContent:"center",
    marginBottom:"25px"
  },

  input:{
    padding:"12px",
    borderRadius:"25px 0 0 25px",
    border:"none",
    width:"220px",
    outline:"none"
  },

  button:{
    padding:"12px 20px",
    border:"none",
    borderRadius:"0 25px 25px 0",
    background:"#e11d48",
    color:"white",
    cursor:"pointer",
    fontWeight:"bold"
  },

  socialIcons:{
    marginTop:"10px",
    display:"flex",
    justifyContent:"center",
    gap:"15px"
  },

  icon:{
    fontSize:"20px",
    color:"white",
    background:"rgba(255,255,255,0.2)",
    padding:"10px",
    borderRadius:"50%",
    display:"flex",
    alignItems:"center",
    justifyContent:"center",
    textDecoration:"none"
  }

};