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

  // The 2025-26 Premier League lineup (20 clubs). Real club names/player
  // names are facts, not copyrighted expression — no crests, kits, or
  // broadcast assets are used or reproduced anywhere in this prototype.
  const CLUB_NAMES = [
    "Liverpool", "Arsenal", "Manchester City", "Chelsea", "Newcastle United",
    "Aston Villa", "Tottenham Hotspur", "Manchester United", "Brighton & Hove Albion",
    "Nottingham Forest", "Crystal Palace", "Bournemouth", "Fulham", "Brentford",
    "Everton", "West Ham United", "Wolverhampton Wanderers", "Burnley",
    "Leeds United", "Sunderland"
  ];

  // Rough relative strength tiers (not a real table) used only at
  // world-generation time, so the league has believable variance from day
  // one — title contenders, mid-table, strugglers, newly-promoted sides.
  const CLUB_TIERS = [
    1.18, 1.16, 1.14, 1.08, 1.06, 1.04, 1.03, 1.02, 1.00, 0.99,
    0.98, 0.97, 0.96, 0.95, 0.94, 0.93, 0.90, 0.88, 0.87, 0.85
  ];

  const LEAGUE_NAME = "Premier League";

  // A handful of recognizable real first-teamers per club (captain, star
  // striker, etc.) — not a full researched squad. These get slotted into
  // the matching position first; every remaining squad slot is filled by
  // the generator below. Rosters are a mid-2025-26-season snapshot and will
  // drift out of date as transfer windows happen — that's expected for a
  // hobby prototype, not a maintained database.
  const REAL_STARS = {
    "Arsenal": [
      { name: "David Raya", position: "GK" },
      { name: "William Saliba", position: "CD" }, { name: "Gabriel Magalhães", position: "CD" },
      { name: "Ben White", position: "FB" },
      { name: "Declan Rice", position: "DM" },
      { name: "Martin Ødegaard", position: "CM" },
      { name: "Bukayo Saka", position: "WG" },
      { name: "Viktor Gyökeres", position: "ST" }, { name: "Kai Havertz", position: "ST" }
    ],
    "Aston Villa": [
      { name: "Emiliano Martínez", position: "GK" },
      { name: "Ezri Konsa", position: "CD" },
      { name: "Matty Cash", position: "FB" },
      { name: "Boubacar Kamara", position: "DM" },
      { name: "John McGinn", position: "CM" },
      { name: "Morgan Rogers", position: "WG" },
      { name: "Ollie Watkins", position: "ST" }
    ],
    "Bournemouth": [
      { name: "Djordje Petrović", position: "GK" },
      { name: "Marcos Senesi", position: "CD" },
      { name: "Adrien Truffert", position: "FB" },
      { name: "Alex Scott", position: "CM" },
      { name: "Antoine Semenyo", position: "WG" },
      { name: "Evanilson", position: "ST" }
    ],
    "Brentford": [
      { name: "Mark Flekken", position: "GK" },
      { name: "Nathan Collins", position: "CD" },
      { name: "Keane Lewis-Potter", position: "FB" },
      { name: "Mikkel Damsgaard", position: "CM" },
      { name: "Kevin Schade", position: "WG" },
      { name: "Igor Thiago", position: "ST" }
    ],
    "Brighton & Hove Albion": [
      { name: "Bart Verbruggen", position: "GK" },
      { name: "Lewis Dunk", position: "CD" },
      { name: "Pervis Estupiñán", position: "FB" },
      { name: "Carlos Baleba", position: "CM" },
      { name: "Kaoru Mitoma", position: "WG" },
      { name: "Danny Welbeck", position: "ST" }
    ],
    "Burnley": [
      { name: "Maxime Estève", position: "CD" },
      { name: "Josh Cullen", position: "CM" },
      { name: "Jaidon Anthony", position: "WG" }
    ],
    "Chelsea": [
      { name: "Robert Sánchez", position: "GK" },
      { name: "Levi Colwill", position: "CD" }, { name: "Wesley Fofana", position: "CD" },
      { name: "Reece James", position: "FB" },
      { name: "Moisés Caicedo", position: "DM" },
      { name: "Enzo Fernández", position: "CM" },
      { name: "Pedro Neto", position: "WG" },
      { name: "Nicolas Jackson", position: "ST" }, { name: "João Pedro", position: "ST" }
    ],
    "Crystal Palace": [
      { name: "Dean Henderson", position: "GK" },
      { name: "Marc Guéhi", position: "CD" },
      { name: "Tyrick Mitchell", position: "FB" },
      { name: "Adam Wharton", position: "CM" },
      { name: "Eberechi Eze", position: "WG" },
      { name: "Jean-Philippe Mateta", position: "ST" }
    ],
    "Everton": [
      { name: "Jordan Pickford", position: "GK" },
      { name: "James Tarkowski", position: "CD" },
      { name: "Vitaliy Mykolenko", position: "FB" },
      { name: "Idrissa Gueye", position: "CM" },
      { name: "Iliman Ndiaye", position: "WG" },
      { name: "Beto", position: "ST" }
    ],
    "Fulham": [
      { name: "Bernd Leno", position: "GK" },
      { name: "Calvin Bassey", position: "CD" },
      { name: "Antonee Robinson", position: "FB" },
      { name: "Sander Berge", position: "CM" },
      { name: "Alex Iwobi", position: "WG" },
      { name: "Rodrigo Muniz", position: "ST" }
    ],
    "Leeds United": [
      { name: "Pascal Struijk", position: "CD" },
      { name: "Ethan Ampadu", position: "CM" },
      { name: "Daniel James", position: "WG" },
      { name: "Joel Piroe", position: "ST" }
    ],
    "Liverpool": [
      { name: "Alisson Becker", position: "GK" },
      { name: "Virgil van Dijk", position: "CD" }, { name: "Ibrahima Konaté", position: "CD" },
      { name: "Milos Kerkez", position: "FB" }, { name: "Conor Bradley", position: "FB" },
      { name: "Alexis Mac Allister", position: "DM" },
      { name: "Dominik Szoboszlai", position: "CM" },
      { name: "Mohamed Salah", position: "WG" }, { name: "Florian Wirtz", position: "WG" },
      { name: "Alexander Isak", position: "ST" }, { name: "Hugo Ekitike", position: "ST" }
    ],
    "Manchester City": [
      { name: "Gianluigi Donnarumma", position: "GK" },
      { name: "Rúben Dias", position: "CD" }, { name: "Joško Gvardiol", position: "CD" },
      { name: "Rico Lewis", position: "FB" },
      { name: "Rodri", position: "DM" },
      { name: "Nico González", position: "CM" }, { name: "Mateo Kovačić", position: "CM" },
      { name: "Jeremy Doku", position: "WG" }, { name: "Savinho", position: "WG" },
      { name: "Erling Haaland", position: "ST" }
    ],
    "Manchester United": [
      { name: "André Onana", position: "GK" },
      { name: "Matthijs de Ligt", position: "CD" }, { name: "Lisandro Martínez", position: "CD" },
      { name: "Diogo Dalot", position: "FB" }, { name: "Noussair Mazraoui", position: "FB" },
      { name: "Manuel Ugarte", position: "DM" },
      { name: "Bruno Fernandes", position: "CM" }, { name: "Casemiro", position: "CM" },
      { name: "Amad Diallo", position: "WG" },
      { name: "Benjamin Šeško", position: "ST" }, { name: "Rasmus Højlund", position: "ST" }
    ],
    "Newcastle United": [
      { name: "Nick Pope", position: "GK" },
      { name: "Sven Botman", position: "CD" }, { name: "Fabian Schär", position: "CD" },
      { name: "Kieran Trippier", position: "FB" }, { name: "Tino Livramento", position: "FB" },
      { name: "Bruno Guimarães", position: "DM" },
      { name: "Sandro Tonali", position: "CM" },
      { name: "Anthony Gordon", position: "WG" },
      { name: "Yoane Wissa", position: "ST" }
    ],
    "Nottingham Forest": [
      { name: "Matz Sels", position: "GK" },
      { name: "Murillo", position: "CD" },
      { name: "Neco Williams", position: "FB" },
      { name: "Elliot Anderson", position: "CM" },
      { name: "Callum Hudson-Odoi", position: "WG" },
      { name: "Chris Wood", position: "ST" }, { name: "Igor Jesus", position: "ST" }
    ],
    "Sunderland": [
      { name: "Anthony Patterson", position: "GK" },
      { name: "Granit Xhaka", position: "CM" },
      { name: "Wilson Isidor", position: "ST" }
    ],
    "Tottenham Hotspur": [
      { name: "Guglielmo Vicario", position: "GK" },
      { name: "Cristian Romero", position: "CD" }, { name: "Micky van de Ven", position: "CD" },
      { name: "Pedro Porro", position: "FB" }, { name: "Destiny Udogie", position: "FB" },
      { name: "Rodrigo Bentancur", position: "DM" },
      { name: "James Maddison", position: "CM" },
      { name: "Mohammed Kudus", position: "WG" },
      { name: "Dominic Solanke", position: "ST" }, { name: "Richarlison", position: "ST" }
    ],
    "West Ham United": [
      { name: "Alphonse Areola", position: "GK" },
      { name: "Max Kilman", position: "CD" }, { name: "Konstantinos Mavropanos", position: "CD" },
      { name: "Emerson", position: "FB" },
      { name: "Tomáš Souček", position: "CM" },
      { name: "Jarrod Bowen", position: "WG" },
      { name: "Niclas Füllkrug", position: "ST" }
    ],
    "Wolverhampton Wanderers": [
      { name: "José Sá", position: "GK" },
      { name: "Yerson Mosquera", position: "CD" },
      { name: "Matt Doherty", position: "FB" },
      { name: "João Gomes", position: "CM" },
      { name: "Jean-Ricner Bellegarde", position: "WG" },
      { name: "Jørgen Strand Larsen", position: "ST" }
    ]
  };

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
    CLUB_NAMES, CLUB_TIERS, LEAGUE_NAME, FIRST_NAMES, LAST_NAMES, REAL_STARS
  };

  global.FM = Object.assign(global.FM || {}, NS);
})(typeof window !== "undefined" ? window : global);
