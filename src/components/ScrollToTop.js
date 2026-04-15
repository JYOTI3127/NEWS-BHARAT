import { useEffect } from "react";
import { useLocation } from "react-router-dom";

function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
  }, []);

  useEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0);
      return undefined;
    }

    const targetId = decodeURIComponent(hash.replace("#", ""));
    let attempts = 0;
    let timeoutId = 0;

    const getHeaderOffset = () => {
      const headerHeight =
        document.querySelector(".header-wrapper")?.getBoundingClientRect().height || 0;
      return headerHeight + 24;
    };

    const scrollToHashTarget = () => {
      const element = document.getElementById(targetId);
      if (!element) {
        attempts += 1;
        if (attempts < 30) {
          timeoutId = window.setTimeout(scrollToHashTarget, 100);
        }
        return;
      }

      const top =
        element.getBoundingClientRect().top +
        window.scrollY -
        getHeaderOffset();

      window.scrollTo({
        top: Math.max(0, top),
        behavior: attempts < 2 ? "auto" : "smooth",
      });

      attempts += 1;
      if (attempts < 12) {
        timeoutId = window.setTimeout(scrollToHashTarget, 250);
      }
    };

    timeoutId = window.setTimeout(scrollToHashTarget, 50);
    return () => window.clearTimeout(timeoutId);
  }, [pathname, hash]);

  return null;
}

export default ScrollToTop;
