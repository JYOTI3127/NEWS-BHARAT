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

    const scrollToHashTarget = () => {
      const element = document.getElementById(targetId);
      if (!element) {
        attempts += 1;
        if (attempts < 30) {
          window.setTimeout(scrollToHashTarget, 100);
        }
        return;
      }

      element.scrollIntoView({ block: "start" });
    };

    scrollToHashTarget();
    return undefined;
  }, [pathname, hash]);

  return null;
}

export default ScrollToTop;
