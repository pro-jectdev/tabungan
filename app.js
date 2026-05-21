/**
 * =======================================================
 * Premium Savings Dashboard Logic
 * Powered by ES6+ and Vanilla CSS
 * =======================================================
 */

// --- CONFIGURATION ---
const URL_API = "https://script.google.com/macros/s/AKfycbxeDlfdcAgps5xGGIKR6t4ByANwmNL6gd7kZ0O0WFYQ-ssfTOI_UPhcVlwZp4uryBQZ6Q/exec";
const SECRET_KEY = "keluarga123";
const STORAGE_THEME_KEY = 'savings-dashboard-theme';

// --- STATE MANAGEMENT ---
let appData = {
  riwayat: [],
  ringkasan: [],
  totalTabungan: 0
};

// --- FORMATTERS & HELPERS ---
function formatIDR(angka = 0) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(Number(angka));
}

function escapeHTML(str = '') {
  return String(str).replace(/[&<>"']/g, function (m) {
    return ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    })[m];
  });
}

// Extract number from week string (e.g., "MINGGU 12" -> 12, "Week 3" -> 3)
function extractWeekNumber(weekStr) {
  const match = weekStr.match(/\d+/);
  return match ? parseInt(match[0], 10) : 0;
}

// Sort weeks chronologically
function sortWeeks(weeks) {
  return [...weeks].sort((a, b) => {
    const numA = extractWeekNumber(a);
    const numB = extractWeekNumber(b);
    if (numA !== numB) return numA - numB;
    return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
  });
}

// --- UI THEME TOGGLE ---
function initTheme() {
  const btnToggleTheme = document.getElementById('btnToggleTheme');
  updateThemeIcon();

  btnToggleTheme.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem(STORAGE_THEME_KEY, newTheme);
    
    updateThemeIcon();
  });
}

function updateThemeIcon() {
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
  const btn = document.getElementById('btnToggleTheme');
  if (currentTheme === 'dark') {
    btn.innerHTML = `
      <!-- Moon Icon for Dark Mode -->
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
    `;
  } else {
    btn.innerHTML = `
      <!-- Sun Icon for Light Mode -->
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
    `;
  }
}

// --- MODAL CONTROLLERS ---
function initModals() {
  const modalHistory = document.getElementById('modalHistory');
  const statTotal = document.getElementById('statTotal');
  const statCount = document.getElementById('statCount');
  const modalHistoryClose = document.getElementById('modalHistoryClose');
  
  const openHistory = () => {
    modalHistory.classList.add('open');
    renderModalHistoryTable();
  };
  
  statTotal.addEventListener('click', openHistory);
  statCount.addEventListener('click', openHistory);
  modalHistoryClose.addEventListener('click', () => modalHistory.classList.remove('open'));
  
  // Close modals when clicking overlay
  window.addEventListener('click', (e) => {
    if (e.target === modalHistory) modalHistory.classList.remove('open');
  });
}

// --- DATA FETCHING & ERROR HANDLING ---
async function ambilData() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000); // 12 seconds timeout

  try {
    const response = await fetch(`${URL_API}?key=${SECRET_KEY}`, {
      method: 'GET',
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error("Gagal mengambil data dari Google Server.");
    }

    return await response.json();
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error("Waktu koneksi habis (timeout). Silakan periksa jaringan internet Anda.");
    }
    throw err;
  }
}

function renderLoading() {
  // Skeleton Loading on Weekly Summary Panel
  document.getElementById('ringkasanNama').innerHTML = `
    <div class="skeleton-card">
      <div class="skeleton skeleton-text" style="height:18px; margin-bottom:1rem;"></div>
      <div class="skeleton skeleton-text short" style="height:14px; margin-bottom:1.5rem;"></div>
      <div class="skeleton skeleton-member" style="height:55px; margin-bottom:0.75rem;"></div>
      <div class="skeleton skeleton-member" style="height:55px; margin-bottom:0.75rem;"></div>
      <div class="skeleton skeleton-member" style="height:55px;"></div>
    </div>
  `;
}

function renderError(message) {
  document.getElementById('ringkasanNama').innerHTML = `
    <div class="state-container state-error">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="animate-pulse"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
      <h3 class="state-title">Data Gagal Dimuat</h3>
      <p class="state-desc">${escapeHTML(message)}</p>
      <button onclick="muatData()" class="btn btn-primary">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
        Coba Lagi
      </button>
    </div>
  `;
}

