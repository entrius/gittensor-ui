import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import React from 'react';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the dist directory
app.use(express.static(path.join(__dirname, 'dist'), { index: false }));

// Helper to fetch font
let fontData;
function loadFont() {
    if (fontData) return fontData;
    try {
        const fontPath = path.join(__dirname, 'node_modules', '@fontsource', 'inter', 'files', 'inter-latin-700-normal.woff');
        console.log('Loading font from:', fontPath);
        if (!fs.existsSync(fontPath)) {
            console.error('Font file does not exist at:', fontPath);
            return null;
        }
        fontData = fs.readFileSync(fontPath);
        console.log('Font loaded successfully, size:', fontData.length, 'bytes');
        return fontData;
    } catch (e) {
        console.error('Font load error:', e);
        return null;
    }
}

// Helper to fetch API data
async function fetchJson(url) {
    try {
        const res = await fetch(url);
        if (res.ok) return await res.json();
        return null;
    } catch (e) {
        console.error(`Error fetching ${url}:`, e);
        return null;
    }
}

// OG Image Generator Endpoint
app.get('/og-image', async (req, res) => {
    try {
        const { title, subtitle, score, prs, commits, additions, deletions, rank, weight, avatar } = req.query;
        const font = loadFont();

        if (!font) {
            return res.status(500).send('Font not loaded');
        }

        const addVal = parseInt(additions || '0');
        const delVal = parseInt(deletions || '0');
        const totalChanges = addVal + delVal;
        const addPercent = totalChanges > 0 ? (addVal / totalChanges) * 100 : 50;
        const delPercent = totalChanges > 0 ? (delVal / totalChanges) * 100 : 50;

        const svg = await satori(
            React.createElement('div', {
                style: {
                    height: '100%',
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#000000',
                    color: 'white',
                    fontFamily: 'Inter',
                    padding: '40px',
                    position: 'relative',
                }
            }, [
                // Background Grid
                React.createElement('div', {
                    style: {
                        position: 'absolute',
                        top: 0, left: 0, right: 0, bottom: 0,
                        backgroundImage: 'linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)',
                        backgroundSize: '40px 40px',
                        opacity: 0.1,
                    }
                }),
                // Content Container
                React.createElement('div', {
                    style: {
                        display: 'flex',
                        flexDirection: 'row',
                        width: '100%',
                        height: '100%',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                    }
                }, [
                    // Left Side
                    React.createElement('div', {
                        style: {
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            height: '100%',
                            flex: 1,
                            paddingRight: '40px',
                        }
                    }, [
                        // Header
                        React.createElement('div', { style: { display: 'flex', flexDirection: 'column' } }, [
                            React.createElement('div', {
                                style: { fontSize: 24, color: '#888', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '2px' }
                            }, 'Gittensor'),
                            React.createElement('div', {
                                style: { fontSize: 64, fontWeight: 'bold', color: 'white', lineHeight: 1.1, marginBottom: '16px', textShadow: '0 0 20px rgba(0, 255, 255, 0.3)' }
                            }, title || 'Gittensor'),
                            React.createElement('div', {
                                style: { fontSize: 32, color: '#ccc', display: 'flex', alignItems: 'center' }
                            }, [
                                rank ? React.createElement('div', {
                                    style: { backgroundColor: '#00ffcc', color: 'black', padding: '4px 12px', borderRadius: '20px', fontSize: 24, fontWeight: 'bold', marginRight: '16px' }
                                }, `Rank #${rank}`) : null,
                                subtitle
                            ])
                        ]),
                        // Stats Grid
                        React.createElement('div', {
                            style: { display: 'flex', flexDirection: 'row', gap: '40px', marginTop: 'auto' }
                        }, [
                            score ? React.createElement('div', { style: { display: 'flex', flexDirection: 'column' } }, [
                                React.createElement('div', { style: { fontSize: 20, color: '#888' } }, 'Score'),
                                React.createElement('div', { style: { fontSize: 36, fontWeight: 'bold' } }, score)
                            ]) : null,
                            weight ? React.createElement('div', { style: { display: 'flex', flexDirection: 'column' } }, [
                                React.createElement('div', { style: { fontSize: 20, color: '#888' } }, 'Weight'),
                                React.createElement('div', { style: { fontSize: 36, fontWeight: 'bold' } }, weight)
                            ]) : null,
                            prs ? React.createElement('div', { style: { display: 'flex', flexDirection: 'column' } }, [
                                React.createElement('div', { style: { fontSize: 20, color: '#888' } }, 'PRs'),
                                React.createElement('div', { style: { fontSize: 36, fontWeight: 'bold' } }, prs)
                            ]) : null,
                            commits ? React.createElement('div', { style: { display: 'flex', flexDirection: 'column' } }, [
                                React.createElement('div', { style: { fontSize: 20, color: '#888' } }, 'Commits'),
                                React.createElement('div', { style: { fontSize: 36, fontWeight: 'bold' } }, commits)
                            ]) : null,
                        ]),
                        // Code Frequency Bar
                        (addVal > 0 || delVal > 0) ? React.createElement('div', {
                            style: { display: 'flex', flexDirection: 'column', marginTop: '30px' }
                        }, [
                            React.createElement('div', {
                                style: { display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: 20, color: '#aaa' }
                            }, [
                                React.createElement('span', { style: { color: '#4ade80' } }, `+${addVal.toLocaleString()}`),
                                React.createElement('span', { style: { color: '#f87171' } }, `-${delVal.toLocaleString()}`)
                            ]),
                            React.createElement('div', {
                                style: { width: '100%', height: '12px', backgroundColor: '#333', borderRadius: '6px', overflow: 'hidden', display: 'flex' }
                            }, [
                                React.createElement('div', { style: { width: `${addPercent}%`, height: '100%', backgroundColor: '#4ade80' } }),
                                React.createElement('div', { style: { width: `${delPercent}%`, height: '100%', backgroundColor: '#f87171' } })
                            ])
                        ]) : null
                    ]),
                    // Right Side: Avatar
                    avatar ? React.createElement('div', {
                        style: { display: 'flex', alignItems: 'center', justifyContent: 'center' }
                    }, [
                        React.createElement('img', {
                            src: avatar,
                            width: '300',
                            height: '300',
                            style: { borderRadius: '50%', border: '8px solid #333', boxShadow: '0 0 40px rgba(0,0,0,0.5)' }
                        })
                    ]) : null
                ])
            ]),
            {
                width: 1200,
                height: 630,
                fonts: [{ name: 'Inter', data: font, weight: 700, style: 'normal' }],
            }
        );

        const resvg = new Resvg(svg);
        const pngData = resvg.render();
        const pngBuffer = pngData.asPng();

        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Cache-Control', 'public, max-age=3600');
        res.send(pngBuffer);
    } catch (error) {
        console.error('Error generating OG image:', error);
        res.status(500).send('Error generating image');
    }
});

