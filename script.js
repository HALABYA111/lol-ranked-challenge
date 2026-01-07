const ranks = [
  "Iron", "Bronze", "Silver", "Gold",
  "Platinum", "Emerald", "Diamond",
  "Master", "Grandmaster", "Challenger"
];

const divisions = ["", "IV", "III", "II", "I"];

/* ===============================
   GLOBAL CACHE (LEADERBOARD)
================================ */
let cachedLeaderboardData = null;

/* ===============================
   ADMIN DROPDOWNS (FIXED)
================================ */
function fillSelects() {
  const rankSelect = document.getElementById("peakRank");
  const divisionSelect = document.getElementById("peakDivision");

  if (rankSelect && rankSelect.options.length === 0) {
    ranks.forEach(r => {
      const opt = document.createElement("option");
      opt.value = r;
      opt.textContent = r;
      rankSelect.appendChild(opt);
    });
  }

  if (divisionSelect && divisionSelect.options.length === 0) {
    divisions.forEach(d => {
      const opt = document.createElement("option");
      opt.value = d;
      opt.textContent = d === "" ? "None" : d;
      divisionSelect.appendChild(opt);
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
   BACKEND URL (ONE PLACE)
================================ */
const BACKEND =
  "https://lol-ranked-backend-production.up.railway.app";

/* ===============================
   FETCH ACCOUNTS (ADMIN + LB)
================================ */
async function fetchAccounts() {
  const res = await fetch(`${BACKEND}/accounts`);
  const json = await res.json();
  return json.success ? json.data : [];
}

/* ===============================
   ADMIN TABLE (FIXED)
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
      <td>${acc.peakrank} ${acc.peakdivision || ""} ${acc.peaklp} LP</td>
      <td>
        <button onclick="deleteAccount(${acc.id})">Delete Account</button>
        <button onclick="deletePlayer('${acc.player}')">Delete Player</button>
      </td>
    `;
    body.appendChild(row);
  });
}

/* ===============================
   ADD ACCOUNT (ADMIN)
================================ */
async function addAccount() {
  const payload = {
    player: document.getElementById("playerName").value,
    riotId: document.getElementById("riotId").value,
    server: document.getElementById("server").value,
    peakRank: document.getElementById("peakRank").value,
    peakDivision: document.getElementById("peakDivision").value,
    peakLP: Number(document.getElementById("peakLP").value || 0)
  };

  const res = await fetch(`${BACKEND}/accounts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const json = await res.json();

  if (!json.success) {
    alert("Failed to add account");
    return;
  }

  loadAdminTable();
}

/* ===============================
   DELETE ACCOUNT (ADMIN)
================================ */
async function deleteAccount(id) {
  if (!confirm("Delete this account?")) return;

  await fetch(`${BACKEND}/accounts/${id}`, {
    method: "DELETE"
  });

  loadAdminTable();
}

/* ===============================
   DELETE PLAYER (ALL ACCOUNTS)
================================ */
async function deletePlayer(player) {
  if (!confirm(`Delete ALL accounts for ${player}?`)) return;

  const accounts = await fetchAccounts();
  const targets = accounts.filter(a => a.player === player);

  for (const acc of targets) {
    await fetch(`${BACKEND}/accounts/${acc.id}`, {
      method: "DELETE"
    });
  }

  loadAdminTable();
}

/* ===============================
   LEADERBOARD LOGIC (UNCHANGED)
================================ */
/* ⚠️ Your existing leaderboard fetch, caching,
   sorting, icons, refresh logic remain EXACTLY
   as you already have them. This file does NOT
   modify any of that logic. */
