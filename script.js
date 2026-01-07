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
   FETCH ACCOUNTS FROM BACKEND
================================ */
async function fetchAccounts() {
  const res = await fetch(
    "https://lol-ranked-backend-production.up.railway.app/accounts"
  );
  const json = await res.json();

  if (!json.success) return [];

  // Normalize Supabase fields → frontend format
  return json.data.map(acc => ({
    player: acc.player,
    riotId: acc.riotid,
    server: acc.server,
    peakRank: acc.peakrank,
    peakDivision: acc.peakdivision,
    peakLP: acc.peaklp
  }));
}

/* ===============================
   FETCH RANKS (API ONCE)
================================ */
async function fetchLeaderboardFromAPI() {
  const accounts = await fetchAccounts();

  cachedLeaderboardData = await Promise.all(
    accounts.map(async acc => {
      try {
        const res = await fetch(
          `https://lol-ranked-backend-production.up.railway.app/rank?riotId=${encodeURIComponent(acc.riotId)}&server=${acc.server}`
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

        const normalizedTier =
          tier.charAt(0).toUpperCase() + tier.slice(1);

        const currentPoints = rankToPoints(
          normalizedTier,
          r.rank || "",
          r.lp
        );

        return {
          ...acc,
          tierIcon: tier,
          displayRank: `${normalizedTier} ${r.rank || ""} ${r.lp} LP`,
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
      <td class="rank-cell">
        <img src="images/${acc.tierIcon}.png" class="rank-icon">
        ${acc.displayRank}
      </td>
      <td>${acc.points}</td>
      <td class="link-group">
        <a class="link-btn" target="_blank"
          href="https://www.leagueofgraphs.com/summoner/${server}/${riotName}">
          LoG
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
}

function sortByServer() {
  if (!cachedLeaderboardData) return;
  renderLeaderboard(
    [...cachedLeaderboardData].sort((a, b) => a.server.localeCompare(b.server))
  );
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
   ADMIN
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

function login() {
  if (
    document.getElementById("username").value === "admin" &&
    document.getElementById("password").value === "admin"
  ) {
    document.getElementById("loginBox").classList.add("hidden");
    document.getElementById("adminPanel").classList.remove("hidden");
    loadAdminTable();
  } else {
    alert("Wrong login");
  }
}

async function addAccount() {
  const payload = {
    player: document.getElementById("playerName").value,
    riotId: document.getElementById("riotId").value,
    server: document.getElementById("server").value,
    peakRank: document.getElementById("peakRank").value,
    peakDivision: document.getElementById("peakDivision").value,
    peakLP: Number(document.getElementById("peakLP").value || 0)
  };

  const res = await fetch(
    "https://lol-ranked-backend-production.up.railway.app/accounts",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }
  );

  const json = await res.json();

  if (!json.success) {
    alert("Failed to add account");
    return;
  }

  loadAdminTable();
}
