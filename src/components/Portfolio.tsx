import { useEffect, useRef, useState } from "react";
import "./Portfolio.css";

const CAFE_LAYERS = [
  new URL("../assets/cafe/background.png", import.meta.url).href,
  new URL("../assets/cafe/objects.png", import.meta.url).href,
  new URL("../assets/cafe/counter.png", import.meta.url).href,
  new URL("../assets/cafe/foreground.png", import.meta.url).href,
];
const ART_MIN = 1200;
const DAYS = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];

const EXPERIENCE = [
  {
    when: "May 2026 — Aug 2026",
    role: "AI Project Lead",
    company: "Counting Opinions",
    body: "Led development of an AI data assistant over 20+ years of North American public library data, splitting the system into skills, formatters, and tools. I authored the skill library governing the assistant's behaviour — when to chart, which benchmarks to add, how to build queries — and defined the JSON it emits, then rendered that by hand in pure JavaScript into interactive charts, tables, and overlays. I also built a cached schema of fetchable fields to cut the token footprint, wrote SQL to ground the assistant in live data, and shipped a scheduled-email feature that varies its metrics so each send stays fresh.",
  },
  {
    when: "Apr 2025 — Present",
    role: "Front-End Developer",
    company: "FormulaTech Hacks",
    body: "Engineered responsive web interfaces using React, TailwindCSS, TypeScript, and Astro, creating seamless user experiences for over 200 hackathon attendees. Developed dynamic dashboard components, working closely with the design team to ensure the site was visually engaging and functioned smoothly across all screen sizes.",
  },
  {
    when: "Sep 2025 — Dec 2025",
    role: "Software Engineering Intern",
    company: "BitGo",
    body: "On the mobile development team, I built a comprehensive test suite from scratch for a React Native application, raising unit test coverage from 0% to 80%. I implemented a GitHub Action to enforce minimum coverage thresholds across 100+ pull requests, and designed a Bash-based integration testing framework that spun up test environments to enable automated testing on every pull request.",
  },
  {
    when: "Jan 2025 — Apr 2025",
    role: "Full-Stack Developer",
    company: "Counting Opinions",
    body: "Accelerated product release by leveraging Google Gemini to generate realistic test data and form responses, optimizing API calls with asynchronous programming to improve response times by eight seconds. Designed the site layout from Figma wireframes, authored a technical specification serving as the team's roadmap, and engineered a system to export HTML table data into Excel via the Sheets API.",
  },
  {
    when: "Jun 2023 — Aug 2024",
    role: "Junior Web Developer",
    company: "Counting Opinions",
    body: "Modernized the system's charting by migrating from AmCharts4 to Plotly.js and Google Charts, enabling SVG exports and faster rendering. Built URL-based overlays to compare data across 500+ library locations on a single chart, mapped all branches with the Google Maps API, and implemented a circular coordinate-offsetting algorithm to resolve overlapping map markers.",
  },
];

const PROJECTS = [
  {
    title: "Personal Website",
    date: "Ongoing",
    body: "A continuation of my old portfolio, built more than three years later as a fully custom design. I designed and developed it from the ground up in one week — handling UI/UX, implementation, and asset creation independently — in React, TypeScript, and TailwindCSS, hand-drawing every visual asset. It's an ongoing project I hope to finalize by graduation, and I plan to fold my old portfolio into it to give that project a proper retirement.",
  },
  {
    title: "Portfolio Game",
    date: "Ongoing",
    body: "A side-scrolling RPG built into this site — the portfolio is the game. I wrote the engine from scratch on canvas in React and TypeScript: rooms as data, one-way platform collision, parallax backdrops, NPC dialogue, party recruitment, and turn-based combat using an action-value turn order. Every frame of art is hand-drawn in Procreate and exported as animated PNG, then packed into sprite sheets by a Python pipeline I built that verifies pixel grids, ground lines, and canvas offsets so nothing drifts between animations. A native C++ port is planned once the first act is locked.",
  },
  {
    title: "MiniMind Discord Bot",
    date: "Apr 2025",
    body: "A multifunctional Python Discord bot I made to stay focused in one place instead of juggling tabs — it finds synonyms, translates text, checks grammar, and summarizes long messages. It integrates the DeepL, Google Translate, and Gemini APIs with asynchronous calls for fast, context-aware responses, and is deployed via Replit and UptimeRobot for 24/7 availability with automatic recovery.",
  },
  {
    title: "Old Portfolio Website",
    date: "Jun 2022",
    body: "My first personal site, built in high school with HTML, CSS, and JavaScript to showcase my artwork and technical skills. I implemented responsive design for everything from phones to large desktops, built accessible UI elements for smooth navigation, cut average page load time by 35%, and used Bootstrap 5 for interactive visual components.",
  },
];

