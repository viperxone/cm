// gen.js — world generation. Pure functions, no DOM.
(function (global) {
  "use strict";
  const FM = global.FM;

  // Mulberry32 seeded PRNG — deterministic so a given save seed always
  // generates the same world (useful for debugging and reproducibility).
  function mulberry32(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function pick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }
  function randInt(rng, min, max) { return min + Math.floor(rng() * (max - min + 1)); }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  let _uid = 1;
  function nextId(prefix) { return prefix + "_" + (_uid++); }

  function generatePlayer(rng, position, clubTier, opts) {
    opts = opts || {};
    const roleNames = Object.keys(FM.ROLES[position]);
    const role = pick(rng, roleNames);
    const weights = FM.ROLES[position][role];

    // Quality is club-tier-scaled with per-player variance, so even a top
    // club has depth/backup players and a weak club can have one gem.
    // Real first-teamers (opts.qualityBoost) skew noticeably above the
    // squad's generated depth, same as in reality.
    const quality = clubTier * (0.72 + rng() * 0.5) * (opts.qualityBoost || 1);
    const base = 8;

    const attributes = {};
    FM.ATTRIBUTES.forEach(attr => {
      const weightBoost = (weights[attr] || 0) * 10;
      const raw = base * quality + weightBoost + (rng() * 3 - 1.5);
      attributes[attr] = clamp(Math.round(raw), 1, 20);
    });

    return {
      id: nextId("p"),
      name: opts.name || (pick(rng, FM.FIRST_NAMES) + " " + pick(rng, FM.LAST_NAMES)),
      position, role, attributes,
      age: randInt(rng, 17, 34),
      contractYears: randInt(rng, 1, 4),
      hidden: {
        consistency: 0.5 + rng() * 0.5,       // 0.5-1.0, higher = more reliable
        injuryProneness: 0.6 + rng() * 0.9    // 0.6-1.5, higher = more injury-prone
      },
      state: {
        condition: 100,
        morale: 55 + randInt(rng, -5, 15),
        formHistory: [6.0, 6.0, 6.0],
        injured: false, weeksOut: 0,
        yellowCards: 0, suspended: false
      }
    };
  }

  function generateClub(rng, name, tier, isUserClub) {
    const stars = (FM.REAL_STARS && FM.REAL_STARS[name]) || [];
    const players = [];
    FM.SQUAD_TEMPLATE.forEach(({ pos, count }) => {
      const starsForPos = stars.filter(s => s.position === pos);
      for (let i = 0; i < count; i++) {
        if (i < starsForPos.length) {
          players.push(generatePlayer(rng, pos, tier, { name: starsForPos[i].name, qualityBoost: 1.22 }));
        } else {
          players.push(generatePlayer(rng, pos, tier));
        }
      }
    });
    return {
      id: nextId("c"),
      name, tier, isUserClub: !!isUserClub,
      players,
      tactics: { formation: "4-4-2", mentality: "Balanced", pressing: "Medium", tempo: "Normal" },
      table: { played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 },
      boardConfidence: 50,
      form: [] // last results, most recent last: "W" | "D" | "L"
    };
  }

  // Circle-method double round-robin. Returns fixtures grouped by week:
  // [{ week: 1, matches: [{home, away}, ...] }, ...]
  function generateFixtures(clubIds) {
    const teams = clubIds.slice();
    if (teams.length % 2 !== 0) teams.push(null); // bye slot, unused here (10 is even)
    const n = teams.length;
    const rounds = n - 1;
    const half = n / 2;
    const weeks = [];
    let arr = teams.slice();

    for (let r = 0; r < rounds; r++) {
      const matches = [];
      for (let i = 0; i < half; i++) {
        const a = arr[i], b = arr[n - 1 - i];
        if (a !== null && b !== null) {
          // Alternate home/away by round parity for fairness.
          if (r % 2 === 0) matches.push({ home: a, away: b });
          else matches.push({ home: b, away: a });
        }
      }
      weeks.push({ week: r + 1, matches });
      // Rotate all but the first element.
      arr = [arr[0]].concat([arr[n - 1]], arr.slice(1, n - 1));
    }

    // Second half of the season: mirror fixtures with home/away swapped.
    const secondHalf = weeks.map((w, idx) => ({
      week: rounds + idx + 1,
      matches: w.matches.map(m => ({ home: m.away, away: m.home }))
    }));

    return weeks.concat(secondHalf);
  }

  function generateWorld(seed, userClubName) {
    const rng = mulberry32(seed);
    const names = FM.CLUB_NAMES.slice();
    const clubs = names.map((name, i) =>
      generateClub(rng, name, FM.CLUB_TIERS[i], name === userClubName)
    );
    const fixtures = generateFixtures(clubs.map(c => c.id));
    return { clubs, fixtures, week: 0, seed };
  }

  global.FM = Object.assign(global.FM || {}, {
    mulberry32, generateWorld, generateFixtures, generateClub, generatePlayer
  });
})(typeof window !== "undefined" ? window : global);
