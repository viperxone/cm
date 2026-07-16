// data.js — static game data. No logic here, just tables.
// Shared between browser (window) and Node (for sanity testing).
(function (global) {
  "use strict";

  // The 10 visible attributes, all on a 1-20 scale (classic CM/FM convention).
  const ATTRIBUTES = [
    "Passing", "Shooting", "Tackling", "Dribbling", "Pace",
    "Strength", "Stamina", "Positioning", "Decisions", "Composure"
  ];

  // Broad positions (9, per the lean spec — Wing-Back folded into Full-Back).
  const POSITIONS = ["GK", "CD", "FB", "DM", "CM", "WG", "AM", "ST"];

  const POSITION_LABELS = {
    GK: "Goalkeeper", CD: "Central Defender", FB: "Full-Back",
    DM: "Defensive Midfielder", CM: "Central Midfielder", WG: "Winger",
    AM: "Attacking Midfielder", ST: "Striker"
  };

  // If a slot can't be filled by its exact position, these are acceptable
  // fallbacks in priority order (used for emergency team selection).
  const POSITION_FALLBACK = {
    GK: ["GK"],
    CD: ["CD", "FB"],
    FB: ["FB", "CD", "WG"],
    DM: ["DM", "CM"],
    CM: ["CM", "DM", "AM"],
    WG: ["WG", "AM", "FB"],
    AM: ["AM", "CM", "ST"],
    ST: ["ST", "AM"]
  };

  // 16 roles total (2 per position), each a weighted blend of the 10
  // attributes summing to 1.0. This single weight table is the entire
  // "role suitability formula" — see Lean v1 Spec §3.3.
  const ROLES = {
    GK: {
      "Goalkeeper": { Positioning: 0.30, Composure: 0.25, Decisions: 0.20, Strength: 0.15, Passing: 0.10 },
      "Sweeper Keeper": { Passing: 0.25, Positioning: 0.20, Decisions: 0.20, Composure: 0.20, Pace: 0.15 }
    },
    CD: {
      "Stopper": { Tackling: 0.30, Strength: 0.25, Positioning: 0.20, Composure: 0.15, Decisions: 0.10 },
      "Ball-Playing Defender": { Passing: 0.25, Positioning: 0.25, Tackling: 0.20, Decisions: 0.15, Composure: 0.15 }
    },
    FB: {
      "Defensive Full-Back": { Tackling: 0.30, Positioning: 0.25, Stamina: 0.20, Strength: 0.15, Decisions: 0.10 },
      "Attacking Full-Back": { Pace: 0.25, Stamina: 0.20, Passing: 0.20, Dribbling: 0.20, Tackling: 0.15 }
    },
    DM: {
      "Anchor": { Tackling: 0.30, Positioning: 0.30, Strength: 0.20, Decisions: 0.20 },
      "Deep-Lying Playmaker": { Passing: 0.35, Decisions: 0.25, Positioning: 0.20, Composure: 0.20 }
    },
    CM: {
      "Box-to-Box": { Stamina: 0.25, Tackling: 0.20, Passing: 0.20, Dribbling: 0.20, Pace: 0.15 },
      "Playmaker": { Passing: 0.35, Decisions: 0.25, Dribbling: 0.20, Composure: 0.20 }
    },
    WG: {
      "Winger": { Pace: 0.30, Dribbling: 0.30, Passing: 0.20, Stamina: 0.20 },
      "Inverted Winger": { Dribbling: 0.30, Shooting: 0.25, Passing: 0.25, Pace: 0.20 }
    },
    AM: {
      "Number 10": { Passing: 0.30, Decisions: 0.25, Dribbling: 0.25, Composure: 0.20 },
      "Shadow Striker": { Shooting: 0.30, Dribbling: 0.25, Pace: 0.25, Decisions: 0.20 }
    },
    ST: {
      "Poacher": { Shooting: 0.35, Positioning: 0.30, Composure: 0.20, Pace: 0.15 },
      "Target Man": { Strength: 0.30, Shooting: 0.25, Positioning: 0.25, Composure: 0.20 }
    }
  };

  // Squad composition template used for every generated club (22 players).
  const SQUAD_TEMPLATE = [
    { pos: "GK", count: 2 }, { pos: "CD", count: 4 }, { pos: "FB", count: 4 },
    { pos: "DM", count: 2 }, { pos: "CM", count: 3 }, { pos: "WG", count: 2 },
    { pos: "AM", count: 2 }, { pos: "ST", count: 3 }
  ];

  // 6 formation presets (Lean v1 Spec §5.1) — arrays of broad-position slots.
  const FORMATIONS = {
    "4-4-2": ["GK", "FB", "CD", "CD", "FB", "WG", "CM", "CM", "WG", "ST", "ST"],
    "4-3-3": ["GK", "FB", "CD", "CD", "FB", "DM", "CM", "CM", "WG", "ST", "WG"],
    "4-2-3-1": ["GK", "FB", "CD", "CD", "FB", "DM", "DM", "WG", "AM", "WG", "ST"],
    "3-5-2": ["GK", "CD", "CD", "CD", "WG", "DM", "CM", "CM", "WG", "ST", "ST"],
    "4-5-1": ["GK", "FB", "CD", "CD", "FB", "WG", "DM", "CM", "CM", "WG", "ST"],
    "3-4-3": ["GK", "CD", "CD", "CD", "WG", "CM", "CM", "WG", "ST", "ST", "ST"]
  };

  const MENTALITIES = ["Defensive", "Balanced", "Attacking"];
  const PRESSING = ["Low", "Medium", "High"];
  const TEMPO = ["Slow", "Normal", "Fast"];

  const CLUB_NAMES = [
    "Ashcombe United", "Redgate Town", "Marlowe Athletic", "Corvale FC",
    "Brightwell Rovers", "Sanderton City", "Old Mill Wanderers",
    "Thornbury FC", "Kesterwick Albion", "Fenmoor United"
  ];

  // Relative strength tiers used only at world-generation time, to give the
  // league believable variance (title contenders vs strugglers) from day one.
  const CLUB_TIERS = [1.15, 1.10, 1.05, 1.00, 1.00, 0.98, 0.95, 0.92, 0.90, 0.85];

  const LEAGUE_NAME = "Meridian Championship";

  const FIRST_NAMES = [
    "Jonas", "Marcus", "Elian", "Theo", "Rikard", "Dario", "Nolan", "Sami",
    "Kasimir", "Owen", "Milo", "Bastian", "Idris", "Callum", "Rafael",
    "Emeka", "Viktor", "Tomas", "Aldo", "Finn", "Andrei", "Kofi", "Julen",
    "Mateo", "Soren", "Declan", "Ezra", "Nikolai", "Amare", "Pieter"
  ];
  const LAST_NAMES = [
    "Voss", "Marlin", "Adeyemi", "Costa", "Renner", "Halvorsen", "Bruno",
    "Kessler", "Okafor", "Dumont", "Steiner", "Larkin", "Novak", "Torres",
    "Bergstrom", "Cissé", "Whitlock", "Amaral", "Draven", "Solberg",
    "Achebe", "Pryce", "Falk", "Moreau", "Sund", "Barros", "Lindqvist",
    "Osei", "Carrow", "Vantage"
  ];

  const NS = {
    ATTRIBUTES, POSITIONS, POSITION_LABELS, POSITION_FALLBACK, ROLES,
    SQUAD_TEMPLATE, FORMATIONS, MENTALITIES, PRESSING, TEMPO,
    CLUB_NAMES, CLUB_TIERS, LEAGUE_NAME, FIRST_NAMES, LAST_NAMES
  };

  global.FM = Object.assign(global.FM || {}, NS);
})(typeof window !== "undefined" ? window : global);