const SITE_LAT = 43.4643;
const SITE_LON = -80.5204;

function sunAltitude(t: number): number {
  const rad = Math.PI / 180;
  const d = t / 86400000 - 10957.5;
  const g = (357.529 + 0.98560028 * d) * rad;
  const q = (280.459 + 0.98564736 * d) * rad;
  const L = q + (1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * rad;
  const e = (23.439 - 0.00000036 * d) * rad;
  const dec = Math.asin(Math.sin(e) * Math.sin(L));
  const ra = Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L));
  const gmst = (18.697374558 + 24.06570982441908 * d) % 24;
  const ha = ((gmst + SITE_LON / 15) * 15) * rad - ra;
  const phi = SITE_LAT * rad;
  return Math.asin(Math.sin(phi) * Math.sin(dec) +
                   Math.cos(phi) * Math.cos(dec) * Math.cos(ha)) / rad;
}

const SKY_HORIZON = -0.833;
const SKY_TWILIGHT = -12;

const SKY_CYCLE = ["night", "dawn", "sunrise", "day", "sunset", "dusk"];
const SKY_URL: Record<string, string> = {
  night: new URL("../assets/sky/night.webp", import.meta.url).href,
  dawn: new URL("../assets/sky/dawn.webp", import.meta.url).href,
  sunrise: new URL("../assets/sky/sunrise.webp", import.meta.url).href,
  day: new URL("../assets/sky/day.webp", import.meta.url).href,
  sunset: new URL("../assets/sky/sunset.webp", import.meta.url).href,
  dusk: new URL("../assets/sky/dusk.webp", import.meta.url).href,
};

function skyPhase(now: number = Date.now()) {
  const alt = sunAltitude(now);
  const rising = alt > sunAltitude(now - 600000);
  if (alt >= 6) return "day";
  if (alt >= SKY_HORIZON) return rising ? "sunrise" : "sunset";
  if (alt >= SKY_TWILIGHT) return rising ? "dawn" : "dusk";
  return "night";
}

const LINKS = {
  github: "https://github.com/Lindoop",
  linkedin: "https://www.linkedin.com/in/linda-chen0617/",
  resume: "/Linda_Chen_Resume.pdf",
};

