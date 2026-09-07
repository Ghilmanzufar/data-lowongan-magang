const https = require('https');
const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, '..', 'data', 'jobs.json');

let jobsCache = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 menit

function loadLocalDatabase() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf8');
      const parsed = JSON.parse(content);
      if (parsed && Array.isArray(parsed.jobs) && parsed.jobs.length > 0) {
        jobsCache = parsed.jobs;
        lastFetchTime = Date.now();
        return true;
      }
    }
  } catch (err) {
    console.error('[MagangHub IT DB] Gagal membaca data/jobs.json:', err);
  }
  return false;
}

function saveLocalDatabase(jobs) {
  try {
    const dataDir = path.dirname(DB_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify({
      lastUpdated: new Date().toISOString(),
      total: jobs.length,
      jobs
    }, null, 2));
  } catch (err) {
    console.error('[MagangHub IT DB] Gagal menyimpan data/jobs.json:', err);
  }
}

// Preload on require
loadLocalDatabase();

const IT_MAJOR_REGEX = /(teknik\s+)?informatika|ilmu\s+komputer|computer\s+science|sistem\s+informasi|rekayasa\s+perangkat\s+lunak|software\s+engineering|teknologi\s+informasi|manajemen\s+informatika|teknik\s+komputer|sistem\s+komputer|rekayasa\s+sistem\s+komputer/i;

const NON_IT_MAJOR_REGEX = /(administrasi\s+bisnis|administrasi\s+perkantoran|administrasi\s+niaga|akuntansi|keuangan|manajemen\s+keuangan|manajemen\s+pemasaran|manajemen\s+bisnis|manajemen\s+sdm|ekonomi|hukum|kedokteran|keperawatan|kebidanan|farmasi|kesehatan|teknik\s+mesin|teknik\s+sipil|teknik\s+industri|pertanian|peternakan|agribisnis|perhotelan|pariwisata|tata\s+boga|psikologi|hubungan\s+internasional)/i;

const PURE_IT_TITLE_REGEX = /^(it\s+|information\s+technology|software|web|full\s*stack|front\s*end|back\s*end|mobile|android|ios|devops|cloud|cyber|qa\s+|database|penetration\s+tester)/i;

function isITJob(job) {
  const major = (job.major || '').trim();
  const title = (job.title || '').trim();

  // 1. Jika syarat jurusan secara eksplisit mencantumkan rumpun Informatika/Ilkom/SI/TI/RPL/Teknik Komputer
  if (IT_MAJOR_REGEX.test(major)) {
    return true;
  }

  // 2. Jika judul posisi murni teknis IT (misal Information Technology Intern, Software Engineer, Web Developer)
  if (PURE_IT_TITLE_REGEX.test(title) || /programmer|software|developer|full\s*stack|backend|frontend|devops|cyber|cloud|it\s+support|information\s+technology/i.test(title)) {
    // Lolos jika jurusan adalah IT, umum/semua jurusan, atau tidak spesifik non-IT
    if (!NON_IT_MAJOR_REGEX.test(major) || /semua\s+jurusan/i.test(major) || !major) {
      return true;
    }
  }

  // 3. Jika jurusan murni non-IT (misal manajemen bisnis, akuntansi, mesin tanpa ada unsur IT) -> REJECT
  if (NON_IT_MAJOR_REGEX.test(major)) {
    return false;
  }

  return false;
}

function assignCategory(job) {
  const text = `${job.title} ${job.major}`.toLowerCase();

  if (/data\s+analyst|data\s+science|data\s+engineer|machine\s+learning|artificial\s+intelligence|\bai\b|bi\b|business\s+intelligence|database/i.test(text)) {
    return 'data';
  }
  if (/network|jaringan|cloud|sysadmin|system\s+admin|devops|cyber|security|infrastruktur|server|mikrotik|cisco/i.test(text)) {
    return 'network';
  }
  if (/it\s+support|helpdesk|teknisi|hardware|maintenance\s+it|staf\s+it|it\s+staff|operasional\s+it/i.test(text)) {
    return 'support';
  }
  if (/ui[\/\s-]?ux|user\s+interface|user\s+experience|product\s+design|tech\s+writer|technical\s+writer/i.test(text)) {
    return 'uiux';
  }
  // Default IT role is software / web development
  return 'software';
}

