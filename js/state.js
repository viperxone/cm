// state.js — orchestrates a full matchday and owns save/load.
(function (global) {
  "use strict";
  const FM = global.FM;
  const SAVE_KEY = "footballSimPrototype.save.v1";

  function newGame(userClubName) {
    const seed = Date.now() & 0xffffffff;
    const world = FM.generateWorld(seed, userClubName);
    const userClub = world.clubs.find(c => c.isUserClub);
    return {
      world,
      userClubId: userClub.id,
      inbox: [{
        id: "welcome",
        week: 0,
        type: "BOARD",
        title: "Welcome to " + userClub.name,
        body: "The board expects a " + FM.boardExpectation(userClub.tier).label.toLowerCase() +
          " this season. Set your tactics, pick your XI, and hit Continue when you're ready for matchday.",
        read: false
      }],
      lastReport: null,
      seasonComplete: false
    };
  }

  function userClub(state) {
    return state.world.clubs.find(c => c.id === state.userClubId);
  }

  function addMessage(state, msg) {
    state.inbox.unshift(Object.assign({ id: "m_" + Date.now() + "_" + Math.random(), read: false }, msg));
  }

  function matchSummaryLine(report, homeClub, awayClub) {
    return homeClub.name + " " + report.homeGoals + " - " + report.awayGoals + " " + awayClub.name;
  }

  // Advances the world by exactly one matchday: simulates every fixture in
  // the next unplayed week, applies all progression, and files inbox
  // messages for anything relevant to the user's club.
  function advanceMatchday(state) {
    if (state.seasonComplete) return state;
    const world = state.world;
    const nextWeek = world.fixtures.find(w => w.week === world.week + 1);
    if (!nextWeek) { state.seasonComplete = true; return state; }

    const rng = FM.mulberry32((world.seed + nextWeek.week * 7919) >>> 0);
    const uc = userClub(state);

    nextWeek.matches.forEach(m => {
      const home = world.clubs.find(c => c.id === m.home);
      const away = world.clubs.find(c => c.id === m.away);
      const report = FM.simulateMatch(rng, home, away, nextWeek.week);

      const resHome = FM.applyResultToTable(home, report.homeGoals, report.awayGoals);
      const resAway = FM.applyResultToTable(away, report.awayGoals, report.homeGoals);
      FM.updateMorale(home, resHome);
      FM.updateMorale(away, resAway);

      const playedIds = new Set(report.homeXI.concat(report.awayXI));
      FM.recoverNonPlayers(home, playedIds);
      FM.recoverNonPlayers(away, playedIds);

      if (home.id === uc.id || away.id === uc.id) {
        state.lastReport = { report, homeName: home.name, awayName: away.name };
        const goalScorers = report.events.filter(e => e.type === "GOAL")
          .map(e => e.player + " (" + e.minute + "')").join(", ") || "no goals";
        addMessage(state, {
          week: nextWeek.week, type: "MATCH",
          title: matchSummaryLine(report, home, away),
          body: "Scorers: " + goalScorers + ". " +
            (resHome === "W" && home.id === uc.id ? "A win to build on." :
              resAway === "W" && away.id === uc.id ? "A win to build on." :
                (resHome === "D") ? "A point earned." : "A defeat to respond to.")
        });

        const newInjuries = report.events.filter(e => e.type === "INJURY" &&
          [...home.players, ...away.players].some(p => p.id === e.playerId && p.state.injured));
        newInjuries.forEach(e => {
          const club = home.players.some(p => p.id === e.playerId) ? home : away;
          if (club.id !== uc.id) return;
          const p = club.players.find(pl => pl.id === e.playerId);
          addMessage(state, {
            week: nextWeek.week, type: "INJURY",
            title: p.name + " picks up an injury",
            body: p.name + " will be out for approximately " + p.state.weeksOut + " week(s)."
          });
        });
      }
    });

    world.clubs.forEach(c => FM.updateBoardConfidence(c, world.clubs));
    world.week = nextWeek.week;

    // Periodic board-mood check-in for the user's club.
    if (nextWeek.week % 4 === 0 || nextWeek.week === world.fixtures.length) {
      const rank = FM.standings(world.clubs).findIndex(c => c.id === uc.id) + 1;
      addMessage(state, {
        week: nextWeek.week, type: "BOARD",
        title: "Board update: " + FM.boardMoodLabel(uc.boardConfidence),
        body: "You currently sit " + rank + FM.ordinalSuffix(rank) + " in the " + FM.LEAGUE_NAME +
          ". The board is " + FM.boardMoodLabel(uc.boardConfidence).toLowerCase() + " with progress so far."
      });
    }

    if (nextWeek.week === world.fixtures.length) {
      state.seasonComplete = true;
      const rank = FM.standings(world.clubs).findIndex(c => c.id === uc.id) + 1;
      addMessage(state, {
        week: nextWeek.week, type: "SEASON",
        title: "Season complete!",
        body: "You finished " + rank + FM.ordinalSuffix(rank) + " in the " + FM.LEAGUE_NAME + " with " +
          uc.table.points + " points. Thanks for playing the prototype."
      });
    }

    return state;
  }

  function save(state) {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); return true; }
    catch (e) { console.error("Save failed", e); return false; }
  }
  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { console.error("Load failed", e); return null; }
  }
  function clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) {} }

  global.FM = Object.assign(global.FM || {}, {
    newGame, userClub, advanceMatchday, addMessage, save, load, clearSave,
    ordinalSuffix: function (n) {
      const s = ["th", "st", "nd", "rd"], v = n % 100;
      return s[(v - 20) % 10] || s[v] || s[0];
    }
  });
})(typeof window !== "undefined" ? window : global);
