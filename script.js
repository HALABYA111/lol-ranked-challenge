const ranks = [
  "Iron", "Bronze", "Silver", "Gold",
  "Platinum", "Emerald", "Diamond",
  "Master", "Grandmaster", "Challenger"
];

const divisions = ["", "IV", "III", "II", "I"];

let cachedLeaderboardData = null;

/* ===============================
   ADMIN SELECT DROPDOWNS (FIXED)
================================ */
function fillSelects() {
  const peakRank = document.getElementById("peakRank");
  const peakDivision = document.getElementById("peakDivision");

  if (peakRank && peakRank.children.length === 0) {
    ranks.forEach(r => {
      const opt = document.createElement("option");
      opt.value = r;
      opt.textContent = r;
      peakRank.appendChild(opt);
    });
  }

  if (peakDivision && peakDivision.children.length === 0) {
    divisions.forEach(d => {
      const opt = document.createElement("option");
      opt.value = d;
      opt.textContent = d === "" ? "None" : d;
      peakDivision.appendChild(opt);
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
   FETCH ACCOUNTS
================================ */
async function fetchAccounts() {
  const res = await fetch(
    "https://lol-ranked-backend-production.up.railway.app/accounts"
  );
  const json = await res.json();

  if (!json.success) return [];

  return json.data.map(acc => ({
    id: acc.id,
    player: acc.player,
    riotId: acc.riotid,
    server: acc.server,
    peakRank: acc.peakrank,
    peakDivision: acc.peakdivision,
    peakLP: acc.peaklp
  }));
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
      <td>${acc.riotId}</td>
      <td>${acc.server.toUpperCase()}</td>
      <td>${acc.peakRank} ${acc.peakDivision} ${acc.peakLP} LP</td>
      <td>
        <button onclick="deleteAccount(${acc.id})">Delete Account</button>
        <button onclick="deletePlayer('${acc.player}')">Delete Player</button>
      </td>
    `;
    body.appendChild(row);
  });
}

/* ===============================
   ADD ACCOUNT
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

/* ===============================
   DELETE ACCOUNT (FIXED)
================================ */
async function deleteAccount(id) {
  if (!confirm("Delete this account?")) return;

  await fetch(
    `https://lol-ranked-backend-production.up.railway.app/accounts/${id}`,
    { method: "DELETE" }
  );

  loadAdminTable();
}

/* ===============================
   DELETE PLAYER (ALL ACCOUNTS)
================================ */
async function deletePlayer(player) {
  if (!confirm(`Delete ALL accounts for ${player}?`)) return;

  const accounts = await fetchAccounts();
  const toDelete = accounts.filter(a => a.player === player);

  for (const acc of toDelete) {
    await fetch(
      `https://lol-ranked-backend-production.up.railway.app/accounts/${acc.id}`,
      { method: "DELETE" }
    );
  }

  loadAdminTable();
}
