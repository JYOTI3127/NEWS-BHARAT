import { useState } from "react";
import { Mail } from "lucide-react";

export default function Newsletter() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (!email.trim()) return;
    setSubmitted(true);
    setEmail("");
  };

  return (
    <section className="w-full bg-white flex items-center justify-center px-4 py-6 sm:px-6 lg:px-8 font-[Poppins,sans-serif]">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');`}</style>

      <div className="w-full max-w-[1400px] bg-[#002765] rounded-2xl px-6 py-8 sm:px-10 sm:py-10 lg:px-16 lg:py-12 shadow-[0_24px_60px_rgba(0,0,0,0.35)]">

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8 lg:gap-12">

          {/* LEFT — Icon + Text */}
          <div className="flex flex-col items-start text-left gap-3 lg:max-w-[55%]">

            {/* Icon */}
            <div className="w-12 h-12 bg-white/10 border border-white/20 rounded-xl flex items-center justify-center text-white self-start">
              <Mail size={22} />
            </div>

            {/* Label */}
            <p className="text-white text-xs sm:text-sm font-medium tracking-widest uppercase self-start m-0">
              Our Newsletter
            </p>

            {/* Title */}
            <h2 className="text-white font-bold text-xl xs:text-2xl sm:text-3xl lg:text-4xl leading-tight m-0 self-start">
              Subscribe To Our Newsletter!
            </h2>

            {/* Subtitle */}
            <p className="text-white/55 text-xs xs:text-sm sm:text-base leading-relaxed m-0 self-start">
              Sign up for our weekly newsletter to stay informed about exciting offers, our latest products, and industry updates.
            </p>
          </div>

          {/* RIGHT — Input + Button */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 lg:min-w-[380px] xl:min-w-[440px]">
            {submitted ? (
              <p className="text-[#7dd3a8] text-sm sm:text-base font-medium m-0">
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
                    rounded-full px-5 py-3 sm:py-3.5
                    text-white text-sm placeholder:text-white/40
                    outline-none font-[Poppins,sans-serif]
                    focus:border-blue-400 transition-colors duration-200
                  "
                />
                <button
                  onClick={handleSubmit}
                  className="
                    bg-blue-500 hover:bg-blue-600 active:scale-95
                    text-white font-semibold text-sm
                    rounded-full px-7 py-3 sm:py-3.5
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