// Dynamic Meta Tags Middleware
app.use(async (req, res, next) => {
    const indexPath = path.join(__dirname, 'dist', 'index.html');

    try {
        let html = fs.readFileSync(indexPath, 'utf8');

        // Default values
        let title = "Gittensor | Autonomous Software Development";
        let description = "The workforce for open source. Compete for rewards by contributing quality code to open source repositories.";
        let image = `${req.protocol}://${req.get('host')}/og-images/gittensor-og.jpg`;

        // Miner Details
        if (req.path === '/miners/details') {
            const githubId = req.query.githubId;
            if (githubId) {
                let username = githubId;
                let rank = null;
                let stats = null;

                // Fetch GitHub username
                if (/^\d+$/.test(githubId)) {
                    const ghData = await fetchJson(`https://api.github.com/user/${githubId}`);
                    if (ghData) username = ghData.login || githubId;
                }

                // Fetch Miner Stats
                stats = await fetchJson(`https://api.gittensor.io/miners/${githubId}/stats`);

                if (stats) {
                    if (stats.rank) rank = stats.rank;

                    const statParts = [];
                    if (rank) statParts.push(`Rank #${rank}`);

                    if (typeof stats.totalScore === 'number') {
                        statParts.push(`Score: ${stats.totalScore.toFixed(2)}`);
                    }

                    if (stats.totalPRs) statParts.push(`${stats.totalPRs} PRs`);

                    if (stats.totalAdditions || stats.totalDeletions) {
                        statParts.push(`${(stats.totalAdditions || 0).toLocaleString()}+ / ${(stats.totalDeletions || 0).toLocaleString()}- lines`);
                    }

                    if (stats.totalOpenPrs > 0) statParts.push(`${stats.totalOpenPrs} open`);

                    description = statParts.join(' • ');
                } else {
                    description = `View detailed statistics for ${username} on Gittensor.`;
                }

                title = rank ? `${username} | Rank #${rank} | Gittensor` : `${username} | Gittensor`;

                // Construct Dynamic Image URL
                const imgParams = new URLSearchParams();
                imgParams.set("title", username);
                imgParams.set("subtitle", "Gittensor Miner");
                imgParams.set("avatar", /^\d+$/.test(githubId) ? `https://avatars.githubusercontent.com/u/${githubId}?s=400` : `https://github.com/${githubId}.png?size=400`);
                if (rank) imgParams.set("rank", rank);
                if (stats) {
                    if (typeof stats.totalScore === 'number') imgParams.set("score", stats.totalScore.toFixed(2));
                    if (stats.totalPRs) imgParams.set("prs", stats.totalPRs);
                    if (stats.totalAdditions) imgParams.set("additions", stats.totalAdditions);
                    if (stats.totalDeletions) imgParams.set("deletions", stats.totalDeletions);
                }
                image = `${req.protocol}://${req.get('host')}/og-image?${imgParams.toString()}`;
            }
        }

        // Repository Details
        if (req.path === '/miners/repository') {
            const repo = req.query.name;
            if (repo) {
                const repoOwner = repo.split('/')[0];
                const repoName = repo.split('/')[1] || repo;

                const stats = await fetchJson(`https://api.gittensor.io/miners/repository/${encodeURIComponent(repo)}/stats`);

                if (stats) {
                    const statParts = [];
                    if (stats.totalContributors) statParts.push(`${stats.totalContributors} contributors`);
                    if (stats.totalPRs) statParts.push(`${stats.totalPRs} PRs`);
                    if (stats.totalCommits) statParts.push(`${stats.totalCommits} commits`);
                    if (stats.totalAdditions || stats.totalDeletions) {
                        statParts.push(`${(stats.totalAdditions || 0).toLocaleString()}+ / ${(stats.totalDeletions || 0).toLocaleString()}- lines`);
                    }
                    if (typeof stats.weight === 'number') statParts.push(`Weight: ${stats.weight.toFixed(4)}`);

                    description = statParts.join(' • ');
                } else {
                    description = `View detailed statistics for ${repo} on Gittensor.`;
                }

                title = `${repoName} | Gittensor`;

                // Construct Dynamic Image URL
                const imgParams = new URLSearchParams();
                imgParams.set("title", repoName);
                imgParams.set("subtitle", repoOwner);
                imgParams.set("avatar", `https://github.com/${repoOwner}.png?size=400`);
                if (stats) {
                    if (typeof stats.weight === 'number') imgParams.set("weight", stats.weight.toFixed(4));
                    if (stats.totalPRs) imgParams.set("prs", stats.totalPRs);
                    if (stats.totalCommits) imgParams.set("commits", stats.totalCommits);
                    if (stats.totalAdditions) imgParams.set("additions", stats.totalAdditions);
                    if (stats.totalDeletions) imgParams.set("deletions", stats.totalDeletions);
                }
                image = `${req.protocol}://${req.get('host')}/og-image?${imgParams.toString()}`;
            }
        }

        // Replace Meta Tags
        html = html
            .replace(/<title>.*?<\/title>/, `<title>${title}</title>`)
            .replace(/content="Gittensor \| Autonomous Software Development"/g, `content="${title}"`)
            .replace(/content="The workforce for open source.*?"/g, `content="${description}"`)
            .replace(/content=".*?\/og-images\/gittensor-og.jpg"/g, `content="${image}"`)
            .replace(/property="og:title" content=".*?"/, `property="og:title" content="${title}"`)
            .replace(/property="og:description" content=".*?"/, `property="og:description" content="${description}"`)
            .replace(/property="og:image" content=".*?"/, `property="og:image" content="${image}"`)
            .replace(/name="twitter:title" content=".*?"/, `name="twitter:title" content="${title}"`)
            .replace(/name="twitter:description" content=".*?"/, `name="twitter:description" content="${description}"`)
            .replace(/name="twitter:image" content=".*?"/, `name="twitter:image" content="${image}"`);

        res.send(html);
    } catch (err) {
        console.error('Error serving index.html:', err);
        next();
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
