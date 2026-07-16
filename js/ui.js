// ui.js — every function here touches the DOM. Data/logic lives elsewhere.
(function (global) {
  "use strict";
  const FM = global.FM;

  function el(tag, opts) {
    const e = document.createElement(tag);
    opts = opts || {};
    if (opts.cls) e.className = opts.cls;
    if (opts.text !== undefined) e.textContent = opts.text;
    if (opts.html !== undefined) e.innerHTML = opts.html;
    if (opts.attrs) for (const k in opts.attrs) e.setAttribute(k, opts.attrs[k]);
    if (opts.on) for (const k in opts.on) e.addEventListener(k, opts.on[k]);
    if (opts.children) opts.children.forEach(c => c && e.appendChild(c));
    return e;
  }

  function conditionClass(v) { return v >= 75 ? "ok" : v >= 45 ? "warn" : "bad"; }
  function moraleClass(v) { return v >= 65 ? "ok" : v >= 40 ? "warn" : "bad"; }

  // --- Header strip: club identity, week, form guide ------------------------
  function renderHeader(state) {
    const uc = FM.userClub(state);
    const rank = FM.standings(state.world.clubs).findIndex(c => c.id === uc.id) + 1;
    const totalWeeks = state.world.fixtures.length;

    const formSquares = el("div", { cls: "form-guide" });
    uc.form.forEach(r => formSquares.appendChild(el("span", { cls: "form-pip " + r.toLowerCase(), text: r })));

    return el("header", { cls: "app-header", children: [
      el("div", { cls: "club-identity", children: [
        el("div", { cls: "crest", text: uc.name.slice(0, 2).toUpperCase() }),
        el("div", { children: [
          el("div", { cls: "club-name", text: uc.name }),
          el("div", { cls: "league-name", text: FM.LEAGUE_NAME + " · Week " + state.world.week + " / " + totalWeeks })
        ]})
      ]}),
      el("div", { cls: "header-stats", children: [
        el("div", { cls: "stat-block", children: [
          el("div", { cls: "stat-value", text: "#" + rank }),
          el("div", { cls: "stat-label", text: "Position" })
        ]}),
        el("div", { cls: "stat-block", children: [
          el("div", { cls: "stat-value", text: String(uc.table.points) }),
          el("div", { cls: "stat-label", text: "Points" })
        ]}),
        el("div", { cls: "stat-block", children: [
          el("div", { cls: "stat-value board-" + conditionClass(uc.boardConfidence), text: FM.boardMoodLabel(uc.boardConfidence) }),
          el("div", { cls: "stat-label", text: "Board mood" })
        ]}),
        formSquares
      ]})
    ]});
  }

  // --- Dashboard / Inbox ------------------------------------------------------
  function renderDashboard(state) {
    const wrap = el("div", { cls: "screen" });
    wrap.appendChild(el("h1", { cls: "screen-title", text: "Inbox" }));

    if (state.seasonComplete) {
      wrap.appendChild(el("div", { cls: "banner banner-season", text: "Season complete — check the final table on the Fixtures screen." }));
    }

    const list = el("div", { cls: "inbox-list" });
    if (!state.inbox.length) {
      list.appendChild(el("div", { cls: "empty-state", text: "Nothing yet — hit Continue to play your first matchday." }));
    }
    state.inbox.forEach(msg => {
      list.appendChild(el("div", { cls: "inbox-item type-" + msg.type.toLowerCase(), children: [
        el("div", { cls: "inbox-meta", text: (msg.week ? "Week " + msg.week : "Pre-season") + " · " + msg.type }),
        el("div", { cls: "inbox-title", text: msg.title }),
        el("div", { cls: "inbox-body", text: msg.body })
      ]}));
    });
    wrap.appendChild(list);
    return wrap;
  }

  // --- Squad ------------------------------------------------------------------
  function renderSquad(state) {
    const uc = FM.userClub(state);
    const wrap = el("div", { cls: "screen" });
    wrap.appendChild(el("h1", { cls: "screen-title", text: "Squad" }));

    const table = el("table", { cls: "data-table" });
    const head = el("tr", { children: [
      "Name", "Pos", "Role", "Age", "Ovr", "Condition", "Morale", "Form", "Contract", "Status"
    ].map(h => el("th", { text: h })) });
    table.appendChild(el("thead", { children: [head] }));

    const tbody = el("tbody");
    uc.players.slice()
      .sort((a, b) => FM.POSITIONS.indexOf(a.position) - FM.POSITIONS.indexOf(b.position) || FM.overall(b) - FM.overall(a))
      .forEach(p => {
        const formAvg = (p.state.formHistory.reduce((a, b) => a + b, 0) / p.state.formHistory.length).toFixed(1);
        let status = "Available";
        let statusCls = "ok";
        if (p.state.injured) { status = "Injured (" + p.state.weeksOut + "w)"; statusCls = "bad"; }
        else if (p.state.suspended) { status = "Suspended"; statusCls = "bad"; }

        tbody.appendChild(el("tr", { children: [
          el("td", { cls: "name-cell", text: p.name }),
          el("td", { text: p.position }),
          el("td", { text: p.role }),
          el("td", { text: String(p.age) }),
          el("td", { cls: "num", text: String(FM.overall(p)) }),
          el("td", { cls: "num pip " + conditionClass(p.state.condition), text: p.state.condition }),
          el("td", { cls: "num pip " + moraleClass(p.state.morale), text: p.state.morale }),
          el("td", { cls: "num", text: formAvg }),
          el("td", { cls: "num", text: p.contractYears + "y" }),
          el("td", { cls: "pip " + statusCls, text: status })
        ]}));
      });
    table.appendChild(tbody);
    wrap.appendChild(table);
    return wrap;
  }

  // --- Tactics ------------------------------------------------------------------
  function renderTactics(state, onChange) {
    const uc = FM.userClub(state);
    const wrap = el("div", { cls: "screen" });
    wrap.appendChild(el("h1", { cls: "screen-title", text: "Tactics" }));

    const controls = el("div", { cls: "tactics-controls" });

    function select(label, options, current, key) {
      const s = el("select", { on: { change: (e) => { uc.tactics[key] = e.target.value; onChange(); } } });
      options.forEach(o => {
        const opt = el("option", { text: o, attrs: { value: o } });
        if (o === current) opt.selected = true;
        s.appendChild(opt);
      });
      return el("label", { cls: "field", children: [el("span", { text: label }), s] });
    }

    controls.appendChild(select("Formation", Object.keys(FM.FORMATIONS), uc.tactics.formation, "formation"));
    controls.appendChild(select("Mentality", FM.MENTALITIES, uc.tactics.mentality, "mentality"));
    controls.appendChild(select("Pressing", FM.PRESSING, uc.tactics.pressing, "pressing"));
    controls.appendChild(select("Tempo", FM.TEMPO, uc.tactics.tempo, "tempo"));
    wrap.appendChild(controls);

    const xi = FM.pickBestXI(uc, uc.tactics.formation);
    const noWidth = uc.tactics.formation === "4-5-1" ? false :
      !xi.some(s => s.slot === "WG");
    if (noWidth) {
      wrap.appendChild(el("div", { cls: "banner banner-warn",
        text: "Your side lacks natural width — crosses will be rare with this shape." }));
    }

    wrap.appendChild(el("p", { cls: "hint-text",
      text: "Pick your starting XI for this formation on the Lineup tab." }));
    return wrap;
  }

  // --- Fixtures / Table ------------------------------------------------------
  function renderFixtures(state) {
    const wrap = el("div", { cls: "screen" });
    wrap.appendChild(el("h1", { cls: "screen-title", text: "League Table" }));

    const table = el("table", { cls: "data-table" });
    table.appendChild(el("thead", { children: [el("tr", { children: [
      "#", "Club", "P", "W", "D", "L", "GF", "GA", "GD", "Pts"
    ].map(h => el("th", { text: h })) })]}));
    const tbody = el("tbody");
    FM.standings(state.world.clubs).forEach((c, i) => {
      const row = el("tr", { cls: c.isUserClub ? "user-row" : "", children: [
        el("td", { text: String(i + 1) }),
        el("td", { cls: "name-cell", text: c.name }),
        el("td", { cls: "num", text: c.table.played }),
        el("td", { cls: "num", text: c.table.won }),
        el("td", { cls: "num", text: c.table.drawn }),
        el("td", { cls: "num", text: c.table.lost }),
        el("td", { cls: "num", text: c.table.gf }),
        el("td", { cls: "num", text: c.table.ga }),
        el("td", { cls: "num", text: c.table.gf - c.table.ga }),
        el("td", { cls: "num strong", text: c.table.points })
      ]});
      tbody.appendChild(row);
    });
    table.appendChild(tbody);
    wrap.appendChild(table);

    const uc = FM.userClub(state);
    const target = FM.boardExpectation(uc.tier);
    wrap.appendChild(el("p", { cls: "hint-text", text: "Board expectation: " + target.label + "." }));

    wrap.appendChild(el("h2", { cls: "section-title", text: "Upcoming fixtures" }));
    const upcoming = state.world.fixtures.filter(w => w.week > state.world.week).slice(0, 5);
    const flist = el("div", { cls: "fixture-list" });
    upcoming.forEach(w => {
      const m = w.matches.find(mm => mm.home === uc.id || mm.away === uc.id);
      if (!m) return;
      const home = state.world.clubs.find(c => c.id === m.home);
      const away = state.world.clubs.find(c => c.id === m.away);
      flist.appendChild(el("div", { cls: "fixture-row", text: "Week " + w.week + ":  " + home.name + " vs " + away.name }));
    });
    if (!upcoming.length) flist.appendChild(el("div", { cls: "empty-state", text: "No more fixtures — season is complete." }));
    wrap.appendChild(flist);
    return wrap;
  }

  // --- Matchday (last report) --------------------------------------------------
  function renderMatchday(state) {
    const wrap = el("div", { cls: "screen" });
    wrap.appendChild(el("h1", { cls: "screen-title", text: "Last Matchday" }));

    if (!state.lastReport) {
      wrap.appendChild(el("div", { cls: "empty-state", text: "No match played yet — hit Continue." }));
      return wrap;
    }
    const { report, homeName, awayName } = state.lastReport;
    wrap.appendChild(el("div", { cls: "scoreline", text: homeName + "  " + report.homeGoals + " – " + report.awayGoals + "  " + awayName }));

    const feed = el("div", { cls: "event-feed" });
    report.events.forEach(e => {
      feed.appendChild(el("div", { cls: "event-row type-" + e.type.toLowerCase() + " team-" + e.team, children: [
        el("span", { cls: "event-minute", text: e.minute + "'" }),
        el("span", { cls: "event-text", text: e.text })
      ]}));
    });
    wrap.appendChild(feed);

    wrap.appendChild(el("h2", { cls: "section-title", text: "Ratings" }));
    const ratingsWrap = el("div", { cls: "ratings-grid" });
    [["Home", report.homeRatings], ["Away", report.awayRatings]].forEach(([label, ratings]) => {
      const col = el("div", { cls: "ratings-col" });
      col.appendChild(el("h3", { text: label }));
      ratings.sort((a, b) => b.rating - a.rating).forEach(r => {
        col.appendChild(el("div", { cls: "rating-row", children: [
          el("span", { text: r.name + " (" + r.slot + ")" }),
          el("span", { cls: "rating-num", text: r.rating.toFixed(1) })
        ]}));
      });
      ratingsWrap.appendChild(col);
    });
    wrap.appendChild(ratingsWrap);
    return wrap;
  }

  // --- Transfers (stub) --------------------------------------------------------
  function renderTransfersStub() {
    const wrap = el("div", { cls: "screen" });
    wrap.appendChild(el("h1", { cls: "screen-title", text: "Transfers" }));
    wrap.appendChild(el("div", { cls: "empty-state",
      text: "Not in this prototype slice. See the Lean v1 Spec §7 for the planned two-stage bid/contract flow." }));
    return wrap;
  }

  // --- Lineup (manual XI selection) --------------------------------------
  function formAvg(p) {
    return (p.state.formHistory.reduce((a, b) => a + b, 0) / p.state.formHistory.length).toFixed(1);
  }

  function playerOptionLabel(p) {
    let flag = "";
    if (p.state.injured) flag = " [INJURED]";
    else if (p.state.suspended) flag = " [SUSPENDED]";
    return p.name + " \u2014 " + p.position + "/" + p.role + " \u2014 Ovr " + FM.overall(p) +
      " \u2014 Cond " + p.state.condition + " \u2014 Form " + formAvg(p) + flag;
  }

  function renderLineup(state, onChange) {
    const uc = FM.userClub(state);
    const wrap = el("div", { cls: "screen" });
    wrap.appendChild(el("h1", { cls: "screen-title", text: "Lineup" }));

    const formationField = el("label", { cls: "field", children: [
      el("span", { text: "Formation" }),
      (() => {
        const s = el("select", { on: { change: (e) => { uc.tactics.formation = e.target.value; onChange(); } } });
        Object.keys(FM.FORMATIONS).forEach(f => {
          const opt = el("option", { text: f, attrs: { value: f } });
          if (f === uc.tactics.formation) opt.selected = true;
          s.appendChild(opt);
        });
        return s;
      })()
    ]});
    const controlsRow = el("div", { cls: "tactics-controls", children: [
      formationField,
      el("button", { cls: "ghost-btn", text: "Reset to auto-pick", on: { click: () => { uc.lineup = null; onChange(); } } })
    ]});
    wrap.appendChild(controlsRow);

    const formation = uc.tactics.formation;
    const slots = FM.FORMATIONS[formation];
    const xi = FM.pickBestXI(uc, formation); // effective XI right now (manual + auto-fill blend)
    const usedIds = new Set(xi.map(s => s.player.id));

    if (!uc.lineup || uc.lineup.formation !== formation) {
      wrap.appendChild(el("div", { cls: "banner banner-warn",
        text: "Showing the auto-picked best XI. Change any slot below to set your own lineup for the next matchday." }));
    }

    const table = el("table", { cls: "data-table lineup-table" });
    table.appendChild(el("thead", { children: [el("tr", { children: [
      "Slot", "Player", "Condition", "Form"
    ].map(h => el("th", { text: h })) })]}));
    const tbody = el("tbody");

    slots.forEach((slotPos, idx) => {
      const currentPlayer = xi.find(s => s.slotIndex === idx);
      const eligiblePool = uc.players.filter(p => {
        if (!FM.isAvailable(p)) return false;
        if (slotPos === "GK") return p.position === "GK";
        return p.position !== "GK";
      }).filter(p => !usedIds.has(p.id) || (currentPlayer && currentPlayer.player.id === p.id))
        .sort((a, b) => FM.roleScore(b) - FM.roleScore(a));

      const select = el("select", { on: { change: (e) => {
        if (!uc.lineup || uc.lineup.formation !== formation) uc.lineup = { formation, assignments: {} };
        uc.lineup.assignments[idx] = e.target.value || null;
        onChange();
      }}});
      select.appendChild(el("option", { text: "\u2014 auto \u2014", attrs: { value: "" } }));
      eligiblePool.forEach(p => {
        const opt = el("option", { text: playerOptionLabel(p), attrs: { value: p.id } });
        if (currentPlayer && currentPlayer.player.id === p.id) opt.selected = true;
        select.appendChild(opt);
      });

      const cp = currentPlayer ? currentPlayer.player : null;
      tbody.appendChild(el("tr", { children: [
        el("td", { text: slotPos + " #" + (slots.slice(0, idx + 1).filter(s => s === slotPos).length) }),
        el("td", { cls: "name-cell", children: [select] }),
        el("td", { cls: "num pip " + (cp ? conditionClass(cp.state.condition) : ""), text: cp ? cp.state.condition : "\u2014" }),
        el("td", { cls: "num", text: cp ? formAvg(cp) : "\u2014" })
      ]}));
    });
    table.appendChild(tbody);
    wrap.appendChild(table);

    wrap.appendChild(el("p", { cls: "hint-text",
      text: "If a selected player becomes injured or suspended before matchday, the engine automatically fills that slot from your best available option." }));

    const bench = uc.players.filter(p => !usedIds.has(p.id));
    wrap.appendChild(el("h2", { cls: "section-title", text: "Bench / unavailable (" + bench.length + ")" }));
    const benchList = el("div", { cls: "fixture-list" });
    bench.forEach(p => {
      benchList.appendChild(el("div", { cls: "fixture-row", text: playerOptionLabel(p) }));
    });
    wrap.appendChild(benchList);
    return wrap;
  }

  // --- Matchday: animated playback (used right after Continue) ---------------
  function renderMatchdayAnimated(state, opts) {
    opts = opts || {};
    const wrap = el("div", { cls: "screen" });
    wrap.appendChild(el("h1", { cls: "screen-title", text: "Matchday" }));

    if (!state.lastReport) {
      wrap.appendChild(el("div", { cls: "empty-state", text: "No match played yet — hit Continue." }));
      return { screenEl: wrap, start: () => null };
    }
    const { report, homeName, awayName } = state.lastReport;

    const scoreEl = el("div", { cls: "scoreline", text: homeName + "  0 \u2013 0  " + awayName });
    wrap.appendChild(scoreEl);

    const skipBtn = el("button", { cls: "ghost-btn skip-btn", text: "Skip to full-time \u23ED" });
    wrap.appendChild(skipBtn);

    const feed = el("div", { cls: "event-feed" });
    wrap.appendChild(feed);

    const ratingsContainer = el("div");
    wrap.appendChild(ratingsContainer);

    let idx = 0, homeGoals = 0, awayGoals = 0, timer = null, done = false;

    function appendEvent(e) {
      if (e.type === "GOAL") {
        if (e.team === "home") homeGoals++; else awayGoals++;
        scoreEl.textContent = homeName + "  " + homeGoals + " \u2013 " + awayGoals + "  " + awayName;
        scoreEl.classList.add("scoreline-pulse");
        setTimeout(() => scoreEl.classList.remove("scoreline-pulse"), 500);
      }
      feed.appendChild(el("div", { cls: "event-row type-" + e.type.toLowerCase() + " team-" + e.team, children: [
        el("span", { cls: "event-minute", text: e.minute + "'" }),
        el("span", { cls: "event-text", text: e.text })
      ]}));
      feed.scrollTop = feed.scrollHeight;
    }

    function renderRatings() {
      ratingsContainer.appendChild(el("h2", { cls: "section-title", text: "Full-time \u2014 Ratings" }));
      const ratingsWrap = el("div", { cls: "ratings-grid" });
      [["Home", report.homeRatings], ["Away", report.awayRatings]].forEach(([label, ratings]) => {
        const col = el("div", { cls: "ratings-col" });
        col.appendChild(el("h3", { text: label }));
        ratings.slice().sort((a, b) => b.rating - a.rating).forEach(r => {
          col.appendChild(el("div", { cls: "rating-row", children: [
            el("span", { text: r.name + " (" + r.slot + ")" }),
            el("span", { cls: "rating-num", text: r.rating.toFixed(1) })
          ]}));
        });
        ratingsWrap.appendChild(col);
      });
      ratingsContainer.appendChild(ratingsWrap);
    }

    function finish() {
      if (done) return;
      done = true;
      if (timer) clearInterval(timer);
      for (; idx < report.events.length; idx++) appendEvent(report.events[idx]);
      scoreEl.textContent = homeName + "  " + report.homeGoals + " \u2013 " + report.awayGoals + "  " + awayName;
      renderRatings();
      skipBtn.style.display = "none";
      if (opts.onDone) opts.onDone();
    }

    skipBtn.addEventListener("click", finish);

    function start() {
      timer = setInterval(() => {
        if (idx >= report.events.length) { finish(); return; }
        appendEvent(report.events[idx]);
        idx++;
      }, 550);
      return timer;
    }

    return { screenEl: wrap, start };
  }

  global.FM = Object.assign(global.FM || {}, {
    el, renderHeader, renderDashboard, renderSquad, renderTactics,
    renderFixtures, renderMatchday, renderTransfersStub, renderLineup, renderMatchdayAnimated
  });
})(typeof window !== "undefined" ? window : global);
