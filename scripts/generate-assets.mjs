/**
 * Generates the monochrome README visual system for github.com/Hiran-Abhisheka.
 *
 *   node scripts/generate-assets.mjs
 *
 * Writes every panel twice: assets/<name>.svg (light) and assets/dark/<name>.svg.
 * Stats are fetched live from the GitHub API; if a request fails the snapshot
 * below is used instead.
 */

import { writeFileSync, mkdirSync } from "node:fs";

const USER = "Hiran-Abhisheka";
const OUT = "assets";
const OUT_DARK = "assets/dark";

/* ------------------------------------------------------------------ themes */

const LIGHT = {
  name: "light",
  ink: "#1f2328",
  muted: "#59636e",
  line: "#d0d7de",
  soft: "#f6f8fa",
  track: "#eaeef2",
  strong: "#1f2328",
};

const DARK = {
  name: "dark",
  ink: "#f0f6fc",
  muted: "#8b949e",
  line: "#30363d",
  soft: "#161b22",
  track: "#21262d",
  strong: "#f0f6fc",
};

const FONT =
  "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace";

/* --------------------------------------------------------------- svg utils */

const esc = (s) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

function text(x, y, str, o = {}) {
  const {
    size = 13,
    weight = 400,
    fill = "ink",
    anchor = "start",
    spacing = 0,
    opacity = 1,
    theme,
  } = o;
  const c = fill === "ink" ? theme.ink : fill === "muted" ? theme.muted : fill;
  return `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${size}" font-weight="${weight}" fill="${c}"${
    anchor !== "start" ? ` text-anchor="${anchor}"` : ""
  }${spacing ? ` letter-spacing="${spacing}"` : ""}${
    opacity !== 1 ? ` opacity="${opacity}"` : ""
  }>${esc(str)}</text>`;
}

function rect(x, y, w, h, o = {}) {
  const { fill = "none", stroke = null, theme, rx = 0, opacity = 1, anim = "" } = o;
  const f = fill === "ink" ? theme.ink : fill === "soft" ? theme.soft : fill === "strong" ? theme.strong : fill;
  const s = stroke === "line" ? theme.line : stroke === "ink" ? theme.ink : stroke;
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${f}"${
    s ? ` stroke="${s}" stroke-width="1"` : ""
  }${opacity !== 1 ? ` opacity="${opacity}"` : ""}>${anim}</rect>`;
}

function line(x1, y1, x2, y2, theme, o = {}) {
  const { stroke = "line", dash = null, opacity = 1 } = o;
  const c = stroke === "line" ? theme.line : stroke === "ink" ? theme.ink : stroke;
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="1"${
    dash ? ` stroke-dasharray="${dash}"` : ""
  }${opacity !== 1 ? ` opacity="${opacity}"` : ""}/>`;
}

function dot(cx, cy, r, theme, fill = "ink", opacity = 1) {
  const c = fill === "ink" ? theme.ink : fill === "muted" ? theme.muted : fill;
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${c}" opacity="${opacity}"/>`;
}