function parseCards(html) {
  const cards = [];
  const cardRegex = /<a class="group block h-full" href="(\/magang-nasional\/lowongan\/[^"]+)">([\s\S]*?)<\/a>/g;
  let match;

  while ((match = cardRegex.exec(html)) !== null) {
    const slug = match[1];
    const cardHtml = match[2];

    const titleMatch = cardHtml.match(/<h3[^>]*>([\s\S]*?)<\/h3>/);
    const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : '';

    const companyMatch = cardHtml.match(/<p class="text-sm font-medium text-foreground">([\s\S]*?)<\/p>/);
    const company = companyMatch ? companyMatch[1].replace(/<[^>]+>/g, '').trim() : '';

    const majorMatch = cardHtml.match(/<p class="text-sm text-muted-foreground truncate">([\s\S]*?)<\/p>/);
    const major = majorMatch ? majorMatch[1].replace(/<[^>]+>/g, '').trim() : '';

    const locationMatch = cardHtml.match(/lucide-map-pin[^>]*>[\s\S]*?<\/svg>\s*([^<]+)/);
    const location = locationMatch ? locationMatch[1].trim() : '';

    const degreeMatch = cardHtml.match(/lucide-graduation-cap[^>]*>[\s\S]*?<\/svg>\s*<span>([^<]+)<\/span>/);
    const degree = degreeMatch ? degreeMatch[1].trim() : 'Sarjana';

    const workDaysMatch = cardHtml.match(/lucide-calendar[^>]*>[\s\S]*?<\/svg>\s*([0-9]+)<!-- -->\s*hari\/minggu/);
    const workDays = workDaysMatch ? `${workDaysMatch[1]} hari/minggu` : '5 hari/minggu';

    const quotaMatch = cardHtml.match(/Kuota:\s*<!-- -->\s*([0-9]+)/);
    const quota = quotaMatch ? parseInt(quotaMatch[1], 10) : 1;

    const applicantsMatch = cardHtml.match(/Pelamar:\s*<!-- -->\s*([0-9]+)/);
    const applicants = applicantsMatch ? parseInt(applicantsMatch[1], 10) : 0;

    const opportunityMatch = cardHtml.match(/Peluang\s+([A-Za-z]+)<!-- -->\s*\(\s*<!-- -->\s*([0-9]+)<!-- -->\s*%\s*\)/);
    let opportunityText = 'Peluang Besar (100%)';
    let opportunityRate = 100;
    let opportunityLevel = 'high';

    if (opportunityMatch) {
      opportunityText = `Peluang ${opportunityMatch[1]} (${opportunityMatch[2]}%)`;
      opportunityRate = parseInt(opportunityMatch[2], 10);
      if (opportunityRate >= 50) opportunityLevel = 'high';
      else if (opportunityRate >= 25) opportunityLevel = 'medium';
      else opportunityLevel = 'low';
    }

    const job = {
      id: slug.replace('/magang-nasional/lowongan/', ''),
      url: `https://maganghub.kemnaker.go.id${slug}`,
      title,
      company,
      major,
      location,
      degree,
      workDays,
      quota,
      applicants,
      opportunityText,
      opportunityRate,
      opportunityLevel,
      category: ''
    };

    if (isITJob(job)) {
      job.category = assignCategory(job);
      cards.push(job);
    }
  }

  return cards;
}

function fetchPage(url) {
  return new Promise((resolve) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7'
      },
      timeout: 8000
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
      res.on('error', () => resolve(''));
    });

    req.on('timeout', () => {
      req.destroy();
      resolve('');
    });

    req.on('error', () => resolve(''));
  });
}

