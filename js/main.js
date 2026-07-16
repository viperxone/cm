(function () {
  "use strict";
  const FM = window.FM;

  let state = null;
  let currentScreen = "dashboard";

  const root = document.getElementById("app-root");
  const nav = document.getElementById("app-nav");
  const continueBtn = document.getElementById("continue-btn");
  const newGameOverlay = document.getElementById("new-game-overlay");
  const clubSelect = document.getElementById("club-select");

  const SCREENS = {
    dashboard: { label: "Dashboard", render: (s) => FM.renderDashboard(s) },
    squad: { label: "Squad", render: (s) => FM.renderSquad(s) },
    tactics: { label: "Tactics", render: (s) => FM.renderTactics(s, render) },
    fixtures: { label: "Fixtures / Table", render: (s) => FM.renderFixtures(s) },
    matchday: { label: "Last Matchday", render: (s) => FM.renderMatchday(s) },
    transfers: { label: "Transfers", render: () => FM.renderTransfersStub() }
  };

  function buildNav() {
    nav.innerHTML = "";
    Object.keys(SCREENS).forEach(key => {
      const btn = document.createElement("button");
      btn.className = "nav-btn";
      btn.textContent = SCREENS[key].label;
      btn.dataset.screen = key;
      btn.addEventListener("click", () => { currentScreen = key; render(); });
      nav.appendChild(btn);
    });
  }

  function render() {
    if (!state) return;
    root.innerHTML = "";
    root.appendChild(FM.renderHeader(state));
    root.appendChild(SCREENS[currentScreen].render(state));

    Array.from(nav.children).forEach(b => {
      b.classList.toggle("active", b.dataset.screen === currentScreen);
    });

    continueBtn.disabled = state.seasonComplete;
    continueBtn.textContent = state.seasonComplete ? "Season complete" : "Continue \u25B6";

    const unread = state.inbox.filter(m => !m.read).length;
    document.getElementById("inbox-badge").textContent = unread > 0 ? String(unread) : "";
    document.getElementById("inbox-badge").style.display = unread > 0 ? "inline-flex" : "none";

    FM.save(state);
  }

  continueBtn.addEventListener("click", () => {
    if (!state || state.seasonComplete) return;
    FM.advanceMatchday(state);
    state.inbox.forEach(m => m.read = true);
    currentScreen = "dashboard";
    render();
  });

  document.getElementById("new-save-btn").addEventListener("click", () => {
    newGameOverlay.classList.remove("hidden");
  });

  document.getElementById("start-game-btn").addEventListener("click", () => {
    const clubName = clubSelect.value;
    state = FM.newGame(clubName);
    newGameOverlay.classList.add("hidden");
    currentScreen = "dashboard";
    render();
  });

  function populateClubSelect() {
    clubSelect.innerHTML = "";
    FM.CLUB_NAMES.forEach(name => {
      const opt = document.createElement("option");
      opt.value = name; opt.textContent = name;
      clubSelect.appendChild(opt);
    });
  }

  function boot() {
    buildNav();
    populateClubSelect();
    const existing = FM.load();
    if (existing && existing.world) {
      state = existing;
      render();
    } else {
      newGameOverlay.classList.remove("hidden");
    }
  }

  boot();
})();
