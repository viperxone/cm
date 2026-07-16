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

    wrap.appendChild(el("h2", { cls: "section-title", text: "Projected starting XI (auto-picked, best fit per slot)" }));
    const table = el("table", { cls: "data-table" });
    table.appendChild(el("thead", { children: [el("tr", { children: [
      "Slot", "Player", "Role", "Suitability", "Condition"
    ].map(h => el("th", { text: h })) })]}));
    const tbody = el("tbody");
    xi.forEach(s => {
      tbody.appendChild(el("tr", { children: [
        el("td", { text: s.slot }),
        el("td", { cls: "name-cell", text: s.player.name }),
        el("td", { text: s.player.role }),
        el("td", { cls: "num", text: FM.overall(s.player) }),
        el("td", { cls: "num pip " + conditionClass(s.player.state.condition), text: s.player.state.condition })
      ]}));
    });
    table.appendChild(tbody);
    wrap.appendChild(table);
    wrap.appendChild(el("p", { cls: "hint-text",
      text: "Team selection is automatic in this prototype — it always fields your best available XI for the chosen formation." }));
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

  global.FM = Object.assign(global.FM || {}, {
    el, renderHeader, renderDashboard, renderSquad, renderTactics,
    renderFixtures, renderMatchday, renderTransfersStub
  });
})(typeof window !== "undefined" ? window : global);