export default function Portfolio() {
  const [skyA, setSkyA] = useState(skyPhase);
  const [skyB, setSkyB] = useState<string | undefined>(undefined);
  const [onB, setOnB] = useState(false);
  const [day, setDay] = useState(() => DAYS[new Date().getDay()]);
  const sky = onB ? (skyB as string) : skyA;

  useEffect(() => {
    const id = setInterval(() => {
      const next = skyPhase();
      setDay(DAYS[new Date().getDay()]);
      setOnB((b) => {
        if (next === (b ? skyB : skyA)) return b;
        if (b) setSkyA(next); else setSkyB(next);
        return !b;
      });
    }, 60000);
    return () => clearInterval(id);
  }, [skyA, skyB]);

  useEffect(() => {
    const i = SKY_CYCLE.indexOf(sky);
    if (i < 0) return;
    const im = new Image();
    im.src = SKY_URL[SKY_CYCLE[(i + 1) % SKY_CYCLE.length]];
  }, [sky]);

  const [view, setView] = useState<"inside" | "outside">("inside");
  const [anim, setAnim] = useState<"out" | "in" | undefined>(undefined);
  const [hot, setHot] = useState(false);
  const [navOpen, setNavOpen] = useState(false);

  const navRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!navOpen) return;
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setNavOpen(false); };
    const away = (e: PointerEvent) => {
      if (!navRef.current?.contains(e.target as Node)) setNavOpen(false);
    };
    window.addEventListener("keydown", esc);
    document.addEventListener("pointerdown", away);
    return () => {
      window.removeEventListener("keydown", esc);
      document.removeEventListener("pointerdown", away);
    };
  }, [navOpen]);
  const heroRef = useRef<HTMLElement | null>(null);
  const artRef = useRef<HTMLDivElement | null>(null);
  const maskRef = useRef<{ w: number; h: number; a: Uint8Array } | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all(
      CAFE_LAYERS.map(
        (src) =>
          new Promise<HTMLImageElement>((res, rej) => {
            const im = new Image();
            im.onload = () => res(im);
            im.onerror = rej;
            im.src = src;
          })
      )
    )
      .then((imgs) => {
        if (!alive) return;
        const c = document.createElement("canvas");
        c.width = imgs[0].naturalWidth;
        c.height = imgs[0].naturalHeight;
        const g = c.getContext("2d");
        if (!g) return;
        imgs.forEach((im) => g.drawImage(im, 0, 0));
        const d = g.getImageData(0, 0, c.width, c.height).data;
        const a = new Uint8Array(c.width * c.height);
        for (let i = 0; i < a.length; i++) a[i] = d[i * 4 + 3];
        maskRef.current = { w: c.width, h: c.height, a };
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  const holeAt = (cx: number, cy: number) => {
    const m = maskRef.current;
    const el = artRef.current;
    if (!m || !el || window.innerWidth <= 800) return null;
    const r = el.getBoundingClientRect();
    const drawW = Math.max(ART_MIN, r.width);
    const px = (cx - (r.left + (r.width - drawW) / 2)) / drawW;
    const py = (cy - r.top) / (drawW * m.h / m.w);
    if (px < 0 || py < 0 || px > 1 || py > 1) return null;
    const i = Math.floor(py * m.h) * m.w + Math.floor(px * m.w);
    const ex = ((r.width - drawW) / 2 + px * drawW) / r.width;
    return m.a[i] < 8 ? { px, py, ex } : null;
  };

  const onHeroClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("a,button,.hero-card")) return;
    if (view === "outside") { setView("inside"); setAnim("in"); return; }
    const hit = holeAt(e.clientX, e.clientY);
    if (!hit) return;
    heroRef.current?.style.setProperty("--ox", `${(hit.ex * 100).toFixed(2)}%`);
    heroRef.current?.style.setProperty("--oy", `${(hit.py * 100).toFixed(2)}%`);
    setView("outside");
    setAnim("out");
    setHot(false);
  };

  const onHeroMove = (e: React.MouseEvent) => {
    setHot(view === "outside" ? true : !!holeAt(e.clientX, e.clientY));
  };

  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>(".pf .reveal");
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      els.forEach((el) => el.classList.add("in"));
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); obs.unobserve(e.target); } }),
      { threshold: 0.12 }
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return (
    <div className="pf" id="top">

      <header className="pf-header">
        <div className="wrap">
          <nav ref={navRef} data-open={navOpen ? "1" : undefined}>
            <a className="brand" href="#top"><span className="seal">LC</span> Linda&nbsp;Chen</a>
            <button
              className="navtoggle"
              aria-label="Menu"
              aria-expanded={navOpen}
              onClick={() => setNavOpen((o) => !o)}
            >
              <span /><span /><span />
            </button>
            <ul className="navlinks" onClick={() => setNavOpen(false)}>
              <li><a href="#about">About</a></li>
              <li><a href="#experience">Experience</a></li>
              <li><a href="#projects">Projects</a></li>
              <li><a href="#contact">Contact</a></li>
            </ul>
          </nav>
        </div>
      </header>

      <main className="wrap">
        <section
          className="hero"
          ref={heroRef}
          data-day={day}
          data-view={view}
          data-anim={anim}
          data-hot={hot ? "1" : undefined}
          onClick={onHeroClick}
          onMouseMove={onHeroMove}
          onMouseLeave={() => setHot(false)}
        >
          <div className="hero-art" ref={artRef} aria-hidden="true">
            <div className="hero-scene hero-sky" data-sky={skyA} data-on={onB ? undefined : "1"} />
            <div className="hero-scene hero-sky" data-sky={skyB} data-on={onB ? "1" : undefined} />
            <div className="hero-scene hero-far" />
            <div className="hero-cafe">
              <div className="hero-scene cafe-back" />
              <div className="hero-scene cafe-day" />
              <div className="hero-scene cafe-front" />
            </div>
          </div>
          <div className="hero-card">
            <h1>Linda <em>Chen</em></h1>
          </div>
        </section>

        <section className="intro">
          <p className="eyebrow">Systems Design Engineering // University of Waterloo</p>
          <div className="hero-actions">
            <a className="btn btn-solid" href="#projects">See my work</a>
            <a className="btn btn-ghost" href={LINKS.resume} target="_blank" rel="noopener">Resume &gt;</a>
          </div>
        </section>

        <section id="about" className="about reveal">
          <div className="sec-head"><span className="sec-num">01</span><h2>About</h2></div>
          <div className="talk">
            <span className="nameplate">LINDA</span>
            <p>Hi! I'm Linda. I'm a second-year Systems Design Engineering student at the University of Waterloo. I enjoy blending my design roots with where I'm headed as a developer, and over time that interest grew into a curiosity for how things are built. I like building practical solutions that actually solve problems, especially when they challenge me to learn along the way.</p>
            <p>Outside of class and projects, I spend a lot of time exploring new tech, coding, and experimenting with side projects just to see what I can make. I care about creating things that are useful, thoughtful, and genuinely make people's lives easier.</p>
            <span className="cursor" aria-hidden="true"></span>
          </div>
        </section>

        <section id="experience" className="reveal">
          <div className="sec-head"><span className="sec-num">02</span><h2>Experience</h2></div>
          {EXPERIENCE.map((e) => (
            <div className="entry" key={e.role + e.when}>
              <div className="when">{e.when}</div>
              <div>
                <h3>{e.role} / <span className="co">{e.company}</span></h3>
                <p>{e.body}</p>
              </div>
            </div>
          ))}
        </section>

        <section id="projects" className="reveal">
          <div className="sec-head"><span className="sec-num">03</span><h2>Projects</h2></div>
          {PROJECTS.map((pr) => (
            <article className="proj" key={pr.title}>
              <div className="proj-top"><h3>{pr.title}</h3><span className="date">{pr.date}</span></div>
              <p>{pr.body}</p>
            </article>
          ))}
        </section>

        <section id="contact" className="contact reveal">
          <div className="sec-head"><span className="sec-num">04</span><h2>Contact</h2></div>
          <p className="big">Let's build something.<br />Find me on <a href={LINKS.linkedin} target="_blank" rel="noopener">LinkedIn</a>.</p>
          <div className="links">
            <a href={LINKS.github} target="_blank" rel="noopener">GitHub &gt;</a>
            <a href={LINKS.linkedin} target="_blank" rel="noopener">LinkedIn &gt;</a>
            <a href={LINKS.resume} target="_blank" rel="noopener">Resume &gt;</a>
          </div>
        </section>
      </main>

      <footer className="wrap pf-footer">
        <span className="note">Thanks for exploring my corner of the web!</span>
        <span>© 2026 Linda Chen</span>
      </footer>
    </div>
  );
}