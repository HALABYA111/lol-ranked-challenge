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
let cachedLeaderboardData = [];

/* ===============================
   ADMIN DROPDOWNS
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
    const map = { IV: 0, III: 100, II: 200, I: 300 };
    points += map[division] ?? 0;
  }

  return points + lp;
}

/* ===============================
   BACKEND FETCH HELPERS
================================ */
async function fetchAccounts() {
  const res = await fetch(`${BACKEND}/accounts`);
  const json = await res.json();
  return json.success ? json.data : [];
}

/* ===============================
   LEADERBOARD DATA (API + RIOT)
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

        const peak = rankToPoints(
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
            points: -peak
          };
        }

        const tier =
          r.tier.charAt(0) + r.tier.slice(1).toLowerCase();

        const current = rankToPoints(tier, r.rank, r.lp);

        return {
          ...acc,
          tierIcon: tier.toLowerCase(),
          displayRank: `${tier} ${r.rank} ${r.lp} LP`,
          currentPoints: current,
          points: current - peak
        };

      } catch {
        return null;
      }
    })
  );

  cachedLeaderboardData = cachedLeaderboardData.filter(Boolean);
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
    const icon = `images/${acc.tierIcon}.png`;

    body.innerHTML += `
      <tr>
        <td>${acc.player}</td>
        <td>${acc.riotid}</td>
        <td>${acc.server.toUpperCase()}</td>
        <td class="rank-cell">
          <img src="${icon}" class="rank-icon">
          ${acc.displayRank}
        </td>
        <td>${acc.points}</td>
        <td class="link-group">
          <a class="link-btn" target="_blank" href="https://www.op.gg/summoners/${acc.server}/${riotName}">OP.GG</a>
          <a class="link-btn" target="_blank" href="https://u.gg/lol/profile/${acc.server === "euw" ? "euw1" : "eun1"}/${riotName}/overview">U.GG</a>
        </td>
      </tr>
    `;
  });
}

/* ===============================
   SORTING
================================ */
function sortByRankAll() {
  renderLeaderboard(
    [...cachedLeaderboardData].sort((a, b) => b.currentPoints - a.currentPoints)
  );
}

function sortByPointsGrouped() {
  const best = {};
  cachedLeaderboardData.forEach(a => {
    if (!best[a.player] || a.points > best[a.player].points) {
      best[a.player] = a;
    }
  });
  renderLeaderboard(Object.values(best).sort((a, b) => b.points - a.points));
}

function sortByServer() {
  renderLeaderboard(
    [...cachedLeaderboardData].sort((a, b) =>
      a.server.localeCompare(b.server)
    )
  );
}

/* ===============================
   INITIAL LOAD
================================ */
if (document.getElementById("leaderboardBody")) {
  fetchLeaderboardFromAPI().then(sortByRankAll);
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
  fetchLeaderboardFromAPI().then(sortByRankAll);
}

async function deleteAccount(id) {
  await fetch(`${BACKEND}/accounts/${id}`, { method: "DELETE" });
  loadAdminTable();
  fetchLeaderboardFromAPI().then(sortByRankAll);
}

async function deletePlayer(player) {
  const accounts = await fetchAccounts();
  for (const a of accounts.filter(x => x.player === player)) {
    await fetch(`${BACKEND}/accounts/${a.id}`, { method: "DELETE" });
  }
  loadAdminTable();
  fetchLeaderboardFromAPI().then(sortByRankAll);
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
    body.innerHTML += `
      <tr>
        <td>${acc.player}</td>
        <td>${acc.riotid}</td>
        <td>${acc.server.toUpperCase()}</td>
        <td>${acc.peakrank} ${acc.peakdivision} ${acc.peaklp} LP</td>
        <td>
          <button onclick="deleteAccount(${acc.id})">Delete Account</button>
          <button onclick="deletePlayer('${acc.player}')">Delete Player</button>
        </td>
      </tr>
    `;
  });
}
