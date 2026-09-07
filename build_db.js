const https = require('https');
const fs = require('fs');
const path = require('path');

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
    req.on('timeout', () => { req.destroy(); resolve(''); });
    req.on('error', () => resolve(''));
  });
}

const IT_MAJOR_REGEX = /(teknik\s+)?informatika|ilmu\s+komputer|computer\s+science|sistem\s+informasi|rekayasa\s+perangkat\s+lunak|software\s+engineering|teknologi\s+informasi|manajemen\s+informatika|teknik\s+komputer|sistem\s+komputer|rekayasa\s+sistem\s+komputer/i;
const NON_IT_MAJOR_REGEX = /(administrasi\s+bisnis|administrasi\s+perkantoran|administrasi\s+niaga|akuntansi|keuangan|manajemen\s+keuangan|manajemen\s+pemasaran|manajemen\s+bisnis|manajemen\s+sdm|ekonomi|hukum|kedokteran|keperawatan|kebidanan|farmasi|kesehatan|teknik\s+mesin|teknik\s+sipil|teknik\s+industri|pertanian|peternakan|agribisnis|perhotelan|pariwisata|tata\s+boga|psikologi|hubungan\s+internasional)/i;
const PURE_IT_TITLE_REGEX = /^(it\s+|information\s+technology|software|web|full\s*stack|front\s*end|back\s*end|mobile|android|ios|devops|cloud|cyber|qa\s+|database|penetration\s+tester)/i;

function isITJob(job) {
  const major = (job.major || '').trim();
  const title = (job.title || '').trim();

  if (IT_MAJOR_REGEX.test(major)) return true;
  if (PURE_IT_TITLE_REGEX.test(title) || /programmer|software|developer|full\s*stack|backend|frontend|devops|cyber|cloud|it\s+support|information\s+technology/i.test(title)) {
    if (!NON_IT_MAJOR_REGEX.test(major) || /semua\s+jurusan/i.test(major) || !major) return true;
  }
  if (NON_IT_MAJOR_REGEX.test(major)) return false;
  return false;
}

function assignCategory(job) {
  const text = `${job.title} ${job.major}`.toLowerCase();
  if (/data\s+analyst|data\s+science|data\s+engineer|machine\s+learning|artificial\s+intelligence|\bai\b|bi\b|business\s+intelligence|database/i.test(text)) return 'data';
  if (/network|jaringan|cloud|sysadmin|system\s+admin|devops|cyber|security|infrastruktur|server|mikrotik|cisco/i.test(text)) return 'network';
  if (/it\s+support|helpdesk|teknisi|hardware|maintenance\s+it|staf\s+it|it\s+staff|operasional\s+it/i.test(text)) return 'support';
  if (/ui[\/\s-]?ux|user\s+interface|user\s+experience|product\s+design|tech\s+writer|technical\s+writer/i.test(text)) return 'uiux';
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
      category: '',
      companyWebsite: `https://www.google.com/search?q=${encodeURIComponent(company + ' official website')}`
    };

    if (isITJob(job)) {
      job.category = assignCategory(job);
      cards.push(job);
    }
  }
  return cards;
}

async function buildDatabase() {
  console.log('Building complete IT jobs database...');

  // 1. General listing pages 1..25
  const generalUrls = Array.from({ length: 25 }, (_, i) => 
    `https://maganghub.kemnaker.go.id/magang-nasional/lowongan?page=${i + 1}`
  );

  // 2. Comprehensive IT Keywords
  const itKeywords = [
    { kw: 'information technology', pages: 3 },
    { kw: 'teknik informatika', pages: 3 },
    { kw: 'teknologi informasi', pages: 3 },
    { kw: 'sistem informasi', pages: 3 },
    { kw: 'ilmu komputer', pages: 3 },
    { kw: 'software', pages: 3 },
    { kw: 'programmer', pages: 3 },
    { kw: 'developer', pages: 3 },
    { kw: 'data', pages: 3 },
    { kw: 'network', pages: 3 },
    { kw: 'cyber', pages: 2 },
    { kw: 'cloud', pages: 2 },
    { kw: 'it support', pages: 2 },
    { kw: 'ui/ux', pages: 2 },
    { kw: 'rekayasa perangkat lunak', pages: 2 },
    { kw: 'teknik komputer', pages: 2 },
    { kw: 'database', pages: 2 },
    { kw: 'fullstack', pages: 2 },
    { kw: 'backend', pages: 2 },
    { kw: 'frontend', pages: 2 },
    { kw: 'devops', pages: 2 }
  ];

  const kwUrls = [];
  for (const item of itKeywords) {
    for (let p = 1; p <= item.pages; p++) {
      kwUrls.push(`https://maganghub.kemnaker.go.id/magang-nasional/lowongan?keyword=${encodeURIComponent(item.kw)}&page=${p}`);
    }
  }

  const allUrls = [...generalUrls, ...kwUrls];
  console.log(`Fetching ${allUrls.length} targeted Kemnaker pages...`);

  const batchSize = 15;
  const results = [];
  for (let i = 0; i < allUrls.length; i += batchSize) {
    const batch = allUrls.slice(i, i + batchSize);
    const batchRes = await Promise.all(batch.map(u => fetchPage(u)));
    results.push(...batchRes);
  }

  const jobsMap = new Map();
  for (const html of results) {
    if (!html) continue;
    const cards = parseCards(html);
    for (const c of cards) {
      if (!jobsMap.has(c.id)) {
        jobsMap.set(c.id, c);
      }
    }
  }

  const allJobs = Array.from(jobsMap.values());
  console.log(`Discovered ${allJobs.length} IT vacancies!`);

  const dataDir = path.join(__dirname, 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const dataFile = path.join(dataDir, 'jobs.json');
  fs.writeFileSync(dataFile, JSON.stringify({
    lastUpdated: new Date().toISOString(),
    total: allJobs.length,
    jobs: allJobs
  }, null, 2));

  console.log(`Saved ${allJobs.length} jobs to ${dataFile}`);
}

buildDatabase();
