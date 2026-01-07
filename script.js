const BACKEND_URL = "https://lol-ranked-backend-production.up.railway.app";

const ranks = [
  "Iron", "Bronze", "Silver", "Gold",
  "Platinum", "Emerald", "Diamond",
  "Master", "Grandmaster", "Challenger"
];

const divisions = ["", "IV", "III", "II", "I"];

/* ===============================
   GLOBAL CACHE
================================ */

let cachedLeaderboardData = null;

/* ===============================
   ADMIN SELECTS
================================ */

function fillSelects() {
  ["peakRank"].forEach(id => {
    const select = document.getElementById(id);
    if (!select) return;
    ranks.forEach(r => {
      const o = document.createElement("option");
      o.value = r;
      o.textContent = r;
      select.appendChild(o);
    });
  });

  ["peakDivision"].forEach(id => {
    const select = document.getElementById(id);
    if (!select) return;
    divisions.forEach(d => {
      const o = document.createElement("option");
      o.value = d;
      o.textContent = d === "" ? "None" : d;
      select.appendChild(o);
    });
  });
}

function login() {
  if (
    document.getElementById("username").value === "admin" &&
    document.getElementById("password").value === "admin"
  ) {
    document.getElementById("loginBox").classList.add("hidden");
    document.getElementById("adminPanel").classList.remove("hidden");
    fillSelects();
    loadAdminTable();
  } else {
    alert("Wrong login");
  }
}

/* ===============================
   POINT SYSTEM
================================ */

function rankToPoints(rank, division, lp) {
  lp = Number(lp || 0);
  const tierIndex = ranks.indexOf(rank);
  if (tierIndex === -1) return 0;

  let points = tierIndex * 400;

  if (tierIndex <= 6 && division) {
    const divisionPoints = {
      "IV": 0,
      "III": 100,
      "II": 200,
      "I": 300
    };
    points += divisionPoints[division] ?? 0;
  }

  return points + lp;
}

/* ===============================
   LOAD ACCOUNTS FROM BACKEND
================================ */

async function fetchAccountsFromBackend() {
  const res = await fetch(`${BACKEND_URL}/accounts`);
  const json = await res.json();
  return json.data || [];
}

/* ===============================
   FETCH RANKS FROM API
================================ */

async function fetchLeaderboardFromAPI() {
  const accounts = await fetchAccountsFromBackend();

  cachedLeaderboardData = await Promise.all(
    accounts.map(async acc => {
      try {
        const res = await fetch(
          `${BACKEND_URL}/rank?riotId=${encodeURIComponent(acc.riotId)}&server=${acc.server}`
        );
        const r = await res.json();

        const peakPoints = rankToPoints(
          acc.peakRank,
          acc.peakDivision,
          acc.peakLP
        );

        if (!r.ranked) {
          return {
            ...acc,
            tierIcon: "unranked",
            displayRank: "Unranked",
            currentPoints: 0,
            points: -peakPoints
          };
        }

        const normalizedTier = r.tier.toLowerCase();

        const currentPoints = rankToPoints(
          r.tier.charAt(0) + r.tier.slice(1).toLowerCase(),
          r.rank || "",
          r.lp
        );

        return {
          ...acc,
          tierIcon: normalizedTier,
          displayRank: `${r.tier.charAt(0) + r.tier.slice(1).toLowerCase()} ${r.rank || ""} ${r.lp} LP`,
          currentPoints,
          points: currentPoints - peakPoints
        };

      } catch {
        const peakPoints = rankToPoints(
          acc.peakRank,
          acc.peakDivision,
          acc.peakLP
        );
        return {
          ...acc,
          tierIcon: "unranked",
          displayRank: "Invalid",
          currentPoints: 0,
          points: -peakPoints
        };
      }
    })
  );

  return cachedLeaderboardData;
}

/* ===============================
   RENDER LEADERBOARD
================================ */

