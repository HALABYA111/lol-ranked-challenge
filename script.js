/* ===============================
   CONSTANTS
================================ */

const ranks = [
  "Iron", "Bronze", "Silver", "Gold",
  "Platinum", "Emerald", "Diamond",
  "Master", "Grandmaster", "Challenger"
];

const divisions = ["", "IV", "III", "II", "I"];
const BACKEND = "https://lol-ranked-backend-production.up.railway.app";

/* ===============================
   GLOBAL CACHE
================================ */

let cachedLeaderboardData = null;

/* ===============================
   ADMIN SELECTS
================================ */

function fillSelects() {
  const rank = document.getElementById("peakRank");
  const div = document.getElementById("peakDivision");

  if (rank && rank.options.length === 0) {
    ranks.forEach(r => {
      const o = document.createElement("option");
      o.value = r;
      o.textContent = r;
      rank.appendChild(o);
    });
  }

  if (div && div.options.length === 0) {
    divisions.forEach(d => {
      const o = document.createElement("option");
      o.value = d;
      o.textContent = d === "" ? "None" : d;
      div.appendChild(o);
    });
  }
}

/* ===============================
   LOGIN
================================ */

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
   POINT SYSTEM (MASTER+ FIX)
================================ */

function rankToPoints(rank, division, lp) {
  lp = Number(lp || 0);
  const tierIndex = ranks.indexOf(rank);
  if (tierIndex === -1) return 0;

  // Master+ uses a continuous LP ladder
  if (rank === "Master" || rank === "Grandmaster" || rank === "Challenger") {
    const masterBase = ranks.indexOf("Master") * 400; // 2800
    return masterBase + lp;
  }

  // Below Master (normal tiers)
  let points = tierIndex * 400;

  if (tierIndex <= 6 && division) {
    const map = { IV: 0, III: 100, II: 200, I: 300 };
    points += map[division] ?? 0;
  }

  return points + lp;
}

/* ===============================
   BACKEND HELPERS
================================ */

async function fetchAccounts() {
  const res = await fetch(`${BACKEND}/accounts`);
  const json = await res.json();
  return json.success ? json.data : [];
}

/* ===============================
   LEADERBOARD (BACKEND + RIOT)
================================ */

async function fetchLeaderboardFromAPI() {
  const accounts = await fetchAccounts();

  cachedLeaderboardData = await Promise.all(
    accounts.map(async acc => {
      try {
        const res = await fetch(
          `${BACKEND}/rank?riotId=${encodeURIComponent(acc.riotid)}&server=${acc.server}`
        );
        const r = await res.json();

        const peakPoints = rankToPoints(
          acc.peakrank,
          acc.peakdivision,
          acc.peaklp
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

        const tier =
          r.tier.charAt(0) + r.tier.slice(1).toLowerCase();

        const currentPoints = rankToPoints(
          tier,
          r.rank || "",
          r.lp
        );

        return {
          ...acc,
          tierIcon: tier.toLowerCase(),
          displayRank: `${tier} ${r.rank || ""} ${r.lp} LP`,
          currentPoints,
          points: currentPoints - peakPoints
        };

      } catch {
        const peakPoints = rankToPoints(
          acc.peakrank,
          acc.peakdivision,
          acc.peaklp
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
    const riotName = acc.riotid.replace("#", "-");
    const server = acc.server.toLowerCase();
    const uggServer = server === "euw" ? "euw1" : "eun1";
    const iconSrc = `images/${acc.tierIcon}.png`;

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${acc.player}</td>
      <td>${acc.riotid}</td>
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
   ADMIN ACTIONS
================================ */

async function addAccount() {
  await fetch(`${BACKEND}/accounts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      player: playerName.value,
      riotId: riotId.value,
      server: server.value,
      peakRank: peakRank.value,
      peakDivision: peakDivision.value,
      peakLP: Number(peakLP.value || 0)
    })
  });

  loadAdminTable();
  refreshLeaderboard();
}

async function deleteAccount(id) {
  await fetch(`${BACKEND}/accounts/${id}`, { method: "DELETE" });
  loadAdminTable();
  refreshLeaderboard();
}

async function deletePlayer(player) {
  await fetch(`${BACKEND}/accounts/player/${player}`, { method: "DELETE" });
  loadAdminTable();
  refreshLeaderboard();
}

/* ===============================
   ADMIN TABLE
================================ */

async function loadAdminTable() {
  const body = document.getElementById("adminTableBody");
  if (!body) return;

  const data = await fetchAccounts();
  body.innerHTML = "";

  data.forEach(acc => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${acc.player}</td>
      <td>${acc.riotid}</td>
      <td>${acc.server.toUpperCase()}</td>
      <td>${acc.peakrank} ${acc.peakdivision} ${acc.peaklp} LP</td>
      <td>
        <button type="button" class="delete"
          onclick="deleteAccount(${acc.id})">
          Delete Account
        </button>
        <button type="button" class="delete"
          onclick="deletePlayer('${acc.player}')">
          Delete Player
        </button>
      </td>
    `;
    body.appendChild(row);
  });
}
