// ==========================================================================
// MagangHub IT & Informatika Tracker - Client App
// ==========================================================================

(function () {
  'use strict';

  // --- State Management ---
  const state = {
    jobs: [],
    filteredJobs: [],
    bookmarks: JSON.parse(localStorage.getItem('maganghub_bookmarks') || '[]'),
    activeCategory: 'all',
    activeDegree: 'all',
    activeOpportunity: 'all',
    locationFilter: 'jakarta, bekasi', // Default filter: Jakarta & Bekasi
    searchQuery: '',
    sortBy: 'opportunity-desc',
    showBookmarksOnly: false,
    selectedJob: null,
    isLoading: true
  };

  // --- DOM Elements ---
  const el = {
    jobsContainer: document.getElementById('jobs-container'),
    emptyState: document.getElementById('empty-state'),
    emptyMessage: document.getElementById('empty-message'),
    emptyResetBtn: document.getElementById('empty-reset-btn'),
    resultsCountText: document.getElementById('results-count-text'),
    activeFilterBadge: document.getElementById('active-filter-badge'),
    
    // Header stats
    statTotalJobs: document.getElementById('stat-total-jobs'),
    statHighChance: document.getElementById('stat-high-chance'),
    btnStatTotalJobs: document.getElementById('btn-stat-total-jobs'),
    btnStatHighChance: document.getElementById('btn-stat-high-chance'),
    statBookmarksCount: document.getElementById('stat-bookmarks-count'),
    btnShowBookmarks: document.getElementById('btn-show-bookmarks'),

    // Category pills
    pills: document.querySelectorAll('.pill-btn'),
    countAll: document.getElementById('count-all'),
    countSoftware: document.getElementById('count-software'),
    countData: document.getElementById('count-data'),
    countNetwork: document.getElementById('count-network'),
    countSupport: document.getElementById('count-support'),
    countUiux: document.getElementById('count-uiux'),

    // Search and filters
    searchInput: document.getElementById('search-input'),
    searchClearBtn: document.getElementById('search-clear-btn'),
    btnRefreshData: document.getElementById('btn-refresh-data'),
    filterDegree: document.getElementById('filter-degree'),
    filterOpportunity: document.getElementById('filter-opportunity'),
    filterLocationSelect: document.getElementById('filter-location-select'),
    filterLocation: document.getElementById('filter-location'),
    btnResetFilters: document.getElementById('btn-reset-filters'),
    sortSelect: document.getElementById('sort-select'),

    // Modal
    jobModal: document.getElementById('job-modal'),
    modalCloseBtn: document.getElementById('modal-close-btn'),
    modalCategory: document.getElementById('modal-category'),
    modalTitle: document.getElementById('modal-title'),
    modalCompany: document.getElementById('modal-company'),
    modalQuota: document.getElementById('modal-quota'),
    modalApplicants: document.getElementById('modal-applicants'),
    modalOpportunity: document.getElementById('modal-opportunity'),
    modalMajors: document.getElementById('modal-majors'),
    modalLocation: document.getElementById('modal-location'),
    modalDegree: document.getElementById('modal-degree'),
    modalSchedule: document.getElementById('modal-schedule'),
    modalBookmarkBtn: document.getElementById('modal-bookmark-btn'),
    modalBookmarkIcon: document.getElementById('modal-bookmark-icon'),
    modalBookmarkLabel: document.getElementById('modal-bookmark-label'),
    modalApplyLink: document.getElementById('modal-apply-link'),

    // Company Modal elements
    modalCompanyTitle: document.getElementById('modal-company-title'),
    modalCompanyWebsiteLink: document.getElementById('modal-company-website-link'),
    modalWebsiteBtnText: document.getElementById('modal-website-btn-text'),
    modalCompanyAddress: document.getElementById('modal-company-address'),
    modalCompanyContact: document.getElementById('modal-company-contact'),
    compContactRow: document.getElementById('comp-contact-row'),
    compOrganizerRow: document.getElementById('comp-organizer-row'),
    modalOrganizerLink: document.getElementById('modal-organizer-link'),

    // Detail Sections elements
    modalJobDescription: document.getElementById('modal-job-description'),
    modalSkillsContainer: document.getElementById('modal-skills-container'),
    modalTimelineContainer: document.getElementById('modal-timeline-container'),

    // Toast
    toast: document.getElementById('toast')
  };

  // --- API Fetching ---
  async function fetchJobs(forceRefresh = false) {
    state.isLoading = true;
    renderLoading();

    const refreshIcon = el.btnRefreshData.querySelector('.refresh-icon');
    if (forceRefresh) refreshIcon.classList.add('spinning');

    try {
      const url = forceRefresh ? '/api/jobs?refresh=true' : '/api/jobs';
      const response = await fetch(url);
      const data = await response.json();

      if (data && data.jobs) {
        state.jobs = data.jobs;
        updateGlobalStats(data);
        applyFiltersAndRender();
        if (forceRefresh) showToast('Data lowongan berhasil diperbarui!');
      } else {
        throw new Error('Gagal memuat data');
      }
    } catch (err) {
      console.error('Fetch error:', err);
      showToast('Gagal terhubung ke server. Menggunakan data lokal.');
    } finally {
      state.isLoading = false;
      refreshIcon.classList.remove('spinning');
    }
  }

  // --- Stats and Counters Update ---
  function updateGlobalStats(data) {
    const total = state.jobs.length;
    const highChanceCount = state.jobs.filter(j => j.opportunityRate >= 50).length;

    el.statTotalJobs.textContent = total;
    el.statHighChance.textContent = highChanceCount;
    el.statBookmarksCount.textContent = state.bookmarks.length;

    if (data && data.categoriesCount) {
      el.countAll.textContent = data.categoriesCount.all || total;
      el.countSoftware.textContent = data.categoriesCount.software || 0;
      el.countData.textContent = data.categoriesCount.data || 0;
      el.countNetwork.textContent = data.categoriesCount.network || 0;
      el.countSupport.textContent = data.categoriesCount.support || 0;
      el.countUiux.textContent = data.categoriesCount.uiux || 0;
    } else {
      el.countAll.textContent = total;
      el.countSoftware.textContent = state.jobs.filter(j => j.category === 'software').length;
      el.countData.textContent = state.jobs.filter(j => j.category === 'data').length;
      el.countNetwork.textContent = state.jobs.filter(j => j.category === 'network').length;
      el.countSupport.textContent = state.jobs.filter(j => j.category === 'support').length;
      el.countUiux.textContent = state.jobs.filter(j => j.category === 'uiux').length;
    }
  }

  // --- Filtering & Sorting Engine ---
  function applyFiltersAndRender() {
    let list = state.showBookmarksOnly
      ? state.jobs.filter(j => state.bookmarks.some(b => b.id === j.id))
      : [...state.jobs];

    // Category filter
    if (state.activeCategory !== 'all') {
      list = list.filter(j => j.category === state.activeCategory);
    }

    // Degree filter
    if (state.activeDegree !== 'all') {
      list = list.filter(j => (j.degree || '').toLowerCase().includes(state.activeDegree.toLowerCase()));
    }

    // Opportunity level filter
    if (state.activeOpportunity === 'high') {
      list = list.filter(j => j.opportunityRate >= 50);
    } else if (state.activeOpportunity === 'medium') {
      list = list.filter(j => j.opportunityRate >= 20 && j.opportunityRate < 50);
    }

    // Location filter
    if (state.locationFilter && state.locationFilter !== 'all') {
      const locTerms = state.locationFilter.toLowerCase().split(/[,|]/).map(t => t.trim()).filter(Boolean);
      list = list.filter(j => {
        const jLoc = (j.location || '').toLowerCase();
        return locTerms.some(term => jLoc.includes(term));
      });
    }

    // Free text search
    if (state.searchQuery) {
      const q = state.searchQuery.toLowerCase();
      list = list.filter(j =>
        (j.title || '').toLowerCase().includes(q) ||
        (j.company || '').toLowerCase().includes(q) ||
        (j.major || '').toLowerCase().includes(q) ||
        (j.location || '').toLowerCase().includes(q)
      );
    }

    // Sorting
    list.sort((a, b) => {
      switch (state.sortBy) {
        case 'opportunity-desc':
          return (b.opportunityRate || 0) - (a.opportunityRate || 0);
        case 'applicants-asc':
          return (a.applicants || 0) - (b.applicants || 0);
        case 'quota-desc':
          return (b.quota || 0) - (a.quota || 0);
        case 'title-asc':
          return (a.title || '').localeCompare(b.title || '');
        default:
          return 0;
      }
    });

    state.filteredJobs = list;
    renderJobs(list);
  }

  // --- Rendering UI ---
  function renderLoading() {
    el.emptyState.style.display = 'none';
    el.resultsCountText.textContent = 'Memuat lowongan khusus IT...';
    el.jobsContainer.innerHTML = `
      <div class="loading-state">
        <div class="spinner"></div>
        <p>Menghubungkan ke portal MagangHub Kemnaker &amp; menyaring jurusan IT...</p>
      </div>
    `;
  }

  function formatMajorBadge(majorStr) {
    if (!majorStr) return 'Semua Jurusan IT';
    const list = majorStr.split(',').map(m => m.trim()).filter(Boolean);
    if (list.length <= 1) return list[0];
    if (list.length === 2) return `${list[0]}, ${list[1]}`;
    return `${list[0]}, ${list[1]} +${list.length - 2}`;
  }

  function renderJobs(jobs) {
    el.jobsContainer.innerHTML = '';

    // Results info text
    if (state.showBookmarksOnly) {
      el.resultsCountText.textContent = `Menampilkan ${jobs.length} lowongan tersimpan`;
      el.activeFilterBadge.textContent = '⭐ Mode Favorit (Klik untuk lepas)';
      el.activeFilterBadge.style.display = 'inline-block';
    } else if (state.activeOpportunity === 'high') {
      el.resultsCountText.textContent = `Menampilkan ${jobs.length} lowongan dengan Peluang Sangat Besar (>= 50%)`;
      el.activeFilterBadge.textContent = '🎯 Peluang Sangat Besar (Klik untuk lepas)';
      el.activeFilterBadge.style.display = 'inline-block';
    } else if (state.locationFilter === 'jakarta, bekasi') {
      el.resultsCountText.textContent = `Menampilkan ${jobs.length} lowongan di Jakarta & Bekasi`;
      el.activeFilterBadge.textContent = '📍 Jakarta & Bekasi (Klik untuk reset)';
      el.activeFilterBadge.style.display = 'inline-block';
    } else if (state.locationFilter && state.locationFilter !== 'all') {
      el.resultsCountText.textContent = `Menampilkan ${jobs.length} dari ${state.jobs.length} lowongan Informatika`;
      el.activeFilterBadge.textContent = `📍 ${state.locationFilter} (Klik untuk reset)`;
      el.activeFilterBadge.style.display = 'inline-block';
    } else {
      el.resultsCountText.textContent = `Menampilkan ${jobs.length} dari ${state.jobs.length} lowongan Informatika (Nasional)`;
      el.activeFilterBadge.style.display = 'none';
    }

    // Sync high-chance stat button active state
    if (el.btnStatHighChance) {
      el.btnStatHighChance.classList.toggle('active', state.activeOpportunity === 'high');
    }

    if (jobs.length === 0) {
      el.emptyState.style.display = 'block';
      if (state.showBookmarksOnly) {
        el.emptyMessage.textContent = 'Anda belum menyimpan lowongan. Klik ikon bintang pada kartu untuk menyimpan.';
      } else {
        el.emptyMessage.textContent = 'Tidak ada lowongan yang sesuai kriteria pencarian Anda.';
      }
      return;
    }

    el.emptyState.style.display = 'none';

    // Build Cards
    const fragment = document.createDocumentFragment();

    jobs.forEach(job => {
      const isSaved = state.bookmarks.some(b => b.id === job.id);
      const categoryLabel = getCategoryLabel(job.category);
      const chanceClass = getChanceClass(job.opportunityRate);

      const card = document.createElement('article');
      card.className = 'job-card';
      card.setAttribute('data-id', job.id);

      card.innerHTML = `
        <div class="card-top">
          <span class="category-tag ${escapeHtml(job.category)}">${escapeHtml(categoryLabel)}</span>
          <button class="card-bookmark-btn ${isSaved ? 'saved' : ''}" title="${isSaved ? 'Hapus dari favorit' : 'Simpan lowongan'}" aria-label="Simpan lowongan ${escapeHtml(job.title)}">
            ${isSaved ? '⭐' : '☆'}
          </button>
        </div>

        <h3 class="job-title" title="${escapeHtml(job.title)}">${escapeHtml(job.title)}</h3>
        
        <div class="company-row">
          <span class="company-name" title="${escapeHtml(job.company)}">${escapeHtml(job.company)}</span>
          <a href="${escapeHtml(job.companyWebsite || ('https://www.google.com/search?q=' + encodeURIComponent(job.company + ' official website')))}" 
             target="_blank" 
             rel="noopener noreferrer" 
             class="company-chip-btn" 
             title="Kunjungi website resmi / profil ${escapeHtml(job.company)}"
             onclick="event.stopPropagation();">
            <span>🌐 Web</span>
            <span>↗</span>
          </a>
        </div>

        <div class="major-badge-wrap">
          <span class="major-badge" title="${escapeHtml(job.major)}">🎓 ${escapeHtml(formatMajorBadge(job.major))}</span>
        </div>

        <div class="meta-row">
          <span class="meta-item">📍 ${escapeHtml(job.location || 'Indonesia')}</span>
          <span class="meta-item">📜 ${escapeHtml(job.degree || 'Sarjana')}</span>
          <span class="meta-item">📅 ${escapeHtml(job.workDays || '5 hari/minggu')}</span>
        </div>

        <div class="chance-bar-container">
          <div class="chance-stats-row">
            <span class="chance-label ${chanceClass}">
              ${escapeHtml(job.opportunityText || 'Peluang Sedang')}
            </span>
            <span class="ratio-text">Kuota: <strong>${job.quota}</strong> | Pelamar: <strong>${job.applicants}</strong></span>
          </div>
          <div class="progress-track" aria-hidden="true">
            <div class="progress-fill ${chanceClass}" style="width: ${Math.min(100, Math.max(8, job.opportunityRate || 30))}%;"></div>
          </div>
        </div>

        <div class="card-actions">
          <button class="btn-detail">Lihat Detail</button>
          <a href="${escapeHtml(job.url)}" target="_blank" rel="noopener noreferrer" class="btn-apply-direct">
            <span>Daftar</span>
            <span>↗</span>
          </a>
        </div>
      `;

      // Event listeners for card elements
      const bookmarkBtn = card.querySelector('.card-bookmark-btn');
      bookmarkBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleBookmark(job);
      });

      const detailBtn = card.querySelector('.btn-detail');
      detailBtn.addEventListener('click', () => openModal(job));

      const titleEl = card.querySelector('.job-title');
      titleEl.addEventListener('click', () => openModal(job));

      fragment.appendChild(card);
    });

    el.jobsContainer.appendChild(fragment);
  }

  // --- Bookmarking System ---
  function toggleBookmark(job) {
    const idx = state.bookmarks.findIndex(b => b.id === job.id);
    if (idx !== -1) {
      state.bookmarks.splice(idx, 1);
      showToast('Lowongan dihapus dari favorit');
    } else {
      state.bookmarks.push(job);
      showToast('⭐ Lowongan disimpan ke favorit');
    }

    localStorage.setItem('maganghub_bookmarks', JSON.stringify(state.bookmarks));
    el.statBookmarksCount.textContent = state.bookmarks.length;

    // Refresh modal bookmark button if this job is currently open
    if (state.selectedJob && state.selectedJob.id === job.id) {
      updateModalBookmarkUI();
    }

    applyFiltersAndRender();
  }

  // --- Modal Logic ---
  function openModal(job) {
    state.selectedJob = job;
    const modalCardEl = el.jobModal.querySelector('.modal-card');
    if (modalCardEl) modalCardEl.scrollTop = 0;
    const modalBodyEl = el.jobModal.querySelector('.modal-body');
    if (modalBodyEl) modalBodyEl.scrollTop = 0;

    el.modalTitle.textContent = job.title;
    el.modalCompany.textContent = job.company;
    el.modalCategory.textContent = getCategoryLabel(job.category);
    el.modalQuota.textContent = `${job.quota} Orang`;
    el.modalApplicants.textContent = `${job.applicants} Pelamar`;
    el.modalOpportunity.textContent = job.opportunityText || '-';
    el.modalMajors.textContent = job.major || 'Teknik Informatika';
    el.modalLocation.textContent = job.location || 'Indonesia';
    el.modalDegree.textContent = job.degree || 'Sarjana';
    el.modalSchedule.textContent = job.workDays || '5 hari/minggu';
    el.modalApplyLink.href = job.url;

    // Company panel initialization
    const defaultSearchUrl = job.companyWebsite || `https://www.google.com/search?q=${encodeURIComponent(job.company + ' official website')}`;
    el.modalCompanyTitle.textContent = job.company;
    el.modalCompanyWebsiteLink.href = defaultSearchUrl;
    el.modalWebsiteBtnText.textContent = '🌐 Website Perusahaan';
    el.modalCompanyAddress.textContent = job.location || 'Indonesia';
    el.compContactRow.style.display = 'none';
    el.compOrganizerRow.style.display = 'none';

    // Detail sections initialization
    if (el.modalJobDescription) {
      el.modalJobDescription.textContent = 'Memuat rincian deskripsi tugas...';
    }
    if (el.modalSkillsContainer) {
      el.modalSkillsContainer.innerHTML = '<div class="skill-loading-placeholder">Memuat kurikulum &amp; kompetensi magang...</div>';
    }
    if (el.modalTimelineContainer) {
      el.modalTimelineContainer.innerHTML = '<div class="skill-loading-placeholder">Memuat alur tahapan lamaran...</div>';
    }

    // Fetch rich company & job details asynchronously
    fetch(`/api/company?jobId=${encodeURIComponent(job.id)}&name=${encodeURIComponent(job.company)}`)
      .then(res => res.json())
      .then(data => {
        if (state.selectedJob && state.selectedJob.id === job.id) {
          if (data && data.success) {
            // Company Card details
            if (data.company) {
              const comp = data.company;
              if (comp.website) {
                el.modalCompanyWebsiteLink.href = comp.website;
                el.modalWebsiteBtnText.textContent = comp.isDirectWebsite ? '🌐 Kunjungi Website Resmi' : '🔍 Cari Website Resmi';
              }
              if (comp.address) {
                el.modalCompanyAddress.textContent = comp.address;
              }
              if (comp.email || comp.phone) {
                el.compContactRow.style.display = 'flex';
                el.modalCompanyContact.textContent = [comp.email, comp.phone].filter(Boolean).join(' | ');
              }
              if (comp.organizerUrl) {
                el.compOrganizerRow.style.display = 'block';
                el.modalOrganizerLink.href = comp.organizerUrl;
              }
            }

            // 1. Deskripsi Lowongan
            if (el.modalJobDescription) {
              el.modalJobDescription.textContent = data.description || 'Rincian tugas dan tanggung jawab magang disesuaikan dengan kurikulum serta formasi divisi IT di perusahaan.';
            }

            // 2. Skill yang Bakal Kamu Dapat
            if (el.modalSkillsContainer) {
              if (data.skills && data.skills.length > 0) {
                el.modalSkillsContainer.innerHTML = data.skills.map(s => `
                  <div class="skill-module-card">
                    <div class="skill-module-top">
                      <span class="skill-subject-name">${escapeHtml(s.subject)}</span>
                      <div class="skill-badges">
                        <span class="skill-tag type-${s.type === 'Teori' ? 'teori' : 'praktik'}">${escapeHtml(s.type)}</span>
                        <span class="skill-tag month">${escapeHtml(s.month)}</span>
                        ${s.duration ? `<span class="skill-tag month">${escapeHtml(s.duration)}</span>` : ''}
                      </div>
                    </div>
                    ${s.description ? `<p class="skill-module-desc">${escapeHtml(s.description)}</p>` : ''}
                  </div>
                `).join('');
              } else {
                el.modalSkillsContainer.innerHTML = `
                  <div class="skill-module-card">
                    <p class="skill-module-desc" style="color: var(--text-dim); font-style: italic;">
                      ✨ Kurikulum dan kompetensi teknis akan dibimbing langsung oleh mentor industri perusahaan saat orientasi & onboarding.
                    </p>
                  </div>
                `;
              }
            }

            // 3. Alur Lamaran
            if (el.modalTimelineContainer) {
              const steps = (data.steps && data.steps.length > 0) ? data.steps : [
                { sequence: 1, title: 'Submit Lamaran', description: 'Isi kuesioner dan konfirmasi data profil Anda di portal Kemnaker.' },
                { sequence: 2, title: 'Seleksi Lamaran', description: 'Penyelenggara menyeleksi berkas & kualifikasi pelamar.' },
                { sequence: 3, title: 'Interview', description: 'Sesi wawancara teknis dan kebudayaan kerja dengan tim.' },
                { sequence: 4, title: 'Onboarding', description: 'Pemberkasan dokumen administrasi dan orientasi lingkungan kerja.' },
                { sequence: 5, title: 'Mulai Magang', description: 'Pelaksanaan magang resmi di instansi/perusahaan sesuai jadwal.' }
              ];

              el.modalTimelineContainer.innerHTML = steps.map(st => `
                <div class="timeline-step-item">
                  <div class="step-indicator">
                    <div class="step-number-bubble">${st.sequence}</div>
                    <div class="step-connecting-line"></div>
                  </div>
                  <div class="step-body">
                    <h4 class="step-title-text">${escapeHtml(st.title)}</h4>
                    <p class="step-desc-text">${escapeHtml(st.description)}</p>
                  </div>
                </div>
              `).join('');
            }
          }
        }
      })
      .catch(err => {
        console.error('Error fetching company details:', err);
        if (state.selectedJob && state.selectedJob.id === job.id) {
          if (el.modalJobDescription) {
            el.modalJobDescription.textContent = 'Rincian tugas dan tanggung jawab magang disesuaikan dengan posisi IT di instansi yang dilamar.';
          }
          if (el.modalSkillsContainer) {
            el.modalSkillsContainer.innerHTML = `
              <div class="skill-module-card">
                <p class="skill-module-desc" style="color: var(--text-dim); font-style: italic;">
                  ✨ Kurikulum kompetensi akan dibimbing secara langsung oleh mentor industri perusahaan saat onboarding.
                </p>
              </div>
            `;
          }
          if (el.modalTimelineContainer) {
            const fallbackSteps = [
              { sequence: 1, title: 'Submit Lamaran', description: 'Isi kuesioner dan konfirmasi data di portal MagangHub Kemnaker' },
              { sequence: 2, title: 'Seleksi Lamaran', description: 'Verifikasi kelengkapan berkas oleh tim instansi' },
              { sequence: 3, title: 'Interview', description: 'Wawancara kompetensi IT & kesiapan magang' },
              { sequence: 4, title: 'Onboarding', description: 'Penjelasan kontrak, target program & pembagian mentor' },
              { sequence: 5, title: 'Mulai Magang', description: 'Pelaksanaan program magang resmi' }
            ];
            el.modalTimelineContainer.innerHTML = fallbackSteps.map(st => `
              <div class="timeline-step-item">
                <div class="step-indicator">
                  <div class="step-number-bubble">${st.sequence}</div>
                  <div class="step-connecting-line"></div>
                </div>
                <div class="step-body">
                  <h4 class="step-title-text">${escapeHtml(st.title)}</h4>
                  <p class="step-desc-text">${escapeHtml(st.description)}</p>
                </div>
              </div>
            `).join('');
          }
        }
      });

    updateModalBookmarkUI();

    el.jobModal.classList.add('show');
    el.jobModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    el.jobModal.classList.remove('show');
    el.jobModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    state.selectedJob = null;
  }

  function updateModalBookmarkUI() {
    if (!state.selectedJob) return;
    const isSaved = state.bookmarks.some(b => b.id === state.selectedJob.id);
    el.modalBookmarkIcon.textContent = isSaved ? '⭐' : '☆';
    el.modalBookmarkLabel.textContent = isSaved ? 'Hapus dari Favorit' : 'Simpan ke Favorit';
  }

  // --- Toast Notification ---
  let toastTimer = null;
  function showToast(message) {
    if (toastTimer) clearTimeout(toastTimer);
    el.toast.textContent = message;
    el.toast.classList.add('show');
    toastTimer = setTimeout(() => {
      el.toast.classList.remove('show');
    }, 2800);
  }

  // --- Helper Functions ---
  function getCategoryLabel(cat) {
    const labels = {
      software: 'Software & Web Dev',
      data: 'Data & AI',
      network: 'Jaringan & Cloud',
      support: 'IT Support & Ops',
      uiux: 'UI/UX & Produk'
    };
    return labels[cat] || 'IT & Komputasi';
  }

  function getChanceClass(rate) {
    if (rate >= 50) return 'high';
    if (rate >= 20) return 'medium';
    return 'low';
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // --- Event Listeners Initialization ---
  function initEventListeners() {
    // Category Pills
    el.pills.forEach(pill => {
      pill.addEventListener('click', () => {
        el.pills.forEach(p => {
          p.classList.remove('active');
          p.setAttribute('aria-selected', 'false');
        });
        pill.classList.add('active');
        pill.setAttribute('aria-selected', 'true');
        state.activeCategory = pill.getAttribute('data-category');
        applyFiltersAndRender();
      });
    });

    // Bookmarks toggle button in header
    el.btnShowBookmarks.addEventListener('click', () => {
      state.showBookmarksOnly = !state.showBookmarksOnly;
      el.btnShowBookmarks.classList.toggle('active', state.showBookmarksOnly);
      if (state.showBookmarksOnly && state.activeOpportunity === 'high') {
        state.activeOpportunity = 'all';
        el.filterOpportunity.value = 'all';
        if (el.btnStatHighChance) el.btnStatHighChance.classList.remove('active');
      }
      applyFiltersAndRender();
    });

    // Peluang Sangat Besar stat button click
    if (el.btnStatHighChance) {
      el.btnStatHighChance.addEventListener('click', () => {
        if (state.activeOpportunity === 'high') {
          // Toggle off -> show all
          state.activeOpportunity = 'all';
          el.filterOpportunity.value = 'all';
          el.btnStatHighChance.classList.remove('active');
          showToast('Menampilkan semua status peluang');
        } else {
          // Toggle on -> filter only high
          if (state.showBookmarksOnly) {
            state.showBookmarksOnly = false;
            el.btnShowBookmarks.classList.remove('active');
          }
          state.activeOpportunity = 'high';
          el.filterOpportunity.value = 'high';
          el.btnStatHighChance.classList.add('active');

          // If current location filter would result in 0 jobs, auto-switch to national ('all')
          if (state.locationFilter && state.locationFilter !== 'all') {
            const locTerms = state.locationFilter.toLowerCase().split(/[,|]/).map(t => t.trim()).filter(Boolean);
            const hasMatchesInLoc = state.jobs.some(j => {
              if (j.opportunityRate < 50) return false;
              const jLoc = (j.location || '').toLowerCase();
              return locTerms.some(term => jLoc.includes(term));
            });

            if (!hasMatchesInLoc) {
              state.locationFilter = 'all';
              if (el.filterLocationSelect) el.filterLocationSelect.value = 'all';
              el.filterLocation.style.display = 'none';
              el.filterLocation.value = '';
            }
          }
          showToast('Menyaring lowongan Peluang Sangat Besar (>= 50%)');
        }
        applyFiltersAndRender();
      });
    }

    // Lowongan IT Aktif stat button click -> reset to all
    if (el.btnStatTotalJobs) {
      el.btnStatTotalJobs.addEventListener('click', () => {
        resetAllFilters();
        showToast('Menampilkan seluruh lowongan IT');
      });
    }

    // Search Input with debounce
    let debounceTimer = null;
    el.searchInput.addEventListener('input', (e) => {
      const val = e.target.value;
      el.searchClearBtn.style.display = val.length > 0 ? 'block' : 'none';
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        state.searchQuery = val.trim();
        applyFiltersAndRender();
      }, 250);
    });

    el.searchClearBtn.addEventListener('click', () => {
      el.searchInput.value = '';
      el.searchClearBtn.style.display = 'none';
      state.searchQuery = '';
      applyFiltersAndRender();
      el.searchInput.focus();
    });

    // Refresh Data button
    el.btnRefreshData.addEventListener('click', () => {
      fetchJobs(true);
    });

    // Secondary Filters
    el.filterDegree.addEventListener('change', (e) => {
      state.activeDegree = e.target.value;
      applyFiltersAndRender();
    });

    el.filterOpportunity.addEventListener('change', (e) => {
      state.activeOpportunity = e.target.value;
      if (el.btnStatHighChance) {
        el.btnStatHighChance.classList.toggle('active', state.activeOpportunity === 'high');
      }
      applyFiltersAndRender();
    });

    // Location Select & Input
    if (el.filterLocationSelect) {
      el.filterLocationSelect.addEventListener('change', (e) => {
        const val = e.target.value;
        if (val === 'custom') {
          el.filterLocation.style.display = 'inline-block';
          el.filterLocation.focus();
          state.locationFilter = el.filterLocation.value.trim();
        } else {
          el.filterLocation.style.display = 'none';
          el.filterLocation.value = '';
          state.locationFilter = val;
        }
        applyFiltersAndRender();
      });
    }

    let locTimer = null;
    el.filterLocation.addEventListener('input', (e) => {
      clearTimeout(locTimer);
      locTimer = setTimeout(() => {
        state.locationFilter = e.target.value.trim();
        applyFiltersAndRender();
      }, 300);
    });

    // Active filter badge click to reset location, opportunity, or bookmarks
    el.activeFilterBadge.addEventListener('click', () => {
      if (state.showBookmarksOnly) {
        state.showBookmarksOnly = false;
        el.btnShowBookmarks.classList.remove('active');
      } else if (state.activeOpportunity === 'high') {
        state.activeOpportunity = 'all';
        el.filterOpportunity.value = 'all';
        if (el.btnStatHighChance) el.btnStatHighChance.classList.remove('active');
        showToast('Filter peluang dinonaktifkan');
      } else {
        state.locationFilter = 'all';
        if (el.filterLocationSelect) el.filterLocationSelect.value = 'all';
        el.filterLocation.style.display = 'none';
        el.filterLocation.value = '';
      }
      applyFiltersAndRender();
    });

    // Sort selector
    el.sortSelect.addEventListener('change', (e) => {
      state.sortBy = e.target.value;
      applyFiltersAndRender();
    });

    // Reset Filters Button
    const resetAllFilters = () => {
      state.activeCategory = 'all';
      state.activeDegree = 'all';
      state.activeOpportunity = 'all';
      state.locationFilter = 'all'; // Reset returns to all national vacancies
      state.searchQuery = '';
      state.showBookmarksOnly = false;
      state.sortBy = 'opportunity-desc';

      el.searchInput.value = '';
      el.searchClearBtn.style.display = 'none';
      el.filterDegree.value = 'all';
      el.filterOpportunity.value = 'all';
      if (el.filterLocationSelect) el.filterLocationSelect.value = 'all';
      el.filterLocation.style.display = 'none';
      el.filterLocation.value = '';
      el.sortSelect.value = 'opportunity-desc';
      el.btnShowBookmarks.classList.remove('active');
      if (el.btnStatHighChance) el.btnStatHighChance.classList.remove('active');

      el.pills.forEach(p => {
        const isAll = p.getAttribute('data-category') === 'all';
        p.classList.toggle('active', isAll);
        p.setAttribute('aria-selected', isAll ? 'true' : 'false');
      });

      applyFiltersAndRender();
    };

    el.btnResetFilters.addEventListener('click', resetAllFilters);
    el.emptyResetBtn.addEventListener('click', resetAllFilters);

    // Modal Events
    el.modalCloseBtn.addEventListener('click', closeModal);
    el.jobModal.addEventListener('click', (e) => {
      if (e.target === el.jobModal) closeModal();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && el.jobModal.classList.contains('show')) {
        closeModal();
      }
    });

    el.modalBookmarkBtn.addEventListener('click', () => {
      if (state.selectedJob) {
        toggleBookmark(state.selectedJob);
      }
    });
  }

  // --- Bootstrap ---
  initEventListeners();
  fetchJobs(false);

})();