function renderLeaderboard(data) {
  const body = document.getElementById("leaderboardBody");
  if (!body) return;

  body.innerHTML = "";

  data.forEach(acc => {
    const riotName = acc.riotId.replace("#", "-");
    const server = acc.server.toLowerCase();
    const uggServer = server === "euw" ? "euw1" : "eun1";
    const iconSrc = `images/${acc.tierIcon}.png`;

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${acc.player}</td>
      <td>${acc.riotId}</td>
      <td>${acc.server.toUpperCase()}</td>
      <td class="rank-cell">
        <img src="${iconSrc}" class="rank-icon">
        ${acc.displayRank}
      </td>
      <td>${acc.points}</td>
      <td class="link-group">
        <a class="link-btn" target="_blank"
          href="https://www.leagueofgraphs.com/summoner/${server}/${riotName}">
          League of Graphs
        </a>
        <a class="link-btn" target="_blank"
          href="https://www.op.gg/summoners/${server}/${riotName}">
          OP.GG
        </a>
        <a class="link-btn" target="_blank"
          href="https://u.gg/lol/profile/${uggServer}/${riotName}/overview">
          U.GG
        </a>
      </td>
    `;
    body.appendChild(row);
  });
}

/* ===============================
   SORTING (NO API CALLS)
================================ */

function sortByRankAll() {
  if (!cachedLeaderboardData) return;
  renderLeaderboard(
    [...cachedLeaderboardData].sort((a, b) => b.currentPoints - a.currentPoints)
  );
  setActiveColumn("rank");
}

function sortByPointsGrouped() {
  if (!cachedLeaderboardData) return;

  const best = {};
  cachedLeaderboardData.forEach(acc => {
    if (!best[acc.player] || acc.points > best[acc.player].points) {
      best[acc.player] = acc;
    }
  });

  renderLeaderboard(
    Object.values(best).sort((a, b) => b.points - a.points)
  );
  setActiveColumn("points");
}

function sortByServer() {
  if (!cachedLeaderboardData) return;

  renderLeaderboard(
    [...cachedLeaderboardData]
      .sort((a, b) => b.currentPoints - a.currentPoints)
      .sort((a, b) => a.server.localeCompare(b.server))
  );
  setActiveColumn("server");
}

/* ===============================
   HEADER BINDINGS
================================ */

const bind = (id, fn) => {
  const el = document.getElementById(id);
  if (el) el.onclick = fn;
};

bind("sortRank", sortByRankAll);
bind("sortRiot", sortByRankAll);
bind("sortPoints", sortByPointsGrouped);
bind("sortPlayer", sortByPointsGrouped);
bind("sortServer", sortByServer);

/* ===============================
   INITIAL LOAD
================================ */

if (document.getElementById("leaderboardBody")) {
  fetchLeaderboardFromAPI().then(sortByRankAll);
}

/* ===============================
   REFRESH
================================ */

function refreshLeaderboard() {
  fetchLeaderboardFromAPI().then(sortByRankAll);
}

/* ===============================
   VISUAL SORT INDICATOR
================================ */

function setActiveColumn(col) {
  document.querySelectorAll("th").forEach(th => th.classList.remove("active-sort"));
  document.querySelectorAll("td").forEach(td => td.classList.remove("active-col"));

  const header = document.querySelector(`th[data-col="${col}"]`);
  if (!header) return;

  header.classList.add("active-sort");
  const colIndex = Array.from(header.parentNode.children).indexOf(header);

  document.querySelectorAll("#leaderboardBody tr").forEach(row => {
    const cell = row.children[colIndex];
    if (cell) cell.classList.add("active-col");
  });
}

/* ===============================
   ADMIN → BACKEND SAVE
================================ */

async function addAccount() {
  const payload = {
    player: document.getElementById("playerName").value,
    riotId: document.getElementById("riotId").value,
    server: document.getElementById("server").value,
    peakRank: document.getElementById("peakRank").value,
    peakDivision: document.getElementById("peakDivision").value,
    peakLP: document.getElementById("peakLP").value
  };

  await fetch(`${BACKEND_URL}/accounts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  loadAdminTable();
  fetchLeaderboardFromAPI().then(sortByRankAll);
}

/* ===============================
   ADMIN TABLE
================================ */

async function loadAdminTable() {
  const body = document.getElementById("adminTableBody");
  if (!body) return;

  const accounts = await fetchAccountsFromBackend();
  body.innerHTML = "";

  accounts.forEach(acc => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${acc.player}</td>
      <td>${acc.riotId}</td>
      <td>${acc.server.toUpperCase()}</td>
      <td>${acc.peakRank} ${acc.peakDivision} ${acc.peakLP} LP</td>
      <td>Stored</td>
    `;
    body.appendChild(row);
  });
}