// --- VISUAL SUMMARY & FILTER RENDERING ---
function renderRingkasan(filterKeyword = '') {
  let html = "";
  const filteredKeyword = filterKeyword.trim().toLowerCase();

  if (Array.isArray(appData.ringkasan) && appData.ringkasan.length > 0) {
    let activeWeekCount = 0;

    appData.ringkasan.forEach(group => {
      const detail = Array.isArray(group.detail) ? group.detail : [];
      
      // Filter details inside week by member name keyword
      const filteredDetail = detail.filter(item => 
        (item.nama || '').toLowerCase().includes(filteredKeyword)
      );

      // Only show week group if it contains matching members
      if (filteredDetail.length > 0) {
        activeWeekCount++;
        html += `
          <div class="week-group">
            <div class="week-header">
              <h3 class="week-title">${escapeHTML(group.minggu || '-')}</h3>
              <span class="week-count">${filteredDetail.length} ANGGOTA</span>
            </div>
            <div class="member-list">
              ${filteredDetail.map(item => `
                <div class="member-row">
                  <div class="member-name">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                    ${escapeHTML(item.nama || '-')}
                  </div>
                  <div class="member-amount">
                    ${formatIDR(item.total || 0)}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }
    });

    if (activeWeekCount === 0) {
      html = `
        <div class="state-container">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <p class="state-title">Anggota Tidak Ditemukan</p>
          <p class="state-desc">Tidak ada kecocokan nama anggota keluarga untuk "${escapeHTML(filterKeyword)}".</p>
        </div>
      `;
    }
  } else {
    html = `
      <div class="state-container">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
        <p class="state-title">Belum Ada Data</p>
        <p class="state-desc">Data mingguan belum diinput di server Google Sheet.</p>
      </div>
    `;
  }

  document.getElementById('ringkasanNama').innerHTML = html;
}

// --- MODAL RIWAYAT TABLE RENDERER ---
function renderModalHistoryTable(filterKeyword = '') {
  const tbody = document.getElementById('tableHistoryBody');
  const filteredKeyword = filterKeyword.trim().toLowerCase();
  
  if (!Array.isArray(appData.riwayat) || appData.riwayat.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="3" style="text-align:center; padding:3rem; color:var(--text-muted);">
          Belum ada riwayat setoran tabungan.
        </td>
      </tr>
    `;
    return;
  }
  
  // Filter riwayat rows
  const filteredRiwayat = appData.riwayat.filter(item => 
    (item.nama || '').toLowerCase().includes(filteredKeyword)
  );
  
  if (filteredRiwayat.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="3" style="text-align:center; padding:3rem; color:var(--text-muted);">
          Tidak ditemukan riwayat untuk "${escapeHTML(filterKeyword)}".
        </td>
      </tr>
    `;
    return;
  }
  
  // Generate Table Rows
  tbody.innerHTML = filteredRiwayat.map(item => `
    <tr>
      <td class="table-date">${escapeHTML(item.minggu || '-')}</td>
      <td class="table-name">
        <div style="display:flex; align-items:center; gap:0.5rem;">
          <div style="width:8px; height:8px; border-radius:50%; background:var(--accent-primary);"></div>
          ${escapeHTML(item.nama || '-')}
        </div>
      </td>
      <td class="table-amount">${formatIDR(item.jumlah || 0)}</td>
    </tr>
  `).join('');
}

// --- UPDATE STATS AND CORE UI ---
function updateStatsUI() {
  let total = 0;
  
  if (Array.isArray(appData.riwayat)) {
    appData.riwayat.forEach(item => {
      total += Number(item.jumlah || 0);
    });
    
    appData.totalTabungan = total;
    
    document.getElementById('totalTabungan').innerText = formatIDR(total);
    document.getElementById('countSetoran').innerText = appData.riwayat.length;
  }
}

function updateLastUpdatedTime() {
  const sekarang = new Date();
  const waktu = sekarang.toLocaleString('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
  document.getElementById('lastUpdate').innerHTML = `
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
    Update terakhir: ${waktu}
  `;
}

// --- MAIN CONTROLLER METHOD ---
async function muatData() {
  renderLoading();
  
  // Rotate refresh button icon to show visual action
  const btnRefresh = document.getElementById('btnRefresh');
  btnRefresh.style.pointerEvents = 'none';
  btnRefresh.classList.add('animate-pulse');
  
  try {
    const data = await ambilData();
    
    // Store variables to global state
    appData.riwayat = Array.isArray(data.riwayat) ? data.riwayat : [];
    appData.ringkasan = Array.isArray(data.ringkasan) ? data.ringkasan : [];
    
    // Render Stats
    updateStatsUI();
    
    // Render Weekly list
    renderRingkasan();
    
    // Reset search inputs
    document.getElementById('inputSearchMember').value = '';
    document.getElementById('inputSearchModal').value = '';
    
    // Success Timestamp update
    updateLastUpdatedTime();
    
  } catch (err) {
    console.error("Dashboard error:", err);
    renderError(err.message);
  } finally {
    // Release refresh button lock and animations
    btnRefresh.style.pointerEvents = 'auto';
    btnRefresh.classList.remove('animate-pulse');
  }
}

// --- SETUP FILTER BAR LISTENER ---
function initFilters() {
  const searchInputMain = document.getElementById('inputSearchMember');
  searchInputMain.addEventListener('input', (e) => {
    renderRingkasan(e.target.value);
  });
  
  const searchInputModal = document.getElementById('inputSearchModal');
  searchInputModal.addEventListener('input', (e) => {
    renderModalHistoryTable(e.target.value);
  });
}

// --- INITIALIZE APPLICATION ON LOAD ---
window.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize Visual theme switcher
  initTheme();
  
  // 2. Initialize Modals
  initModals();
  
  // 3. Initialize dynamic inputs and smart filters
  initFilters();
  
  // 4. Hook refresh action
  document.getElementById('btnRefresh').addEventListener('click', muatData);
  
  // 5. Initial Data load trigger
  muatData();
  
  // 6. Automated Background poll every 60 seconds
  setInterval(muatData, 60000);
});
