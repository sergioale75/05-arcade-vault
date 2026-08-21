"use client";

import { useEffect, useRef } from "react";

/**
 * Scroll-in animation ported from the prototype. The section starts at
 * `opacity: 0` (see `.reveal` in globals.css) and gains `.in` the first time it
 * crosses the viewport. It only observes itself, so the rest of the home stays
 * on the server.
 */
export function Reveal({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section ref={ref} className={className ? `${className} reveal` : "reveal"}>
      {children}
    </section>
  );
}
