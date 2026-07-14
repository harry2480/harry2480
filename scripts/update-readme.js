#!/usr/bin/env node
const fs = require('fs');
const https = require('https');
const path = require('path');

const USERNAME = 'harry2480';
const README_PATH = path.join(__dirname, '..', 'README.md');

function fetchAPI(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path,
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
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject).end();
  });
}

async function fetchGitHubData() {
  return fetchAPI(`/users/${USERNAME}/repos?sort=updated&per_page=100`);
}

async function getRepoLanguages(repo) {
  const data = await fetchAPI(`/repos/${USERNAME}/${repo}/languages`);
  return data || {};
}

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

function generateRepoCard(title, content) {
  return `<div style="display: inline-block; margin: 10px; text-align: center;">
  <a href="https://github.com/${USERNAME}/${title}" style="text-decoration: none;">
    <div style="border: 1px solid #30363d; border-radius: 6px; padding: 16px; background: #0d1117;">
      <h3 style="color: #58a6ff; margin: 0 0 8px 0; font-size: 14px;">${title}</h3>
      ${content}
    </div>
  </a>
</div>`;
}

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

    // README.md を読み込み
    let readmeContent = fs.readFileSync(README_PATH, 'utf8');

    // Stats セクションの更新
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

    // Repository セクションの更新
    const reposHtml = `<!-- BEGIN REPOS -->
[![portfolio](https://img.shields.io/badge/portfolio-GitHub-0d1117?style=for-the-badge&logo=github&logoColor=58a6ff)](https://github.com/harry2480/portfolio)
[![starter--templete](https://img.shields.io/badge/starter--templete-GitHub-0d1117?style=for-the-badge&logo=github&logoColor=58a6ff)](https://github.com/harry2480/starter-templete)
<!-- END REPOS -->`;

    readmeContent = readmeContent.replace(
      /<!-- BEGIN REPOS -->[\s\S]*?<!-- END REPOS -->/,
      reposHtml
    );

    fs.writeFileSync(README_PATH, readmeContent);
    console.log('✅ README.md updated successfully!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

updateReadme();
