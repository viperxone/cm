// engine.js — the actual simulation. Pure functions, no DOM.
(function (global) {
  "use strict";
  const FM = global.FM;

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function pick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }
  function weightedPick(rng, items, weightFn) {
    const weights = items.map(weightFn);
    const total = weights.reduce((a, b) => a + b, 0) || 1;
    let r = rng() * total;
    for (let i = 0; i < items.length; i++) { r -= weights[i]; if (r <= 0) return items[i]; }
    return items[items.length - 1];
  }

  // --- Role suitability (Lean v1 Spec §3.3) -------------------------------
  // RoleScore = sum(attribute_i * weight_i), 0-1 normalized, plus small
  // adjustments for current form and fitness so the number reflects a
  // player's *current* usefulness, not just their raw ability.
  function roleScore(player) {
    const weights = FM.ROLES[player.position][player.role];
    let raw = 0;
    for (const attr in weights) raw += (player.attributes[attr] / 20) * weights[attr];
    const formAvg = avg(player.state.formHistory);
    const formAdj = (formAvg - 6.0) * 0.015;           // small nudge, +/- form
    const fitnessAdj = ((player.state.condition - 100) / 100) * 0.05; // tired players score slightly lower
    return clamp(raw + formAdj + fitnessAdj, 0, 1);
  }

  function overall(player) { return Math.round(roleScore(player) * 100); }

  function avg(arr) { return arr.reduce((a, b) => a + b, 0) / arr.length; }

  function isAvailable(player) { return !player.state.injured && !player.state.suspended; }

  // --- Team selection ------------------------------------------------------
  // Greedy best-fit XI for a formation: fill each slot with the highest
  // roleScore available player of a matching position, falling back to
  // adjacent positions if a slot family runs dry.
  function pickBestXI(club, formationId) {
    const slots = FM.FORMATIONS[formationId] || FM.FORMATIONS["4-4-2"];
    const pool = club.players.filter(isAvailable).slice()
      .sort((a, b) => roleScore(b) - roleScore(a));
    const used = new Set();
    const xi = [];

    slots.forEach(slotPos => {
      const fallbacks = FM.POSITION_FALLBACK[slotPos];
      let chosen = null;
      for (const fp of fallbacks) {
        chosen = pool.find(p => !used.has(p.id) && p.position === fp);
        if (chosen) break;
      }
      if (!chosen) chosen = pool.find(p => !used.has(p.id)); // absolute last resort
      if (chosen) { used.add(chosen.id); xi.push({ slot: slotPos, player: chosen }); }
    });
    return xi; // array of { slot, player }, length <= 11
  }

  // --- Team strength (Lean v1 Spec §6.1) -----------------------------------
  const ATTACK_WEIGHTS = { Shooting: 0.30, Dribbling: 0.25, Passing: 0.25, Pace: 0.20 };
  const DEFENSE_WEIGHTS = { Tackling: 0.30, Positioning: 0.30, Strength: 0.20, Decisions: 0.20 };
  const REFERENCE = 0.5; // roughly what an average (attr~10-11/20) team scores

  function weightedAttr(player, weights) {
    let s = 0;
    for (const attr in weights) s += (player.attributes[attr] / 20) * weights[attr];
    return s;
  }

  function tacticMultipliers(tactics) {
    let atk = 1.0, def = 1.0, staminaCost = 1.0;
    if (tactics.mentality === "Attacking") { atk *= 1.08; def *= 0.92; }
    if (tactics.mentality === "Defensive") { atk *= 0.92; def *= 1.08; }
    if (tactics.pressing === "High") { atk *= 1.04; def *= 0.97; staminaCost *= 1.25; }
    if (tactics.pressing === "Low") { def *= 1.03; atk *= 0.98; staminaCost *= 0.85; }
    if (tactics.tempo === "Fast") { atk *= 1.03; def *= 0.98; staminaCost *= 1.10; }
    if (tactics.tempo === "Slow") { def *= 1.02; atk *= 0.98; staminaCost *= 0.92; }
    return { atk, def, staminaCost };
  }

  function teamIndices(club, xi, isHome) {
    const outfield = xi.filter(s => s.slot !== "GK").map(s => s.player);
    const gk = xi.find(s => s.slot === "GK");

    let attackRaw = outfield.length ? avg(outfield.map(p => weightedAttr(p, ATTACK_WEIGHTS))) : 0.3;
    let defenseRaw = outfield.length ? avg(outfield.map(p => weightedAttr(p, DEFENSE_WEIGHTS))) : 0.3;

    if (gk) {
      const gkFactor = weightedAttr(gk.player, { Composure: 0.34, Decisions: 0.33, Positioning: 0.33 });
      defenseRaw *= (0.7 + 0.6 * gkFactor);
    }

    const conditionMult = 0.88 + 0.17 * (avg(xi.map(s => s.player.state.condition)) / 100);
    const { atk: tacAtk, def: tacDef } = tacticMultipliers(club.tactics);

    const recentForm = club.form.slice(-5);
    const formPts = recentForm.reduce((s, r) => s + (r === "W" ? 1 : r === "D" ? 0 : -1), 0);
    const formMult = 1 + clamp(formPts * 0.015, -0.08, 0.08);

    const homeMult = isHome ? 1.05 : 1.0;

    const attackIndex = (attackRaw * tacAtk * conditionMult * formMult * homeMult) / REFERENCE;
    const defenseIndex = (defenseRaw * tacDef * conditionMult * formMult * (isHome ? 1.03 : 1.0)) / REFERENCE;

    return { attackIndex: Math.max(0.15, attackIndex), defenseIndex: Math.max(0.15, defenseIndex) };
  }

  // --- Match simulation ------------------------------------------------------
  function poissonSample(rng, lambda) {
    const L = Math.exp(-lambda);
    let k = 0, p = 1;
    do { k++; p *= rng(); } while (p > L);
    return k - 1;
  }

  const COMMENTARY = {
    GOAL: [
      "{p} finishes clinically from close range!",
      "{p} curls a brilliant strike into the top corner!",
      "{p} taps in after a scramble in the box!",
      "{p} rises highest to head home from a corner!",
      "A stunning long-range effort from {p} flies in!"
    ],
    SHOT_SAVED: [
      "{p}'s effort is well saved by {gk}.",
      "{gk} pushes {p}'s drive around the post.",
      "{p} forces a smart stop from {gk}."
    ],
    SHOT_WIDE: [
      "{p} drags the shot wide of the post.",
      "{p}'s effort flies over the bar."
    ],
    CARD: [
      "{p} is shown a yellow card for a late challenge.",
      "{p} picks up a booking for dissent."
    ],
    INJURY: [
      "{p} goes down injured and needs treatment.",
      "{p} pulls up with what looks like a muscle problem."
    ],
    KEY_PASS: [
      "{p} threads a lovely pass through the defense.",
      "{p} whips in a dangerous cross."
    ]
  };

  function fillTemplate(tpl, vars) {
    return tpl.replace(/\{(\w+)\}/g, (_, k) => vars[k] || "");
  }

  function attackWeight(p) { return p.slot === "ST" ? 3 : p.slot === "AM" || p.slot === "WG" ? 2 : 1; }

  // Simulates one fixture. Mutates player state objects in place (condition,
  // injuries, cards, form, morale) and returns a full match report.
  function simulateMatch(rng, homeClub, awayClub, weekNumber) {
    const homeXI = pickBestXI(homeClub, homeClub.tactics.formation);
    const awayXI = pickBestXI(awayClub, awayClub.tactics.formation);

    const hi = teamIndices(homeClub, homeXI, true);
    const ai = teamIndices(awayClub, awayXI, false);

    const xgHome = clamp(1.35 * (hi.attackIndex / ai.defenseIndex), 0.15, 4.5);
    const xgAway = clamp(1.05 * (ai.attackIndex / hi.defenseIndex), 0.15, 4.5);

    const homeGoals = poissonSample(rng, xgHome);
    const awayGoals = poissonSample(rng, xgAway);

    // --- Build the event feed ---
    const events = [];
    const homeGK = homeXI.find(s => s.slot === "GK");
    const awayGK = awayXI.find(s => s.slot === "GK");

    function addEvent(minute, type, team, playerSlot, extra) {
      const gkSlot = team === "home" ? awayGK : homeGK;
      const vars = {
        p: playerSlot ? playerSlot.player.name : "",
        gk: gkSlot ? gkSlot.player.name : "Keeper"
      };
      events.push({
        minute, type, team,
        player: playerSlot ? playerSlot.player.name : null,
        playerId: playerSlot ? playerSlot.player.id : null,
        text: fillTemplate(pick(rng, COMMENTARY[type]), vars),
        ...extra
      });
    }

    // Guarantee a goal event for every actual goal scored.
    const usedMinutes = new Set();
    function freeMinute() {
      let m; do { m = 1 + Math.floor(rng() * 90); } while (usedMinutes.has(m));
      usedMinutes.add(m); return m;
    }

    for (let i = 0; i < homeGoals; i++) {
      const scorer = weightedPick(rng, homeXI.filter(s => s.slot !== "GK"), attackWeight);
      addEvent(freeMinute(), "GOAL", "home", scorer);
    }
    for (let i = 0; i < awayGoals; i++) {
      const scorer = weightedPick(rng, awayXI.filter(s => s.slot !== "GK"), attackWeight);
      addEvent(freeMinute(), "GOAL", "away", scorer);
    }

    // Fill in flavor events.
    const flavorCount = clamp(Math.round((xgHome + xgAway) * 3 + rng() * 4), 5, 14);
    for (let i = 0; i < flavorCount; i++) {
      const team = rng() < 0.5 ? "home" : "away";
      const xi = team === "home" ? homeXI : awayXI;
      const roll = rng();
      let type;
      if (roll < 0.38) type = "SHOT_SAVED";
      else if (roll < 0.55) type = "SHOT_WIDE";
      else if (roll < 0.75) type = "KEY_PASS";
      else if (roll < 0.90) type = "CARD";
      else type = "INJURY";

      const outfield = xi.filter(s => s.slot !== "GK");
      const isAttacking = type === "SHOT_SAVED" || type === "SHOT_WIDE" || type === "KEY_PASS";
      const subject = isAttacking
        ? weightedPick(rng, outfield, attackWeight)
        : pick(rng, outfield);
      if (!subject) continue;

      addEvent(freeMinute(), type, team, subject);

      if (type === "CARD") {
        subject.player.state.yellowCards++;
        if (subject.player.state.yellowCards >= 5) {
          subject.player.state.suspended = true;
          subject.player.state.yellowCards = 0;
        }
      }
      if (type === "INJURY") {
        const risk = 0.35 * subject.player.hidden.injuryProneness;
        if (rng() < risk) {
          subject.player.state.injured = true;
          subject.player.state.weeksOut = 1 + Math.floor(rng() * 4);
        }
      }
    }
    events.sort((a, b) => a.minute - b.minute);

    // --- Ratings ---
    function rateXI(xi, team, goalsFor, goalsAgainst) {
      return xi.map(s => {
        const p = s.player;
        const goalEvents = events.filter(e => e.playerId === p.id && e.type === "GOAL").length;
        const keyPassEvents = events.filter(e => e.playerId === p.id && e.type === "KEY_PASS").length;
        const cardEvents = events.filter(e => e.playerId === p.id && e.type === "CARD").length;
        let rating = 6.0 + goalEvents * 1.4 + keyPassEvents * 0.3 - cardEvents * 0.5;
        if (s.slot === "GK") rating += clamp((2 - goalsAgainst) * 0.35, -1.2, 1.2);
        const jitter = (rng() * 2 - 1) * (1 - p.hidden.consistency) * 1.5;
        rating = clamp(rating + jitter, 3.0, 10.0);
        return { playerId: p.id, name: p.name, slot: s.slot, rating: Math.round(rating * 10) / 10 };
      });
    }
    const homeRatings = rateXI(homeXI, "home", homeGoals, awayGoals);
    const awayRatings = rateXI(awayXI, "away", awayGoals, homeGoals);

    // --- Apply progression side-effects (condition, form) ---
    function applyProgression(xi, ratings) {
      xi.forEach(s => {
        const p = s.player;
        p.state.condition = clamp(p.state.condition - (18 + Math.round(rng() * 8)), 20, 100);
        const r = ratings.find(x => x.playerId === p.id);
        if (r) {
          p.state.formHistory.push(r.rating);
          if (p.state.formHistory.length > 5) p.state.formHistory.shift();
        }
      });
    }
    applyProgression(homeXI, homeRatings);
    applyProgression(awayXI, awayRatings);

    return {
      week: weekNumber,
      homeClubId: homeClub.id, awayClubId: awayClub.id,
      homeGoals, awayGoals, events,
      homeRatings, awayRatings,
      homeXI: homeXI.map(s => s.player.id), awayXI: awayXI.map(s => s.player.id)
    };
  }

  // --- Progression that applies club-wide, once per matchday -----------------
  function applyResultToTable(club, goalsFor, goalsAgainst) {
    const t = club.table;
    t.played++; t.gf += goalsFor; t.ga += goalsAgainst;
    let res;
    if (goalsFor > goalsAgainst) { t.won++; t.points += 3; res = "W"; }
    else if (goalsFor === goalsAgainst) { t.drawn++; t.points += 1; res = "D"; }
    else { t.lost++; res = "L"; }
    club.form.push(res);
    if (club.form.length > 5) club.form.shift();
    return res;
  }

  function updateMorale(club, result) {
    const delta = result === "W" ? 4 : result === "D" ? 0 : -4;
    club.players.forEach(p => {
      p.state.morale = clamp(p.state.morale + delta + Math.round(Math.random() * 4 - 2), 0, 100);
    });
  }

  function recoverNonPlayers(club, playedIds) {
    club.players.forEach(p => {
      if (!playedIds.has(p.id)) {
        p.state.condition = clamp(p.state.condition + 12, 0, 100);
      }
      if (p.state.injured) {
        p.state.weeksOut--;
        if (p.state.weeksOut <= 0) { p.state.injured = false; p.state.weeksOut = 0; }
      }
    });
  }

  function standings(clubs) {
    return clubs.slice().sort((a, b) => {
      if (b.table.points !== a.table.points) return b.table.points - a.table.points;
      const gdA = a.table.gf - a.table.ga, gdB = b.table.gf - b.table.ga;
      if (gdB !== gdA) return gdB - gdA;
      return b.table.gf - a.table.gf;
    });
  }

  function boardExpectation(tier) {
    if (tier >= 1.08) return { label: "Title challenge", targetRank: 2 };
    if (tier >= 0.98) return { label: "Top half finish", targetRank: 5 };
    if (tier >= 0.90) return { label: "Mid-table finish", targetRank: 7 };
    return { label: "Avoid relegation trouble", targetRank: 9 };
  }

  function boardMoodLabel(confidence) {
    if (confidence >= 75) return "Delighted";
    if (confidence >= 55) return "Satisfied";
    if (confidence >= 35) return "Concerned";
    return "Furious";
  }

  function updateBoardConfidence(club, allClubs) {
    const rank = standings(allClubs).findIndex(c => c.id === club.id) + 1;
    const target = boardExpectation(club.tier).targetRank;
    const delta = clamp((target - rank) * 0.5, -4, 4);
    club.boardConfidence = clamp(club.boardConfidence + delta, 0, 100);
  }

  global.FM = Object.assign(global.FM || {}, {
    roleScore, overall, isAvailable, pickBestXI, teamIndices, tacticMultipliers,
    simulateMatch, applyResultToTable, updateMorale, recoverNonPlayers,
    standings, boardExpectation, boardMoodLabel, updateBoardConfidence,
    poissonSample
  });
})(typeof window !== "undefined" ? window : global);