async function scrapeMagangHubIT() {
  // 1. General lowongan pages (ambil 25 halaman listing nasional terbaru)
  const generalUrls = Array.from({ length: 25 }, (_, i) =>
    `https://maganghub.kemnaker.go.id/magang-nasional/lowongan?page=${i + 1}`
  );

  // 2. Query kata kunci bidang IT & rumpun program studi komprehensif
  const itKeywordsWithPages = [
    { kw: 'information technology', maxPages: 3 },
    { kw: 'teknologi informasi', maxPages: 3 },
    { kw: 'teknik informatika', maxPages: 3 },
    { kw: 'sistem informasi', maxPages: 3 },
    { kw: 'ilmu komputer', maxPages: 3 },
    { kw: 'software', maxPages: 3 },
    { kw: 'programmer', maxPages: 3 },
    { kw: 'developer', maxPages: 3 },
    { kw: 'data', maxPages: 3 },
    { kw: 'network', maxPages: 3 },
    { kw: 'cyber', maxPages: 2 },
    { kw: 'cloud', maxPages: 2 },
    { kw: 'it support', maxPages: 2 },
    { kw: 'ui/ux', maxPages: 2 },
    { kw: 'rekayasa perangkat lunak', maxPages: 2 },
    { kw: 'teknik komputer', maxPages: 2 },
    { kw: 'database', maxPages: 2 },
    { kw: 'fullstack', maxPages: 2 },
    { kw: 'backend', maxPages: 2 },
    { kw: 'frontend', maxPages: 2 },
    { kw: 'devops', maxPages: 2 }
  ];

  const kwUrls = [];
  for (const item of itKeywordsWithPages) {
    for (let p = 1; p <= item.maxPages; p++) {
      kwUrls.push(`https://maganghub.kemnaker.go.id/magang-nasional/lowongan?keyword=${encodeURIComponent(item.kw)}&page=${p}`);
    }
  }

  const allUrls = [...generalUrls, ...kwUrls];

  // Fetch in controlled batches to avoid network congestion / timeout
  const batchSize = 15;
  const results = [];
  for (let i = 0; i < allUrls.length; i += batchSize) {
    const batch = allUrls.slice(i, i + batchSize);
    const batchRes = await Promise.all(batch.map(url => fetchPage(url)));
    results.push(...batchRes);
  }

  const jobsMap = new Map();

  for (const html of results) {
    if (!html) continue;
    const list = parseCards(html);
    for (const j of list) {
      if (!jobsMap.has(j.id)) {
        jobsMap.set(j.id, j);
      }
    }
  }

  const jobs = Array.from(jobsMap.values());
  if (jobs.length > 0) {
    saveLocalDatabase(jobs);
  }
  return jobs;
}

const companyCache = new Map();

