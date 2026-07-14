#!/usr/bin/env node
const fs = require('fs');
const https = require('https');
const path = require('path');

const USERNAME = 'harry2480';
const README_PATH = path.join(__dirname, '..', 'README.md');

// GitHub API でユーザー情報とリポジトリ情報を取得
async function fetchGitHubData() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: `/users/${USERNAME}/repos?sort=updated&per_page=100`,
      method: 'GET',
      headers: {
        'User-Agent': 'GitHub-Readme-Action',
        'Authorization': `token ${process.env.GITHUB_TOKEN || ''}`
      }
    };

    https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (Array.isArray(parsed)) {
            resolve(parsed);
          } else {
            reject(new Error(`Unexpected API response: ${JSON.stringify(parsed).substring(0, 200)}`));
          }
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject).end();
  });
}

// 言語統計を集計
function calculateLanguages(repos) {
  const languages = {};
  repos.forEach(repo => {
    if (repo.language) {
      languages[repo.language] = (languages[repo.language] || 0) + 1;
    }
  });
  return Object.entries(languages)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
}

// SVG画像を生成
function generateSVG(title, content, width = 400, height = 200) {
  return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <style>
        .stat-box { fill: #0d1117; stroke: #30363d; stroke-width: 1; }
        .title { fill: #58a6ff; font-size: 16px; font-weight: bold; }
        .content { fill: #c9d1d9; font-size: 14px; }
      </style>
    </defs>
    <rect class="stat-box" width="${width}" height="${height}" rx="6" />
    <text class="title" x="20" y="30">${title}</text>
    ${content}
  </svg>`;
}

// README を更新
async function updateReadme() {
  try {
    console.log('📊 Fetching GitHub data...');
    const repos = await fetchGitHubData();

    if (!repos || repos.length === 0) {
      console.error('No repositories found');
      process.exit(1);
    }

    const languages = calculateLanguages(repos);
    const totalRepos = repos.length;
    const totalStars = repos.reduce((sum, r) => sum + (r.stargazers_count || 0), 0);

    // SVG コンテンツを生成
    const topLangsContent = languages
      .map((lang, i) => `<text class="content" x="20" y="${60 + i * 25}">${lang[0]}: ${lang[1]} repos</text>`)
      .join('');

    const statsContent = `<text class="content" x="20" y="60">Repositories: ${totalRepos}</text>
      <text class="content" x="20" y="85">Total Stars: ${totalStars}</text>`;

    const topLangsSvg = generateSVG('Top Languages', topLangsContent).replace(/\n/g, '').replace(/"/g, '\\"');
    const statsSvg = generateSVG('GitHub Stats', statsContent).replace(/\n/g, '').replace(/"/g, '\\"');

    // README.md の統計部分を置き換え
    let readmeContent = fs.readFileSync(README_PATH, 'utf8');

    const statsHtml = `<!-- BEGIN GITHUB STATS -->
<p align="left">
  <img alt="Top Langs" height="195px" src="data:image/svg+xml;base64,${Buffer.from(generateSVG('Top Languages', topLangsContent)).toString('base64')}" />
  <img alt="github stats" height="195px" src="data:image/svg+xml;base64,${Buffer.from(generateSVG('GitHub Stats', statsContent)).toString('base64')}" />
  <img alt="contributions" height="300px" src="https://github-profile-summary-cards.vercel.app/api/cards/profile-details?username=${USERNAME}&theme=2077">
</p>
<!-- END GITHUB STATS -->`;

    readmeContent = readmeContent.replace(
      /<!-- BEGIN GITHUB STATS -->[\s\S]*?<!-- END GITHUB STATS -->/,
      statsHtml
    );

    fs.writeFileSync(README_PATH, readmeContent);
    console.log('✅ README.md updated successfully!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

updateReadme();
