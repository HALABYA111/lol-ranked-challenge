const ranks = [
  "Iron", "Bronze", "Silver", "Gold",
  "Platinum", "Emerald", "Diamond",
  "Master", "Grandmaster", "Challenger"
];

const divisions = ["", "IV", "III", "II", "I"];

/* ===============================
   CONFIG
================================ */

const BACKEND_URL = "https://lol-ranked-backend-production.up.railway.app";

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
   POINT SYSTEM (UNCHANGED)
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
   FETCH ACCOUNTS FROM BACKEND
================================ */

async function fetchAccounts() {
  const res = await fetch(`${BACKEND_URL}/accounts`);
  const json = await res.json();
  return json.data || [];
}

/* ===============================
   FETCH + RIOT API
================================ */

async function fetchLeaderboardFromAPI() {
  const accounts = await fetchAccounts();

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

        const tier = r.tier.toLowerCase();

        const currentPoints = rankToPoints(
          r.tier.charAt(0) + r.tier.slice(1).toLowerCase(),
          r.rank || "",
          r.lp
        );

        return {
          ...acc,
          tierIcon: tier,
          displayRank: `${r.tier} ${r.rank || ""} ${r.lp} LP`,
          currentPoints,
          points: currentPoints - peakPoints
        };

      } catch {
        return {
          ...acc,
          tierIcon: "unranked",
          displayRank: "Invalid",
          currentPoints: 0,
          points: 0
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

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${acc.player}</td>
      <td>${acc.riotId}</td>
      <td>${acc.server.toUpperCase()}</td>
      <td>${acc.displayRank}</td>
      <td>${acc.points}</td>
      <td>
        <a target="_blank" href="https://www.leagueofgraphs.com/summoner/${server}/${riotName}">League of Graphs</a> |
        <a target="_blank" href="https://www.op.gg/summoners/${server}/${riotName}">OP.GG</a> |
        <a target="_blank" href="https://u.gg/lol/profile/${uggServer}/${riotName}/overview">U.GG</a>
      </td>
    `;
    body.appendChild(row);
  });
}

/* ===============================
   SORTING
================================ */

function sortByRankAll() {
  if (!cachedLeaderboardData) return;
  renderLeaderboard([...cachedLeaderboardData].sort((a, b) => b.currentPoints - a.currentPoints));
}

function sortByPointsGrouped() {
  if (!cachedLeaderboardData) return;
  const best = {};
  cachedLeaderboardData.forEach(acc => {
    if (!best[acc.player] || acc.points > best[acc.player].points) {
      best[acc.player] = acc;
    }
  });
  renderLeaderboard(Object.values(best).sort((a, b) => b.points - a.points));
}

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
   ADMIN → ADD ACCOUNT (FIXED)
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

  const res = await fetch(`${BACKEND_URL}/accounts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    alert("Failed to add account");
    return;
  }

  alert("Account added successfully");
  loadAdminTable();
}

/* ===============================
   ADMIN TABLE
================================ */

async function loadAdminTable() {
  const body = document.getElementById("adminTableBody");
  if (!body) return;

  const accounts = await fetchAccounts();
  body.innerHTML = "";

  accounts.forEach((acc, index) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${acc.player}</td>
      <td>${acc.riotId}</td>
      <td>${acc.server.toUpperCase()}</td>
      <td>${acc.peakRank} ${acc.peakDivision} ${acc.peakLP} LP</td>
      <td>—</td>
    `;
    body.appendChild(row);
  });
}