const file = (w, h, theme, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img">\n${body}\n</svg>\n`;

const panel = (w, h, theme, body) =>
  file(w, h, theme, [rect(0.5, 0.5, w - 1, h - 1, { stroke: "line", theme }), body].join("\n"));

/* ------------------------------------------------------------- live  data */

const SNAPSHOT = {
  repos: 30,
  followers: 10,
  stars: 14,
  contributions: { "2024": 46, "2025": 51, "2026": 392 },
  lastYear: 400,
  activeDays: 75,
  currentStreak: 3,
  longestStreak: 5,
  bestDay: { date: "2026-10-10", count: 31 },
  months: {
    "2025-11": 6,
    "2025-12": 3,
    "2026-01": 0,
    "2026-02": 22,
    "2026-03": 22,
    "2026-04": 107,
    "2026-05": 77,
    "2026-06": 27,
    "2026-07": 15,
    "2026-08": 27,
    "2026-09": 9,
    "2026-10": 85,
  },
  languages: [
    ["TypeScript", 9],
    ["JavaScript", 5],
    ["Python", 4],
    ["HTML / CSS", 4],
    ["C#", 1],
    ["Dart", 1],
    ["Other", 3],
  ],
};

const GH = { headers: { "user-agent": "readme-asset-generator" } };

async function fetchLive() {
  const data = structuredClone(SNAPSHOT);
  try {
    const repos = await fetch(
      `https://api.github.com/users/${USER}/repos?per_page=100&sort=pushed`,
      GH,
    ).then((r) => r.json());
    const owned = repos.filter((r) => !r.fork);
    data.repos = repos.filter((r) => !r.fork).length + repos.filter((r) => r.fork).length;
    data.ownedRepos = owned.length;
    data.stars = owned.reduce((n, r) => n + r.stargazers_count, 0);

    const counts = new Map();
    for (const r of owned) {
      let k = r.language || "Other";
      if (k === "CSS" || k === "HTML") k = "HTML / CSS";
      counts.set(k, (counts.get(k) || 0) + 1);
    }
    const order = [
      "TypeScript",
      "JavaScript",
      "Python",
      "HTML / CSS",
      "C#",
      "Java",
      "Dart",
      "C++",
      "Other",
    ];
    data.languages = order
      .filter((k) => counts.has(k))
      .map((k) => [k, counts.get(k)])
      .concat([...counts].filter(([k]) => !order.includes(k)));
  } catch {
    /* keep snapshot repos/languages */
  }

  try {
    const all = await fetch(
      `https://github-contributions-api.jogruber.de/v4/${USER}?y=all`,
    ).then((r) => r.json());
    const days = all.contributions;
    data.contributions = all.total;
    let longest = 0;
    let run = 0;
    for (const d of days) {
      if (d.count > 0) {
        run += 1;
        if (run > longest) longest = run;
      } else run = 0;
    }
    data.longestStreak = longest;
    data.activeDays = days.filter((d) => d.count > 0).length;
    const last = days[days.length - 1];
    let cur = 0;
    for (let i = days.length - 1; i >= 0; i--) {
      if (days[i].count > 0) cur += 1;
      else break;
    }
    data.currentStreak = cur;
    const best = days
      .filter((d) => d.count > 0)
      .reduce((a, b) => (b.count > a.count ? b : a), { count: 0, date: last.date });
    data.bestDay = { date: best.date, count: best.count };

    const months = {};
    const recent = days.slice(-370);
    const first = recent[0].date.slice(0, 7);
    for (const d of recent) months[d.date.slice(0, 7)] = (months[d.date.slice(0, 7)] || 0) + d.count;
    delete months[first];
    data.months = months;

    const lastYear = await fetch(
      `https://github-contributions-api.jogruber.de/v4/${USER}?y=last`,
    ).then((r) => r.json());
    data.lastYear = lastYear.total.lastYear;
  } catch {
    /* keep snapshot contributions */
  }

  return data;
}

/* ---------------------------------------------------------------- content */

const NAME = "HIRAN ABHISHEKA";
const HANDLE = "@Hiran-Abhisheka";

const PROJECTS = [
  {
    name: "emergent",
    lang: "TypeScript",
    stars: 0,
    desc: "2D artificial-life lab — evolution emerges from creature neural networks",
    url: "https://emergent-nine-lemon.vercel.app/",
  },
  {
    name: "campus-shuttle",
    lang: "TypeScript",
    stars: 2,
    desc: "React + TS shuttle platform — admin, driver and student dashboards, live tracking",
    url: "https://github.com/Hiran-Abhisheka/campus-shuttle",
  },
  {
    name: "MeritMatch",
    lang: "C#",
    stars: 2,
    desc: "ASP.NET Core 8 research project management for students and supervisors",
    url: "https://github.com/Hiran-Abhisheka/MeritMatch",
  },
  {
    name: "kuppifeed",
    lang: "Dart",
    stars: 1,
    desc: "Cross-platform Flutter app — native builds for Android, iOS and macOS",
    url: "https://github.com/Hiran-Abhisheka/kuppifeed",
  },
  {
    name: "ferrari-web-page",
    lang: "JavaScript",
    stars: 1,
    desc: "Cinematic React + GSAP experience with glassmorphism and scroll motion",
    url: "https://ferrarinew.netlify.app/",
  },
  {
    name: "Eye_Tracking_Mouse_Controler",
    lang: "Python",
    stars: 1,
    desc: "Webcam eye-tracking that drives the cursor; blink to click",
    url: "https://github.com/Hiran-Abhisheka/Eye_Tracking_Mouse_Controler",
  },
];

const ECOSYSTEM = [
  {
    label: "Web & Front-End",
    note: "TypeScript / React interfaces, deployed on Vercel",
    repos: "emergent · nexus-website · LankaWild · Nomadic-Travel-Agency · Xenon-Space-Exploration",
  },
  {
    label: "Coursework & Systems",
    note: "C# / Java / Node systems, databases, full-stack coursework",
    repos: "MeritMatch · campus-shuttle · Utility-Management-System-UMS · WareHouseApp",
  },
  {
    label: "AI & Python Tools",
    note: "Voice assistants, automation scripts, computer vision",
    repos: "AI-Assistant · AI_Partner · AI-Gf-Bf · To-Do-list",
  },
  {
    label: "Mobile",
    note: "Flutter / Dart builds for Android, iOS, macOS and web",
    repos: "kuppifeed",
  },
];

const TIMELINE = [
  ["2024.07", "First repository", "Portfolio · profile config — 46 contributions in year one"],
  ["2024.08", "Python foundations", "calculator · To-Do-list · Simple-Web-site-Interface"],
  ["2024.09", "Applied AI", "AI-Assistant · AI_Partner — voice-driven assistants on the OpenAI API"],
  ["2025.08", "Front-end craft", "solo-leveling gallery · Eye_Tracking_Mouse_Controler"],
  ["2025.09", "Motion & interaction", "ferrari-web-page — React + GSAP, glassmorphism, scroll animation"],
  ["2025.11", "Systems work", "Utility-Management-System-UMS — JavaScript, Java, T-SQL"],
  ["2026.02", "Larger builds", "campus-shuttle — TypeScript platform, 429k of source"],
  ["2026.04", "Widening the stack", "MeritMatch (C#) · kuppifeed (Flutter) — peak month, 107 contributions"],
  ["2026.10", "Simulation & evolution", "emergent — neural-network artificial life, pure TypeScript engine"],
];

const STACK = [
  ["Languages", ["TypeScript", "JavaScript", "Python", "C#", "Java", "Dart", "C", "C++", "SQL"]],
  ["Front-End", ["React", "Next.js", "Tailwind CSS", "Vite", "GSAP", "HTML5", "CSS3"]],
  ["Back-End & Data", ["Node.js", "Express", "ASP.NET Core", "SQL Server", "REST", "Firebase"]],
  ["Tooling", ["Git", "GitHub", "VS Code", "Figma", "Photoshop", "Vercel", "Netlify"]],
];

/* ----------------------------------------------------------------- header */

function header(d) {
  const total = Object.values(d.contributions).reduce((a, b) => a + b, 0);
  return (theme) => {
    const W = 1000;
    const H = 210;
    const body = [
      rect(0.5, 0.5, W - 1, H - 1, { stroke: "line", theme }),
      // terminal chrome
      line(0, 38.5, W, 38.5, theme),
      dot(24, 20, 4, theme, "muted", 0.55),
      dot(40, 20, 4, theme, "muted", 0.35),
      dot(56, 20, 4, theme, "muted", 0.2),
      text(W - 24, 24, `${USER.toLowerCase()}@github:~$ whoami`, {
        size: 11,
        fill: "muted",
        anchor: "end",
        theme,
      }),
      text(40, 96, NAME, { size: 42, weight: 700, spacing: 3, theme }),
      rect(40, 108, 64, 3, { fill: "ink", theme }),
      text(
        40,
        140,
        "software engineering student  ·  front-end developer  ·  sri lanka",
        { size: 14, fill: "muted", theme, spacing: 0.5 },
      ),
      text(40, 168, "building interfaces for the web since 2024", {
        size: 14,
        fill: "muted",
        theme,
      }),
      // blinking cursor, parked after the last tagline glyph (14px monospace ~ 8.4px/char)
      rect(40 + "building interfaces for the web since 2024".length * 8.4 + 6, 156, 9, 16, {
        fill: "ink",
        theme,
        anim: `<animate attributeName="opacity" values="1;0;1" dur="1.4s" repeatCount="indefinite"/>`,
      }),
      // right-hand metrics
      text(W - 40, 74, `${String(d.repos).padStart(2, "0")}`, {
        size: 30,
        weight: 700,
        anchor: "end",
        theme,
      }),
      text(W - 40, 92, "REPOSITORIES", { size: 11, fill: "muted", anchor: "end", spacing: 2, theme }),
      text(W - 40, 130, `${total}`, { size: 30, weight: 700, anchor: "end", theme }),
      text(W - 40, 148, "CONTRIBUTIONS", { size: 11, fill: "muted", anchor: "end", spacing: 2, theme }),
      text(W - 40, 186, `open to opportunities · ${HANDLE}`, {
        size: 11,
        fill: "muted",
        anchor: "end",
        theme,
      }),
      line(W - 220, 56, W - 220, 196, theme, { opacity: 0.7 }),
    ].join("\n");
    return file(W, H, theme, body);
  };
}

/* -------------------------------------------------------------- dividers */

function divider(num, label) {
  return (theme) =>
    file(
      1000,
      64,
      theme,
      [
        text(4, 42, num, { size: 34, weight: 700, fill: "muted", theme, opacity: 0.5 }),
        text(64, 40, label.toUpperCase(), {
          size: 13,
          fill: "ink",
          theme,
          weight: 600,
          spacing: 3,
        }),
        line(64, 50, 996, 50, theme),
      ].join("\n"),
    );
}

/* ---------------------------------------------------------------- whoami */

function whoami(d) {
  return (theme) => {
    const W = 1000;
    const H = 190;
    const facts = [
      [String(d.repos), "public repositories"],
      [String(Object.values(d.contributions).reduce((a, b) => a + b, 0)), "contributions"],
      [String(d.activeDays), "active days"],
      [String(d.longestStreak), "longest streak"],
    ];
    const body = [
      text(40, 52, "I'm a software engineering undergraduate at NSBM Green", {
        size: 15,
        theme,
      }),
      text(40, 76, "University in Sri Lanka, building for the web since 2024.", {
        size: 15,
        theme,
      }),
      text(40, 104, "Most of my work is TypeScript and React — clean interfaces,", {
        size: 15,
        fill: "muted",
        theme,
      }),
      text(40, 128, "careful UX, and code that reads well. I like problems that", {
        size: 15,
        fill: "muted",
        theme,
      }),
      text(40, 152, "are part product, part engineering, and entirely mine.", {
        size: 15,
        fill: "muted",
        theme,
      }),
    ];
    facts.forEach(([value, label], i) => {
      const x = 660 + (i % 2) * 165;
      const y = i < 2 ? 58 : 132;
      body.push(text(x, y, value, { size: 26, weight: 700, theme }));
      body.push(text(x, y + 18, label.toUpperCase(), { size: 10, fill: "muted", spacing: 1.4, theme }));
    });
    body.push(line(636, 30, 636, 160, theme));
    return panel(W, H, theme, body.join("\n"));
  };
}

/* ------------------------------------------------------------- ecosystem */

function ecosystem(theme) {
  const W = 1000;
  const H = 70 + ECOSYSTEM.length * 58;
  const body = [];
  ECOSYSTEM.forEach((row, i) => {
    const y = 26 + i * 58;
    body.push(
      line(40, y + 44, 960, y + 44, theme, { opacity: 0.55 }),
      dot(46, y + 12, 3.5, theme, "ink"),
      text(64, y + 17, row.label, { size: 16, weight: 600, theme }),
      text(64, y + 38, row.repos, { size: 12, fill: "muted", theme }),
      text(960, y + 17, row.note, { size: 12, fill: "muted", anchor: "end", theme }),
    );
  });
  return panel(W, H, theme, body.join("\n"));
}

/* -------------------------------------------------------------- projects */

function projects(theme) {
  const W = 1000;
  const H = 56 + PROJECTS.length * 46 + 26;
  const body = [
    text(40, 30, "SELECTED WORK", { size: 11, fill: "muted", spacing: 2.5, theme }),
    text(960, 30, `${PROJECTS.length} of 30 repositories`, {
      size: 11,
      fill: "muted",
      anchor: "end",
      theme,
    }),
    line(40, 42, 960, 42, theme),
  ];
  PROJECTS.forEach((p, i) => {
    const y = 76 + i * 46;
    body.push(
      text(40, y, String(i + 1).padStart(2, "0"), { size: 12, fill: "muted", theme }),
      text(80, y, p.name, { size: 14, weight: 600, theme }),
      text(80, y + 17, p.desc, { size: 11.5, fill: "muted", theme }),
      text(700, y, p.lang.toUpperCase(), { size: 10.5, fill: "muted", spacing: 1.2, theme }),
      text(860, y, p.stars > 0 ? `* ${p.stars}` : "—", { size: 12, fill: "muted", theme }),
      text(960, y, "open →", { size: 11, fill: "muted", anchor: "end", theme }),
      line(40, y + 30, 960, y + 30, theme, { opacity: 0.5 }),
    );
  });
  return panel(W, H, theme, body.join("\n"));
}

/* ------------------------------------------------------------- telemetry */

function telemetry(d) {
  const W = 1000;
  const H = 360;
  const maxLang = Math.max(...d.languages.map(([, n]) => n));
  const months = Object.entries(d.months);
  const maxMonth = Math.max(1, ...months.map(([, n]) => n));

  return (theme) => {
    const body = [
      text(40, 32, "REPOSITORIES BY PRIMARY LANGUAGE", { size: 11, fill: "muted", spacing: 2.5, theme }),
      text(960, 32, `${d.repos} public repos`, { size: 11, fill: "muted", anchor: "end", theme }),
    ];

    d.languages.slice(0, 6).forEach(([lang, n], i) => {
      const y = 58 + i * 30;
      const w = Math.max(4, (n / maxLang) * 470);
      body.push(
        text(40, y + 4, lang, { size: 12, fill: "muted", theme }),
        rect(200, y - 9, 470, 14, { fill: "track", theme }),
        rect(200, y - 9, w, 14, {
          fill: "ink",
          theme,
          anim: `<animate attributeName="width" from="0" to="${w}" dur="0.7s" begin="${
            i * 0.09
          }s" fill="freeze"/>`,
        }),
        text(690, y + 4, String(n), { size: 12, theme }),
      );
    });

    // contributions over the last twelve months
    const bx = 40;
    const by = 310;
    const bw = (960 - 40) / months.length;
    body.push(
      text(40, 240, "CONTRIBUTIONS · LAST 12 MONTHS", { size: 11, fill: "muted", spacing: 2.5, theme }),
      text(960, 240, `peak ${maxMonth} in ${months.find(([, n]) => n === maxMonth)?.[0]}`, {
        size: 11,
        fill: "muted",
        anchor: "end",
        theme,
      }),
    );
    months.forEach(([m, n], i) => {
      const h = Math.max(2, (n / maxMonth) * 52);
      body.push(
        rect(bx + i * bw, by - h, bw - 10, h, {
          fill: "ink",
          theme,
          opacity: n === 0 ? 0.18 : 0.85,
          anim: `<animate attributeName="height" from="0" to="${h}" dur="0.6s" begin="${
            i * 0.05
          }s" fill="freeze"/><animate attributeName="y" from="${by}" to="${by - h}" dur="0.6s" begin="${
            i * 0.05
          }s" fill="freeze"/>`,
        }),
        text(bx + i * bw + (bw - 10) / 2, by + 18, m.slice(5), {
          size: 10,
          fill: "muted",
          anchor: "middle",
          theme,
        }),
      );
    });
    body.push(line(40, by + 35, 960, by + 35, theme, { opacity: 0.5 }));
    return panel(W, H, theme, body.join("\n"));
  };
}

/* ----------------------------------------------------------- github stats */

function stats(d) {
  const total = Object.values(d.contributions).reduce((a, b) => a + b, 0);
  return (theme) => {
    const W = 1000;
    const H = 250;
    const metrics = [
      [String(total), "contributions all time"],
      [String(d.lastYear), "in the last year"],
      [String(d.activeDays), "active days"],
      [String(d.currentStreak), "current streak"],
      [String(d.longestStreak), "longest streak"],
      [`${d.bestDay.count}`, `best day · ${d.bestDay.date}`],
    ];
    const body = [
      text(40, 32, "DEVELOPER TELEMETRY", { size: 11, fill: "muted", spacing: 2.5, theme }),
      text(960, 32, "generated from public GitHub activity", {
        size: 11,
        fill: "muted",
        anchor: "end",
        theme,
      }),
      line(40, 44, 960, 44, theme),
    ];
    metrics.forEach(([value, label], i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const x = 40 + col * 313;
      const y = 100 + row * 88;
      body.push(
        text(x, y, value, { size: 32, weight: 700, theme }),
        text(x, y + 20, label.toUpperCase(), { size: 10.5, fill: "muted", spacing: 1.6, theme }),
      );
      if (col < 2) body.push(line(x + 273, y - 42, x + 273, y + 6, theme, { opacity: 0.55 }));
    });
    body.push(
      line(40, 210, 960, 210, theme, { opacity: 0.55 }),
      text(40, 232, `followers ${d.followers}  ·  following ${d.following ?? 10}  ·  stars ${d.stars}  ·  member since 2024`, {
        size: 12,
        fill: "muted",
        theme,
      }),
      text(960, 232, `${USER}`, { size: 12, fill: "muted", anchor: "end", theme }),
    );
    return panel(W, H, theme, body.join("\n"));
  };
}

/* -------------------------------------------------------------- timeline */

function timeline(theme) {
  const W = 1000;
  const H = 76 + TIMELINE.length * 52;
  const body = [
    text(40, 30, "EDUCATION", { size: 11, fill: "muted", spacing: 2.5, theme }),
    text(160, 30, "NSBM Green University — BSc (Hons) Software Engineering, in progress", {
      size: 13,
      theme,
    }),
    line(40, 46, 960, 46, theme),
    text(40, 72, "BUILD HISTORY", { size: 11, fill: "muted", spacing: 2.5, theme }),
  ];
  body.push(line(52, 92, 52, 92 + (TIMELINE.length - 1) * 52, theme, { opacity: 0.7 }));
  TIMELINE.forEach(([date, title, detail], i) => {
    const y = 96 + i * 52;
    body.push(
      dot(52, y - 4, 4, theme, "ink"),
      text(80, y, date, { size: 12, fill: "muted", theme }),
      text(160, y, title, { size: 14, weight: 600, theme }),
      text(160, y + 20, detail, { size: 11.5, fill: "muted", theme }),
    );
  });
  return panel(W, H, theme, body.join("\n"));
}

/* ----------------------------------------------------------------- stack */

function stack(theme) {
  const W = 1000;
  const H = 96 + STACK.length * 52;
  const CW = 7.15; // monospace advance at 12px
  const body = [
    text(40, 32, "TECHNICAL STACK", { size: 11, fill: "muted", spacing: 2.5, theme }),
    text(960, 32, "day-to-day tools", { size: 11, fill: "muted", anchor: "end", theme }),
    line(40, 46, 960, 46, theme),
  ];
  STACK.forEach(([label, chips], i) => {
    const y = 78 + i * 52;
    body.push(
      text(40, y + 4, label.toUpperCase(), { size: 10.5, fill: "muted", spacing: 1.6, theme }),
    );
    let x = 220;
    for (const chip of chips) {
      const w = chip.length * CW + 24;
      if (x + w > 960) break;
      body.push(
        rect(x, y - 13, w, 24, { stroke: "line", theme }),
        text(x + 12, y + 3, chip, { size: 12, theme }),
      );
      x += w + 8;
    }
    if (i < STACK.length - 1) body.push(line(40, y + 26, 960, y + 26, theme, { opacity: 0.5 }));
  });
  return panel(W, H, theme, body.join("\n"));
}

/* ---------------------------------------------------------------- footer */

function footer(d) {
  return (theme) =>
    panel(
      1000,
      110,
      theme,
      [
        text(40, 44, "STATUS", { size: 10.5, fill: "muted", spacing: 2, theme }),
        text(40, 68, "open to opportunities & collaboration", { size: 15, theme }),
        text(460, 44, "LOCATION", { size: 10.5, fill: "muted", spacing: 2, theme }),
        text(460, 68, "Sri Lanka · GMT+5:30", { size: 15, theme }),
        text(700, 44, "LAST UPDATED", { size: 10.5, fill: "muted", spacing: 2, theme }),
        text(700, 68, new Date().toISOString().slice(0, 10), { size: 15, theme }),
        dot(850, 62, 4, theme, "ink"),
        text(864, 66, "available", { size: 12, fill: "muted", theme }),
      ].join("\n"),
    );
}

/* ------------------------------------------------------------------ main */

const data = await fetchLive();
data.following ??= 10;

const files = {
  "header-v1": header(data),
  s01: divider("01", "whoami"),
  whoami: whoami(data),
  s02: divider("02", "system map"),
  ecosystem: ecosystem,
  s03: divider("03", "selected work"),
  projects: projects,
  s04: divider("04", "telemetry"),
  telemetry: telemetry(data),
  "github-stats": stats(data),
  s05: divider("05", "the route"),
  timeline: timeline,
  s06: divider("06", "stack"),
  stack: stack,
  footer: footer(data),
};

mkdirSync(OUT, { recursive: true });
mkdirSync(OUT_DARK, { recursive: true });

for (const [name, make] of Object.entries(files)) {
  writeFileSync(`${OUT}/${name}.svg`, make(LIGHT));
  writeFileSync(`${OUT_DARK}/${name}.svg`, make(DARK));
}

console.log(`wrote ${Object.keys(files).length} panels x2 into ${OUT}/ and ${OUT_DARK}/`);
console.log(JSON.stringify({ totals: data.contributions, repos: data.repos, languages: data.languages }, null, 2));