async function getCompanyDetail(jobId, companyName) {
  if (companyCache.has(jobId)) {
    return companyCache.get(jobId);
  }

  const url = `https://maganghub.kemnaker.go.id/magang-nasional/lowongan/${jobId}`;
  const html = await fetchPage(url);

  let email = '';
  let phone = '';
  let address = '';
  let website = '';
  let orgName = companyName || '';
  let organizerUrl = '';
  let description = '';
  const skills = [];
  let steps = [];

  if (html) {
    const rscLines = [...html.matchAll(/self\.__next_f\.push\(\[1,"([\s\S]*?)"\]\)/g)].map(m => m[1]);
    const fullRsc = rscLines.join('').replace(/\\"/g, '"');

    // 1. Organizer
    const orgMatch = fullRsc.match(/"organizer":\{([^\}]+)\}/);
    if (orgMatch) {
      const emailMatch = orgMatch[1].match(/"email":"([^"]+)"/);
      if (emailMatch) email = emailMatch[1];
      const phoneMatch = orgMatch[1].match(/"phone":"([^"]+)"/);
      if (phoneMatch) phone = phoneMatch[1];
      const addrMatch = orgMatch[1].match(/"address":"([^"]+)"/);
      if (addrMatch) address = addrMatch[1];
      const nameMatch = orgMatch[1].match(/"name":"([^"]+)"/);
      if (nameMatch) orgName = nameMatch[1];
    }

    const linkMatch = html.match(/href="(\/magang-nasional\/penyelenggara\/[^"]+)"/);
    if (linkMatch) {
      organizerUrl = `https://maganghub.kemnaker.go.id${linkMatch[1]}`;
    }

    // 2. Deskripsi Lowongan (taskDescription)
    const descMatch = fullRsc.match(/"taskDescription":"([\s\S]*?)"(?:,"|\})/);
    if (descMatch) {
      const rawDesc = descMatch[1]
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '')
        .trim();
      if (!rawDesc.startsWith('$') && rawDesc.length > 3) {
        description = rawDesc;
      }
    }

    if (!description) {
      const htmlDescMatch = html.match(/Deskripsi Lowongan<\/h[2-4]>([\s\S]*?)<h[2-4]/i);
      if (htmlDescMatch) {
        const rawHtml = htmlDescMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        if (!rawHtml.startsWith('$') && rawHtml.length > 3) {
          description = rawHtml;
        }
      }
    }

    // 3. Skill yang Bakal Kamu Dapat (curriculums)
    const currMatch = fullRsc.match(/"curriculums":(\[[\s\S]*?\])(?:,"|\})/);
    if (currMatch) {
      try {
        const matMatches = [...currMatch[1].matchAll(/"subject":"([^"]+)","type":"([^"]+)","description":"([\s\S]*?)","minDurationDays":([0-9]+),"maxDurationDays":([0-9]+),"month":([0-9]+)/g)];
        matMatches.forEach(m => {
          skills.push({
            subject: m[1].replace(/\\u0026/g, '&'),
            type: m[2] === 'theory' ? 'Teori' : 'Praktik',
            description: m[3].replace(/\\u0026/g, '&').replace(/\\n/g, ' ').trim(),
            duration: `${m[4]} - ${m[5]} hari`,
            month: `Bulan ke-${m[6]}`
          });
        });
      } catch (e) {}
    }

    // 4. Alur Lamaran (applySteps)
    const stepsMatch = fullRsc.match(/"applySteps":\{[\s\S]*?"steps":(\[[\s\S]*?\])\}/);
    if (stepsMatch) {
      try {
        const stepItems = [...stepsMatch[1].matchAll(/"sequence":([0-9]+),"title":"([^"]+)","description":"([\s\S]*?)"/g)];
        stepItems.forEach(s => {
          steps.push({
            sequence: parseInt(s[1], 10),
            title: s[2].trim(),
            description: s[3].replace(/\\u0026/g, '&').replace(/\\n/g, ' ').trim()
          });
        });
      } catch (e) {}
    }
  }

  if (email && email.includes('@')) {
    const domain = email.split('@')[1].toLowerCase();
    const freeDomains = ['gmail.com', 'yahoo.com', 'yahoo.co.id', 'hotmail.com', 'outlook.com', 'icloud.com'];
    if (!freeDomains.includes(domain)) {
      website = `https://${domain}`;
    }
  }

  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent((orgName || companyName) + ' official website')}`;

  // Default timeline if not parsed
  if (steps.length === 0) {
    steps = [
      { sequence: 1, title: 'Submit Lamaran', description: 'Isi kuesioner dan konfirmasi persyaratan lamaran di portal Kemnaker' },
      { sequence: 2, title: 'Seleksi Lamaran', description: 'Penyelenggara menyeleksi & verifikasi berkas lamaran' },
      { sequence: 3, title: 'Interview', description: 'Interview teknis & HR dengan pihak perusahaan' },
      { sequence: 4, title: 'Onboarding', description: 'Lengkapi dokumen administrasi & persiapan program magang' },
      { sequence: 5, title: 'Mulai Magang', description: 'Pelaksanaan program magang resmi bersama mentor industri' }
    ];
  }

  const result = {
    company: {
      name: orgName || companyName,
      email,
      phone,
      address,
      website: website || searchUrl,
      isDirectWebsite: Boolean(website),
      organizerUrl,
      searchUrl
    },
    description: description || 'Tugas dan tanggung jawab akan disesuaikan dengan kurikulum program magang dari instansi.',
    skills,
    steps
  };

  companyCache.set(jobId, result);
  return result;
}

module.exports = async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = urlObj.pathname;

  // Endpoint: /api/company
  if (pathname === '/api/company' || pathname.startsWith('/api/company/')) {
    const jobId = urlObj.searchParams.get('jobId') || urlObj.searchParams.get('id');
    const companyName = urlObj.searchParams.get('name') || '';

    if (!jobId) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'jobId parameter is required' }));
      return;
    }

    try {
      const detail = await getCompanyDetail(jobId, companyName);
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        success: true,
        company: detail.company,
        description: detail.description,
        skills: detail.skills,
        steps: detail.steps
      }));
    } catch (err) {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        success: true,
        company: {
          name: companyName,
          website: `https://www.google.com/search?q=${encodeURIComponent(companyName + ' official website')}`,
          isDirectWebsite: false,
          searchUrl: `https://www.google.com/search?q=${encodeURIComponent(companyName + ' official website')}`
        },
        description: 'Tugas dan tanggung jawab akan disesuaikan dengan kurikulum program magang dari instansi.',
        skills: [],
        steps: [
          { sequence: 1, title: 'Submit Lamaran', description: 'Isi kuesioner dan konfirmasi persyaratan lamaran di portal Kemnaker' },
          { sequence: 2, title: 'Seleksi Lamaran', description: 'Penyelenggara menyeleksi & verifikasi berkas lamaran' },
          { sequence: 3, title: 'Interview', description: 'Interview teknis & HR dengan pihak perusahaan' },
          { sequence: 4, title: 'Onboarding', description: 'Lengkapi dokumen administrasi & persiapan program magang' },
          { sequence: 5, title: 'Mulai Magang', description: 'Pelaksanaan program magang resmi bersama mentor industri' }
        ]
      }));
    }
    return;
  }

  // Endpoint: /api/jobs
  const now = Date.now();
  const forceRefresh = urlObj.searchParams.get('refresh') === 'true';

  if (!jobsCache || forceRefresh || (now - lastFetchTime > CACHE_TTL_MS)) {
    try {
      const scraped = await scrapeMagangHubIT();
      if (scraped.length > 0) {
        jobsCache = scraped;
        lastFetchTime = now;
      } else if (!jobsCache) {
        // Fallback jika portal Kemnaker sedang down/timeout
        jobsCache = getFallbackJobs();
        lastFetchTime = now;
      }
    } catch (err) {
      if (!jobsCache) {
        jobsCache = getFallbackJobs();
        lastFetchTime = now;
      }
    }
  }

  // Filter params
  const category = urlObj.searchParams.get('category') || 'all';
  const degree = urlObj.searchParams.get('degree') || 'all';
  const opportunity = urlObj.searchParams.get('opportunity') || 'all';
  const q = (urlObj.searchParams.get('q') || '').trim().toLowerCase();

  let filtered = [...(jobsCache || [])].map(j => ({
    ...j,
    companyWebsite: `https://www.google.com/search?q=${encodeURIComponent(j.company + ' official website')}`
  }));

  if (category !== 'all') {
    filtered = filtered.filter(j => j.category === category);
  }

  if (degree !== 'all') {
    filtered = filtered.filter(j => j.degree.toLowerCase().includes(degree.toLowerCase()));
  }

  if (opportunity === 'high') {
    filtered = filtered.filter(j => j.opportunityRate >= 50);
  } else if (opportunity === 'medium') {
    filtered = filtered.filter(j => j.opportunityRate >= 20 && j.opportunityRate < 50);
  }

  if (q) {
    filtered = filtered.filter(j =>
      j.title.toLowerCase().includes(q) ||
      j.company.toLowerCase().includes(q) ||
      j.major.toLowerCase().includes(q) ||
      j.location.toLowerCase().includes(q)
    );
  }

  // Summary counts
  const allList = jobsCache || [];
  const categoriesCount = {
    all: allList.length,
    software: allList.filter(j => j.category === 'software').length,
    data: allList.filter(j => j.category === 'data').length,
    network: allList.filter(j => j.category === 'network').length,
    support: allList.filter(j => j.category === 'support').length,
    uiux: allList.filter(j => j.category === 'uiux').length
  };

  res.setHeader('Content-Type', 'application/json');
  res.statusCode = 200;
  res.end(JSON.stringify({
    success: true,
    total: filtered.length,
    lastUpdated: new Date(lastFetchTime).toISOString(),
    categoriesCount,
    jobs: filtered
  }));
};

