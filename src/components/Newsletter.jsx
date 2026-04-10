import { useState, useEffect } from "react";
import { Mail, Share2 } from "lucide-react";

const SHARE_URL = "https://news4bharat.com/#newsletter";
const SHARE_TITLE = "News4Bharat Newsletter";
const SHARE_TEXT = "News4Bharat newsletter section dekhne ke liye yeh link open karein.";

export default function Newsletter() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [shareFeedback, setShareFeedback] = useState("");

  useEffect(() => {
    if (window.location.hash !== "#newsletter") return;

    const tryScroll = (delay = 0) => {
      setTimeout(() => {
        const section = document.getElementById("newsletter");
        if (!section) return;

        const headerHeight = document.querySelector(".header-wrapper")?.getBoundingClientRect().height || 90;

        section.scrollIntoView({
          behavior: "smooth",
          block: "start"        // top pe aaye
        });

        // Extra adjustment after scrollIntoView
        setTimeout(() => {
          const currentScroll = window.scrollY;
          window.scrollTo({
            top: currentScroll - (headerHeight + 25),
            behavior: "instant"
          });
        }, 450);
      }, delay);
    };

    tryScroll(100);
    tryScroll(600);
    tryScroll(1200);  

  }, []);

  const handleSubmit = () => {
    if (!email.trim()) return;
    setSubmitted(true);
    setEmail("");
  };

  const handleShare = async () => {
    if (typeof window === "undefined") return;

    const shareData = {
      title: SHARE_TITLE,
      text: SHARE_TEXT,
      url: SHARE_URL,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        setShareFeedback("Newsletter link shared successfully.");
        return;
      }

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(SHARE_URL);
        setShareFeedback("Newsletter link copied.");
        return;
      }

      setShareFeedback("Sharing is not supported on this device.");
    } catch (error) {
      if (error?.name === "AbortError") return;
      setShareFeedback("Share failed. Please try again.");
    }
  };

  return (
    <section id="newsletter" className="w-full bg-white flex items-center justify-center px-4 py-6 min-[1441px]:px-8 min-[1800px]:px-10 min-[2561px]:px-12 max-[425px]:px-3 max-[375px]:px-2.5 max-[320px]:px-2 font-[Poppins,sans-serif]">
      <div className="w-full max-w-[1480px] min-[1441px]:max-w-[1680px] min-[1800px]:max-w-[1800px] min-[2561px]:max-w-[1900px] bg-[#002765] rounded-2xl min-[1441px]:rounded-[28px] px-6 py-8 min-[1441px]:px-10 min-[1441px]:py-10 min-[1800px]:px-12 min-[1800px]:py-12 max-[768px]:px-5 max-[768px]:py-7 max-[425px]:px-4 max-[425px]:py-6 max-[375px]:px-3.5 max-[320px]:px-3 shadow-[0_24px_60px_rgba(0,0,0,0.35)]">

        <div className="flex flex-col min-[1025px]:flex-row min-[1025px]:items-center min-[1025px]:justify-between gap-8 min-[1025px]:gap-12 min-[1441px]:gap-16 min-[1800px]:gap-20">

          {/* LEFT — Icon + Text */}
          <div className="flex flex-col items-start text-left gap-3 min-[1441px]:gap-4 min-[1025px]:max-w-[55%] min-[1800px]:max-w-[58%]">

            {/* Icon */}
            <div className="w-12 h-12 min-[1441px]:w-14 min-[1441px]:h-14 min-[1800px]:w-16 min-[1800px]:h-16 bg-white/10 border border-white/20 rounded-xl min-[1441px]:rounded-2xl flex items-center justify-center text-white self-start">
              <Mail size={26} className="min-[1800px]:w-8 min-[1800px]:h-8" />
            </div>

            {/* Label */}
            <p className="text-white text-xs min-[426px]:text-sm min-[1441px]:text-[0.95rem] min-[1800px]:text-base font-medium tracking-widest uppercase self-start m-0">
              Our Newsletter
            </p>

            {/* Title */}
            <h2 className="text-white font-bold text-xl min-[376px]:text-2xl min-[769px]:text-3xl min-[1025px]:text-[2.4rem] min-[1441px]:text-[2.45rem] min-[1800px]:text-[2rem] leading-tight m-0 self-start">
              Subscribe To Our Newsletter!
            </h2>

            {/* Subtitle */}
            <p className="text-white/55 text-xs min-[376px]:text-sm min-[769px]:text-base min-[1441px]:text-[1rem] min-[1800px]:text-[1.06rem] leading-relaxed min-[1441px]:leading-7 m-0 self-start max-w-[62ch]">
              Sign up for our weekly newsletter to stay informed about exciting offers, our latest products, and industry updates.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleShare}
                className="
                  inline-flex items-center gap-2
                  rounded-full border border-white/25 bg-white/10 hover:bg-white/16
                  px-4 py-2.5 min-[1441px]:px-5
                  text-white text-xs min-[426px]:text-sm min-[1441px]:text-[0.95rem]
                  font-medium cursor-pointer transition-colors duration-200
                  font-[Poppins,sans-serif]
                "
              >
                <Share2 size={16} />
                Share
              </button>

              {shareFeedback ? (
                <p className="m-0 text-white/75 text-xs min-[426px]:text-sm">
                  {shareFeedback}
                </p>
              ) : null}
            </div>
          </div>

          {/* RIGHT — Input + Button */}
          <div className="flex flex-col min-[426px]:flex-row items-stretch min-[426px]:items-center gap-3 min-[1441px]:gap-4 min-[1025px]:min-w-[380px] min-[1441px]:min-w-[520px] min-[1800px]:min-w-[620px]">
            {submitted ? (
              <p className="text-[#7dd3a8] text-sm min-[769px]:text-base min-[1441px]:text-[1rem] font-medium m-0">
                Thank you for subscribing!
              </p>
            ) : (
              <>
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="
                    flex-1 bg-white/10 border border-white
                    rounded-full px-5 py-3 min-[769px]:py-3.5 min-[1441px]:px-6 min-[1441px]:py-3.5 min-[1800px]:px-7 min-[1800px]:py-4 max-[425px]:px-4
                    text-white text-sm min-[1441px]:text-[0.95rem] min-[1800px]:text-base placeholder:text-white/40
                    outline-none font-[Poppins,sans-serif]
                    focus:border-blue-400 transition-colors duration-200
                  "
                />
                <button
                  onClick={handleSubmit}
                  className="
                    bg-blue-500 hover:bg-blue-600 active:scale-95
                    text-white font-semibold text-sm min-[1441px]:text-[0.95rem] min-[1800px]:text-base
                    rounded-full px-7 py-3 min-[769px]:py-3.5 min-[1441px]:px-8 min-[1441px]:py-3.5 min-[1800px]:px-9 min-[1800px]:py-4 max-[425px]:px-5
                    whitespace-nowrap cursor-pointer border-none
                    transition-all duration-200
                    font-[Poppins,sans-serif]
                  "
                >
                  Subscribe
                </button>
              </>
            )}
          </div>

        </div>
      </div>
    </section>
  );
}