function getFallbackJobs() {
  return [
    {
      id: "programmer-01a055c1-0ea4-7130-aff6-799e9949bf7c",
      url: "https://maganghub.kemnaker.go.id/magang-nasional/lowongan/programmer-01a055c1-0ea4-7130-aff6-799e9949bf7c",
      title: "Programmer",
      company: "Biro Sumber Daya Manusia dan Organisasi",
      major: "Teknik Informatika",
      location: "Kab. Bogor",
      degree: "Sarjana",
      workDays: "5 hari/minggu",
      quota: 2,
      applicants: 3,
      opportunityText: "Peluang Besar (66%)",
      opportunityRate: 66,
      opportunityLevel: "high",
      category: "software"
    },
    {
      id: "itprogrammer-01a04b99-c860-701b-8b1e-ad3f70d5d5fc",
      url: "https://maganghub.kemnaker.go.id/magang-nasional/lowongan/itprogrammer-01a04b99-c860-701b-8b1e-ad3f70d5d5fc",
      title: "IT / Web Programmer",
      company: "PT Tri Usaha Sejahtera Pratama",
      major: "Teknik Informatika, Sistem Informasi",
      location: "Kab. Sragen",
      degree: "Diploma, Sarjana",
      workDays: "6 hari/minggu",
      quota: 3,
      applicants: 6,
      opportunityText: "Peluang Besar (50%)",
      opportunityRate: 50,
      opportunityLevel: "high",
      category: "software"
    },
    {
      id: "data-analyst-kemnaker-sample-01",
      url: "https://maganghub.kemnaker.go.id/magang-nasional/lowongan",
      title: "Data Analyst & Business Intelligence",
      company: "Kementerian Koordinator Bidang Perekonomian",
      major: "Teknik Informatika, Ilmu Komputer",
      location: "Kota Jakarta Pusat",
      degree: "Sarjana",
      workDays: "5 hari/minggu",
      quota: 4,
      applicants: 5,
      opportunityText: "Peluang Sangat Besar (80%)",
      opportunityRate: 80,
      opportunityLevel: "high",
      category: "data"
    },
    {
      id: "network-cyber-sample-02",
      url: "https://maganghub.kemnaker.go.id/magang-nasional/lowongan",
      title: "Network & Cloud Infrastructure Engineer",
      company: "Pusat Data dan Informasi Kemnaker",
      major: "Teknik Informatika, Teknologi Informasi",
      location: "Kota Jakarta Selatan",
      degree: "Diploma, Sarjana",
      workDays: "5 hari/minggu",
      quota: 2,
      applicants: 2,
      opportunityText: "Peluang Sangat Besar (100%)",
      opportunityRate: 100,
      opportunityLevel: "high",
      category: "network"
    },
    {
      id: "it-support-sample-03",
      url: "https://maganghub.kemnaker.go.id/magang-nasional/lowongan",
      title: "IT Support Specialist & Helpdesk",
      company: "Dinas Komunikasi dan Informatika",
      major: "Teknik Informatika, Manajemen Informatika",
      location: "Kota Bandung",
      degree: "Diploma, Sarjana",
      workDays: "5 hari/minggu",
      quota: 5,
      applicants: 7,
      opportunityText: "Peluang Besar (71%)",
      opportunityRate: 71,
      opportunityLevel: "high",
      category: "support"
    },
    {
      id: "uiux-designer-sample-04",
      url: "https://maganghub.kemnaker.go.id/magang-nasional/lowongan",
      title: "UI/UX & Product Interface Designer",
      company: "Balai Pelatihan Vokasi dan Produktivitas",
      major: "Teknik Informatika, Sistem Informasi, Desain Komputer",
      location: "Kota Bekasi",
      degree: "Sarjana",
      workDays: "5 hari/minggu",
      quota: 2,
      applicants: 1,
      opportunityText: "Peluang Sangat Besar (100%)",
      opportunityRate: 100,
      opportunityLevel: "high",
      category: "uiux"
    }
  ];
}
