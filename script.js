// Initialize empty games data array
let gamesData = [];
let allPlayers = [];

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    loadGamesData();
});

async function loadGamesData() {
    const loadingArea = document.getElementById('loadingArea');
    const statsArea = document.getElementById('statsArea');
    const mainHeader = document.getElementById('mainHeader');
    
    try {
        const response = await fetch('gameshistory.json');
        gamesData = await response.json();
        
        console.log(`Loaded ${gamesData.length} games`);
        
        // Build list of all unique players
        buildPlayerList();
        
        loadingArea.style.display = 'none';
        statsArea.style.display = 'block';
        if (mainHeader) mainHeader.classList.add('loaded');
        
        renderGamesList();
        renderLeaderboard();
        populatePVPSelectors();
        initializeSearch();
    } catch (error) {
        console.error('Error loading games data:', error);
        loadingArea.innerHTML = '<div class="loading-message">[ ERROR LOADING GAME DATA ]</div>';
    }
}

function buildPlayerList() {
    const playerSet = new Set();
    gamesData.forEach(game => {
        if (game.players) {
            game.players.forEach(player => {
                if (player.name) playerSet.add(player.name);
            });
        }
    });
    allPlayers = Array.from(playerSet).sort();
}

// Tab switching
function switchMainTab(tabName) {
    const allMainTabs = document.querySelectorAll('.main-tab-content');
    allMainTabs.forEach(tab => tab.style.display = 'none');
    
    const allMainBtns = document.querySelectorAll('.main-tab-btn');
    allMainBtns.forEach(btn => btn.classList.remove('active'));
    
    const selectedTab = document.getElementById('main-tab-' + tabName);
    if (selectedTab) {
        selectedTab.style.display = 'block';
    }
    
    const selectedBtn = document.getElementById('btn-main-' + tabName);
    if (selectedBtn) {
        selectedBtn.classList.add('active');
    }
}

// Game rendering
function renderGamesList() {
    const gamesList = document.getElementById('gamesList');
    if (!gamesList) return;
    
    if (gamesData.length === 0) {
        gamesList.innerHTML = '<div class="loading-message">No games to display</div>';
        return;
    }
    
    gamesList.innerHTML = '';
    
    gamesData.forEach((game, index) => {
        const gameNumber = gamesData.length - index;
        const gameItem = createGameItem(game, gameNumber, index);
        gamesList.appendChild(gameItem);
    });
}

function createGameItem(game, gameNumber, index) {
    const gameDiv = document.createElement('div');
    gameDiv.className = 'game-item';
    gameDiv.id = `game-${index}`;
    
    const details = game.details || {};
    const players = game.players || [];
    
    let displayGameType = details['Variant Name'] || details['Game Type'] || 'Unknown';
    let mapName = details['Map Name'] || 'Unknown Map';
    let duration = details['Duration'] || '0:00';
    
    gameDiv.innerHTML = `
        <div class="game-header-bar" onclick="toggleGameDetails(${index})">
            <div class="game-header-left">
                <div class="game-number">GAME ${gameNumber}</div>
                <div class="game-info">
                    <span class="game-meta-tag">${displayGameType}</span>
                    <span class="game-meta-tag">${mapName}</span>
                    <span class="game-meta-tag">${duration}</span>
                </div>
            </div>
            <div class="game-expand-icon">▼</div>
        </div>
        <div class="game-details">
            <div class="game-tabs">
                <button class="game-tab-btn active" onclick="event.stopPropagation(); switchGameTab(${index}, 'scoreboard')">Scoreboard</button>
                <button class="game-tab-btn" onclick="event.stopPropagation(); switchGameTab(${index}, 'stats')">Game Stats</button>
                <button class="game-tab-btn" onclick="event.stopPropagation(); switchGameTab(${index}, 'medals')">Medals</button>
                <button class="game-tab-btn" onclick="event.stopPropagation(); switchGameTab(${index}, 'weapons')">Weapons</button>
            </div>
            <div id="game-${index}-scoreboard" class="game-tab-content active">
                ${renderScoreboard(game)}
            </div>
            <div id="game-${index}-stats" class="game-tab-content">
                ${renderGameStats(game)}
            </div>
            <div id="game-${index}-medals" class="game-tab-content">
                ${renderMedals(game)}
            </div>
            <div id="game-${index}-weapons" class="game-tab-content">
                ${renderWeapons(game)}
            </div>
        </div>
    `;
    
    return gameDiv;
}

function toggleGameDetails(index) {
    const gameItem = document.getElementById(`game-${index}`);
    if (gameItem) {
        gameItem.classList.toggle('expanded');
    }
}

function switchGameTab(gameIndex, tabName) {
    const gameItem = document.getElementById(`game-${gameIndex}`);
    if (!gameItem) return;
    
    const tabs = gameItem.querySelectorAll('.game-tab-content');
    tabs.forEach(tab => tab.classList.remove('active'));
    
    const btns = gameItem.querySelectorAll('.game-tab-btn');
    btns.forEach(btn => btn.classList.remove('active'));
    
    const selectedTab = document.getElementById(`game-${gameIndex}-${tabName}`);
    if (selectedTab) selectedTab.classList.add('active');
    
    event.target.classList.add('active');
}

function renderScoreboard(game) {
    const players = game.players || [];
    if (players.length === 0) return '<div class="pvp-placeholder">No player data</div>';
    
    // Check if team game
    const hasTeams = players.some(p => p.team && p.team !== 'none' && p.team !== 'FFA');
    
    // Sort by team (Red first, then Blue) then by score
    let sortedPlayers = [...players];
    if (hasTeams) {
        sortedPlayers.sort((a, b) => {
            const teamOrder = { 'Red': 0, 'Blue': 1 };
            const teamA = teamOrder[a.team] ?? 2;
            const teamB = teamOrder[b.team] ?? 2;
            if (teamA !== teamB) return teamA - teamB;
            return (b.score || 0) - (a.score || 0);
        });
    } else {
        sortedPlayers.sort((a, b) => (b.score || 0) - (a.score || 0));
    }
    
    let html = `
        <div class="scoreboard">
            <div class="scoreboard-header">
                <div>Player</div>
                <div>Score</div>
                <div>K</div>
                <div>D</div>
                <div>A</div>
                <div>K/D</div>
            </div>
    `;
    
    sortedPlayers.forEach(player => {
        const kd = player.deaths > 0 ? (player.kills / player.deaths).toFixed(2) : player.kills.toFixed(2);
        const teamClass = hasTeams && player.team ? `team-${player.team.toLowerCase()}` : '';
        
        html += `
            <div class="scoreboard-row ${teamClass}" onclick="event.stopPropagation(); showPlayerModal('${player.name}')">
                <div>
                    <span class="player-name-text">${player.name}</span>
                    ${hasTeams && player.team ? `<span class="team-badge team-${player.team.toLowerCase()}">${player.team}</span>` : ''}
                </div>
                <div>${player.score || 0}</div>
                <div>${player.kills || 0}</div>
                <div>${player.deaths || 0}</div>
                <div>${player.assists || 0}</div>
                <div>${kd}</div>
            </div>
        `;
    });
    
    html += '</div>';
    return html;
}

function renderGameStats(game) {
    const stats = game.stats || [];
    if (stats.length === 0) return '<div class="pvp-placeholder">No detailed stats available</div>';
    
    let html = '<div class="stats-grid">';
    
    stats.forEach(stat => {
        const playerName = stat.Player || 'Unknown';
        html += `<div style="grid-column: 1 / -1; margin-top: 15px;"><strong style="color: var(--halo-blue);">${playerName}</strong></div>`;
        
        Object.entries(stat).forEach(([key, value]) => {
            if (key !== 'Player' && value !== undefined && value !== null && value !== '') {
                html += `
                    <div class="stat-card">
                        <div class="stat-label">${key}</div>
                        <div class="stat-value">${value}</div>
                    </div>
                `;
            }
        });
    });
    
    html += '</div>';
    return html;
}

function renderMedals(game) {
    const medals = game.medals || [];
    if (medals.length === 0) return '<div class="pvp-placeholder">No medals data available</div>';
    
    // Group medals by player
    const medalsByPlayer = {};
    medals.forEach(medal => {
        const player = medal.player || medal.Player || 'Unknown';
        if (!medalsByPlayer[player]) medalsByPlayer[player] = [];
        medalsByPlayer[player].push(medal);
    });
    
    let html = '';
    Object.entries(medalsByPlayer).forEach(([player, playerMedals]) => {
        html += `<div style="margin-bottom: 20px;"><strong style="color: var(--halo-blue);">${player}</strong></div>`;
        html += '<div class="medals-grid">';
        
        playerMedals.forEach(medal => {
            const medalName = medal.medal || medal.Medal || 'Unknown';
            const count = medal.count || medal.Count || 1;
            html += `
                <div class="medal-item">
                    <span class="medal-name">${medalName}</span>
                    <span class="medal-count">${count}</span>
                </div>
            `;
        });
        
        html += '</div>';
    });
    
    return html || '<div class="pvp-placeholder">No medals data available</div>';
}

function renderWeapons(game) {
    const weapons = game.weapons || [];
    if (weapons.length === 0) return '<div class="pvp-placeholder">No weapons data available</div>';
    
    let html = `
        <table class="weapons-table">
            <thead>
                <tr>
                    <th>Player</th>
                    <th>Weapon</th>
                    <th>Kills</th>
                    <th>Headshots</th>
                    <th>Accuracy</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    weapons.forEach(weapon => {
        html += `
            <tr>
                <td>${weapon.Player || weapon.player || '-'}</td>
                <td>${weapon.Weapon || weapon.weapon || '-'}</td>
                <td>${weapon.Kills || weapon.kills || 0}</td>
                <td>${weapon.Headshots || weapon.headshots || 0}</td>
                <td>${weapon.Accuracy || weapon.accuracy || '-'}</td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    return html;
}

// Leaderboard
function renderLeaderboard() {
    const container = document.getElementById('leaderboardContainer');
    if (!container) return;
    
    const playerStats = calculateAllPlayerStats();
    const sortedPlayers = Object.entries(playerStats)
        .sort((a, b) => {
            // Sort by wins first, then by K/D
            if (b[1].wins !== a[1].wins) return b[1].wins - a[1].wins;
            return b[1].kd - a[1].kd;
        });
    
    let html = `
        <div class="leaderboard-header">
            <div>#</div>
            <div>Lvl</div>
            <div>Player</div>
            <div>Record</div>
            <div>K/D/A</div>
            <div>K/D</div>
        </div>
    `;
    
    sortedPlayers.forEach(([name, stats], index) => {
        const rank = index + 1;
        const rankClass = rank === 1 ? 'rank-1' : rank === 2 ? 'rank-2' : rank === 3 ? 'rank-3' : '';
        const rankColor = rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : '';
        const level = calculateLevel(stats.xp || 0);
        
        html += `
            <div class="leaderboard-row ${rankClass}" onclick="showPlayerModal('${name}')">
                <div class="lb-rank ${rankColor}">${rank}</div>
                <div class="level-badge">${level}</div>
                <div class="lb-player">${name}</div>
                <div class="lb-record"><span class="wins">${stats.wins}</span> - <span class="losses">${stats.losses}</span></div>
                <div>${stats.kills}/${stats.deaths}/${stats.assists}</div>
                <div class="lb-kd">${stats.kd.toFixed(2)}</div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function calculateAllPlayerStats() {
    const playerStats = {};
    
    gamesData.forEach(game => {
        const players = game.players || [];
        const hasTeams = players.some(p => p.team && p.team !== 'none' && p.team !== 'FFA');
        
        // Determine winning team/player
        let winningTeam = null;
        let winningPlayer = null;
        
        if (hasTeams) {
            const teamScores = {};
            players.forEach(p => {
                if (p.team) {
                    teamScores[p.team] = (teamScores[p.team] || 0) + (p.score || 0);
                }
            });
            winningTeam = Object.entries(teamScores).sort((a, b) => b[1] - a[1])[0]?.[0];
        } else {
            const sorted = [...players].sort((a, b) => (b.score || 0) - (a.score || 0));
            winningPlayer = sorted[0]?.name;
        }
        
        players.forEach(player => {
            const name = player.name;
            if (!name) return;
            
            if (!playerStats[name]) {
                playerStats[name] = {
                    games: 0,
                    wins: 0,
                    losses: 0,
                    kills: 0,
                    deaths: 0,
                    assists: 0,
                    score: 0,
                    xp: 0
                };
            }
            
            const stats = playerStats[name];
            stats.games++;
            stats.kills += player.kills || 0;
            stats.deaths += player.deaths || 0;
            stats.assists += player.assists || 0;
            stats.score += player.score || 0;
            
            // Determine win/loss
            const isWinner = hasTeams ? player.team === winningTeam : player.name === winningPlayer;
            if (isWinner) {
                stats.wins++;
                stats.xp += 50;
            } else {
                stats.losses++;
                stats.xp = Math.max(0, stats.xp - 10);
            }
        });
    });
    
    // Calculate K/D for each player
    Object.values(playerStats).forEach(stats => {
        stats.kd = stats.deaths > 0 ? stats.kills / stats.deaths : stats.kills;
    });
    
    return playerStats;
}

function calculateLevel(xp) {
    const xpThresholds = [
        0, 100, 200, 300, 400, 500, 600, 700, 800, 900,
        1000, 1100, 1250, 1400, 1550, 1700, 1850, 2000, 2200, 2400,
        2650, 2900, 3150, 3450, 3750, 4100, 4450, 4850, 5250, 5700,
        6150, 6650, 7150, 7700, 8250, 8850, 9450, 10100, 10750, 11450,
        12150, 12900, 13650, 14450, 15250, 16100, 17000, 17900, 18850, 19800
    ];
    
    for (let i = xpThresholds.length - 1; i >= 0; i--) {
        if (xp >= xpThresholds[i]) return i + 1;
    }
    return 1;
}

// Search functionality
function initializeSearch() {
    const searchInput = document.getElementById('playerSearch');
    const searchResults = document.getElementById('searchResults');
    
    if (!searchInput || !searchResults) return;
    
    searchInput.addEventListener('input', function(e) {
        const query = e.target.value.toLowerCase().trim();
        
        if (query.length < 2) {
            searchResults.classList.remove('active');
            return;
        }
        
        const results = [];
        
        // Search players
        allPlayers.forEach(player => {
            if (player.toLowerCase().includes(query)) {
                results.push({ type: 'player', name: player });
            }
        });
        
        // Search maps and game types
        const maps = new Set();
        const gameTypes = new Set();
        gamesData.forEach(game => {
            const map = game.details?.['Map Name'];
            const gameType = game.details?.['Variant Name'] || game.details?.['Game Type'];
            if (map) maps.add(map);
            if (gameType) gameTypes.add(gameType);
        });
        
        maps.forEach(map => {
            if (map.toLowerCase().includes(query)) {
                results.push({ type: 'map', name: map });
            }
        });
        
        gameTypes.forEach(gt => {
            if (gt.toLowerCase().includes(query)) {
                results.push({ type: 'gametype', name: gt });
            }
        });
        
        if (results.length > 0) {
            searchResults.innerHTML = results.slice(0, 10).map(r => `
                <div class="search-result-item" onclick="handleSearchResult('${r.type}', '${r.name}')">
                    <div class="search-result-type">${r.type}</div>
                    <div class="search-result-name">${r.name}</div>
                </div>
            `).join('');
            searchResults.classList.add('active');
        } else {
            searchResults.classList.remove('active');
        }
    });
    
    // Close search results when clicking outside
    document.addEventListener('click', function(e) {
        if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
            searchResults.classList.remove('active');
        }
    });
}

function handleSearchResult(type, name) {
    document.getElementById('searchResults').classList.remove('active');
    document.getElementById('playerSearch').value = '';
    
    if (type === 'player') {
        showPlayerModal(name);
    }
    // Could add map/gametype filtering here
}

// Player Modal
function showPlayerModal(playerName) {
    const modal = document.getElementById('playerModal');
    const nameEl = document.getElementById('modalPlayerName');
    const statsEl = document.getElementById('modalPlayerStats');
    
    if (!modal || !nameEl || !statsEl) return;
    
    const allStats = calculateAllPlayerStats();
    const stats = allStats[playerName];
    
    if (!stats) {
        nameEl.textContent = playerName;
        statsEl.innerHTML = '<div class="pvp-placeholder">No stats found for this player</div>';
    } else {
        nameEl.textContent = playerName;
        statsEl.innerHTML = `
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-label">Games</div>
                    <div class="stat-value">${stats.games}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Wins</div>
                    <div class="stat-value" style="color: #2ecc71;">${stats.wins}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Losses</div>
                    <div class="stat-value" style="color: #e74c3c;">${stats.losses}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Win %</div>
                    <div class="stat-value">${stats.games > 0 ? ((stats.wins / stats.games) * 100).toFixed(1) : 0}%</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Kills</div>
                    <div class="stat-value">${stats.kills}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Deaths</div>
                    <div class="stat-value">${stats.deaths}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Assists</div>
                    <div class="stat-value">${stats.assists}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">K/D Ratio</div>
                    <div class="stat-value">${stats.kd.toFixed(2)}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Total Score</div>
                    <div class="stat-value">${stats.score}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Level</div>
                    <div class="stat-value">${calculateLevel(stats.xp)}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">XP</div>
                    <div class="stat-value">${stats.xp}</div>
                </div>
            </div>
        `;
    }
    
    modal.classList.add('active');
}

function closePlayerModal() {
    const modal = document.getElementById('playerModal');
    if (modal) modal.classList.remove('active');
}

// Close modal when clicking outside
document.addEventListener('click', function(e) {
    const modal = document.getElementById('playerModal');
    if (modal && e.target === modal) {
        closePlayerModal();
    }
});

// =============================================
// PLAYER VS PLAYER COMPARISON
// =============================================

function populatePVPSelectors() {
    const select1 = document.getElementById('pvpPlayer1');
    const select2 = document.getElementById('pvpPlayer2');
    
    if (!select1 || !select2) return;
    
    const options = allPlayers.map(p => `<option value="${p}">${p}</option>`).join('');
    
    select1.innerHTML = '<option value="">-- Select Player --</option>' + options;
    select2.innerHTML = '<option value="">-- Select Player --</option>' + options;
}

function updatePVPComparison() {
    const player1 = document.getElementById('pvpPlayer1').value;
    const player2 = document.getElementById('pvpPlayer2').value;
    const resultsDiv = document.getElementById('pvpResults');
    
    if (!player1 || !player2) {
        resultsDiv.innerHTML = '<div class="pvp-placeholder">Select two players above to see their comparison</div>';
        return;
    }
    
    if (player1 === player2) {
        resultsDiv.innerHTML = '<div class="pvp-placeholder">Please select two different players</div>';
        return;
    }
    
    // Calculate head-to-head stats
    const h2h = calculateHeadToHead(player1, player2);
    const overallStats = calculateAllPlayerStats();
    const p1Stats = overallStats[player1] || createEmptyStats();
    const p2Stats = overallStats[player2] || createEmptyStats();
    const breakdown = calculateMapGameTypeBreakdown(player1, player2);
    
    resultsDiv.innerHTML = `
        ${renderH2HSection(player1, player2, h2h)}
        ${renderOverallComparison(player1, player2, p1Stats, p2Stats)}
        ${renderMapBreakdown(player1, player2, breakdown.maps)}
        ${renderGameTypeBreakdown(player1, player2, breakdown.gameTypes)}
    `;
}

function createEmptyStats() {
    return { games: 0, wins: 0, losses: 0, kills: 0, deaths: 0, assists: 0, score: 0, kd: 0, xp: 0 };
}

function calculateHeadToHead(player1, player2) {
    const h2h = {
        gamesPlayed: 0,
        p1Wins: 0,
        p2Wins: 0,
        p1KillsVsP2: 0,  // How many times P1 killed P2
        p2KillsVsP1: 0,  // How many times P2 killed P1
        p1TotalKills: 0,
        p2TotalKills: 0,
        p1TotalDeaths: 0,
        p2TotalDeaths: 0,
        sameTeamGames: 0,
        oppositeTeamGames: 0
    };
    
    gamesData.forEach(game => {
        const players = game.players || [];
        const p1Data = players.find(p => p.name === player1);
        const p2Data = players.find(p => p.name === player2);
        
        // Both players must be in the game
        if (!p1Data || !p2Data) return;
        
        h2h.gamesPlayed++;
        
        const hasTeams = players.some(p => p.team && p.team !== 'none' && p.team !== 'FFA');
        const sameTeam = hasTeams && p1Data.team === p2Data.team;
        
        if (sameTeam) {
            h2h.sameTeamGames++;
        } else {
            h2h.oppositeTeamGames++;
        }
        
        // Track kills/deaths in shared games
        h2h.p1TotalKills += p1Data.kills || 0;
        h2h.p2TotalKills += p2Data.kills || 0;
        h2h.p1TotalDeaths += p1Data.deaths || 0;
        h2h.p2TotalDeaths += p2Data.deaths || 0;
        
        // Determine winner
        if (hasTeams) {
            const teamScores = {};
            players.forEach(p => {
                if (p.team) teamScores[p.team] = (teamScores[p.team] || 0) + (p.score || 0);
            });
            const winningTeam = Object.entries(teamScores).sort((a, b) => b[1] - a[1])[0]?.[0];
            
            if (!sameTeam) {
                if (p1Data.team === winningTeam) h2h.p1Wins++;
                else if (p2Data.team === winningTeam) h2h.p2Wins++;
            }
        } else {
            // FFA - who placed higher
            if ((p1Data.score || 0) > (p2Data.score || 0)) h2h.p1Wins++;
            else if ((p2Data.score || 0) > (p1Data.score || 0)) h2h.p2Wins++;
        }
        
        // Estimate head-to-head kills (in opposite team games)
        // Since we don't have exact kill feed data, we estimate based on their kills
        // when on opposite teams
        if (!sameTeam && hasTeams) {
            // Rough estimate: if they're on opposite teams, some portion of their kills
            // were likely against each other. We'll use deaths as a proxy.
            // This is an approximation since we don't have exact victim data.
            const otherTeamDeaths = {};
            players.forEach(p => {
                if (p.team && p.team !== p1Data.team) {
                    otherTeamDeaths[p1Data.team] = (otherTeamDeaths[p1Data.team] || 0) + (p.deaths || 0);
                }
                if (p.team && p.team !== p2Data.team) {
                    otherTeamDeaths[p2Data.team] = (otherTeamDeaths[p2Data.team] || 0) + (p.deaths || 0);
                }
            });
            
            // Estimate based on kill distribution
            const p1TeamKills = players.filter(p => p.team === p1Data.team).reduce((sum, p) => sum + (p.kills || 0), 0);
            const p2TeamKills = players.filter(p => p.team === p2Data.team).reduce((sum, p) => sum + (p.kills || 0), 0);
            
            if (p1TeamKills > 0) {
                const p1KillShare = (p1Data.kills || 0) / p1TeamKills;
                h2h.p1KillsVsP2 += Math.round(p1KillShare * (p2Data.deaths || 0));
            }
            if (p2TeamKills > 0) {
                const p2KillShare = (p2Data.kills || 0) / p2TeamKills;
                h2h.p2KillsVsP1 += Math.round(p2KillShare * (p1Data.deaths || 0));
            }
        }
    });
    
    return h2h;
}

function calculateMapGameTypeBreakdown(player1, player2) {
    const maps = {};
    const gameTypes = {};
    
    gamesData.forEach(game => {
        const players = game.players || [];
        const p1Data = players.find(p => p.name === player1);
        const p2Data = players.find(p => p.name === player2);
        
        if (!p1Data || !p2Data) return;
        
        const mapName = game.details?.['Map Name'] || 'Unknown';
        const gameType = game.details?.['Variant Name'] || game.details?.['Game Type'] || 'Unknown';
        
        const hasTeams = players.some(p => p.team && p.team !== 'none' && p.team !== 'FFA');
        const sameTeam = hasTeams && p1Data.team === p2Data.team;
        
        // Only count games where they're on opposite teams for win comparison
        if (sameTeam) return;
        
        // Determine winner
        let p1Won = false, p2Won = false;
        if (hasTeams) {
            const teamScores = {};
            players.forEach(p => {
                if (p.team) teamScores[p.team] = (teamScores[p.team] || 0) + (p.score || 0);
            });
            const winningTeam = Object.entries(teamScores).sort((a, b) => b[1] - a[1])[0]?.[0];
            p1Won = p1Data.team === winningTeam;
            p2Won = p2Data.team === winningTeam;
        } else {
            p1Won = (p1Data.score || 0) > (p2Data.score || 0);
            p2Won = (p2Data.score || 0) > (p1Data.score || 0);
        }
        
        // Track by map
        if (!maps[mapName]) maps[mapName] = { p1Wins: 0, p2Wins: 0, total: 0 };
        maps[mapName].total++;
        if (p1Won) maps[mapName].p1Wins++;
        if (p2Won) maps[mapName].p2Wins++;
        
        // Track by game type
        if (!gameTypes[gameType]) gameTypes[gameType] = { p1Wins: 0, p2Wins: 0, total: 0 };
        gameTypes[gameType].total++;
        if (p1Won) gameTypes[gameType].p1Wins++;
        if (p2Won) gameTypes[gameType].p2Wins++;
    });
    
    return { maps, gameTypes };
}

function renderH2HSection(player1, player2, h2h) {
    if (h2h.gamesPlayed === 0) {
        return `
            <div class="pvp-h2h">
                <div class="pvp-h2h-title">Head to Head</div>
                <div class="pvp-placeholder">These players have not played in any games together</div>
            </div>
        `;
    }
    
    const p1WinsBetter = h2h.p1Wins > h2h.p2Wins;
    const p2WinsBetter = h2h.p2Wins > h2h.p1Wins;
    const p1KillsBetter = h2h.p1KillsVsP2 > h2h.p2KillsVsP1;
    const p2KillsBetter = h2h.p2KillsVsP1 > h2h.p1KillsVsP2;
    
    return `
        <div class="pvp-h2h">
            <div class="pvp-h2h-title">Head to Head (${h2h.gamesPlayed} games together)</div>
            <div class="pvp-h2h-stats">
                <div class="pvp-player-card ${p1WinsBetter ? 'winner' : ''}">
                    <div class="pvp-player-name">${player1}</div>
                    <div class="pvp-stat-row">
                        <span class="pvp-stat-label">Wins vs ${player2}</span>
                        <span class="pvp-stat-value ${p1WinsBetter ? 'highlight' : ''}">${h2h.p1Wins}</span>
                    </div>
                    <div class="pvp-stat-row">
                        <span class="pvp-stat-label">Est. Kills on ${player2}</span>
                        <span class="pvp-stat-value ${p1KillsBetter ? 'highlight' : ''}">${h2h.p1KillsVsP2}</span>
                    </div>
                    <div class="pvp-stat-row">
                        <span class="pvp-stat-label">Kills (in shared games)</span>
                        <span class="pvp-stat-value">${h2h.p1TotalKills}</span>
                    </div>
                    <div class="pvp-stat-row">
                        <span class="pvp-stat-label">Deaths (in shared games)</span>
                        <span class="pvp-stat-value">${h2h.p1TotalDeaths}</span>
                    </div>
                </div>
                
                <div class="pvp-divider">
                    <div class="pvp-divider-line"></div>
                    <div class="pvp-divider-text">VS</div>
                    <div class="pvp-divider-line"></div>
                </div>
                
                <div class="pvp-player-card ${p2WinsBetter ? 'winner' : ''}">
                    <div class="pvp-player-name">${player2}</div>
                    <div class="pvp-stat-row">
                        <span class="pvp-stat-label">Wins vs ${player1}</span>
                        <span class="pvp-stat-value ${p2WinsBetter ? 'highlight' : ''}">${h2h.p2Wins}</span>
                    </div>
                    <div class="pvp-stat-row">
                        <span class="pvp-stat-label">Est. Kills on ${player1}</span>
                        <span class="pvp-stat-value ${p2KillsBetter ? 'highlight' : ''}">${h2h.p2KillsVsP1}</span>
                    </div>
                    <div class="pvp-stat-row">
                        <span class="pvp-stat-label">Kills (in shared games)</span>
                        <span class="pvp-stat-value">${h2h.p2TotalKills}</span>
                    </div>
                    <div class="pvp-stat-row">
                        <span class="pvp-stat-label">Deaths (in shared games)</span>
                        <span class="pvp-stat-value">${h2h.p2TotalDeaths}</span>
                    </div>
                </div>
            </div>
            <div style="text-align: center; margin-top: 15px; color: var(--text-secondary); font-size: 12px;">
                ${h2h.sameTeamGames > 0 ? `Teammates: ${h2h.sameTeamGames} games` : ''} 
                ${h2h.sameTeamGames > 0 && h2h.oppositeTeamGames > 0 ? ' | ' : ''}
                ${h2h.oppositeTeamGames > 0 ? `Opponents: ${h2h.oppositeTeamGames} games` : ''}
            </div>
        </div>
    `;
}

function renderOverallComparison(player1, player2, p1Stats, p2Stats) {
    const comparisons = [
        { label: 'Games', p1: p1Stats.games, p2: p2Stats.games },
        { label: 'Wins', p1: p1Stats.wins, p2: p2Stats.wins },
        { label: 'Losses', p1: p1Stats.losses, p2: p2Stats.losses },
        { label: 'Win %', p1: p1Stats.games > 0 ? ((p1Stats.wins / p1Stats.games) * 100).toFixed(1) : '0', p2: p2Stats.games > 0 ? ((p2Stats.wins / p2Stats.games) * 100).toFixed(1) : '0', suffix: '%', higherBetter: true },
        { label: 'Kills', p1: p1Stats.kills, p2: p2Stats.kills },
        { label: 'Deaths', p1: p1Stats.deaths, p2: p2Stats.deaths, higherBetter: false },
        { label: 'Assists', p1: p1Stats.assists, p2: p2Stats.assists },
        { label: 'K/D', p1: p1Stats.kd.toFixed(2), p2: p2Stats.kd.toFixed(2), higherBetter: true },
        { label: 'Total Score', p1: p1Stats.score, p2: p2Stats.score },
        { label: 'Level', p1: calculateLevel(p1Stats.xp), p2: calculateLevel(p2Stats.xp) },
    ];
    
    let html = `
        <div class="pvp-overall">
            <div class="pvp-section-title">Overall Stats Comparison</div>
            <div class="pvp-comparison-grid">
    `;
    
    comparisons.forEach(comp => {
        const p1Val = parseFloat(comp.p1);
        const p2Val = parseFloat(comp.p2);
        const higherBetter = comp.higherBetter !== false;
        
        let p1Better, p2Better;
        if (higherBetter) {
            p1Better = p1Val > p2Val;
            p2Better = p2Val > p1Val;
        } else {
            p1Better = p1Val < p2Val;
            p2Better = p2Val < p1Val;
        }
        
        html += `
            <div class="pvp-compare-item">
                <div class="pvp-compare-value left ${p1Better ? 'better' : p2Better ? 'worse' : ''}">${comp.p1}${comp.suffix || ''}</div>
                <div class="pvp-compare-label">${comp.label}</div>
                <div class="pvp-compare-value right ${p2Better ? 'better' : p1Better ? 'worse' : ''}">${comp.p2}${comp.suffix || ''}</div>
            </div>
        `;
    });
    
    html += '</div></div>';
    return html;
}

function renderMapBreakdown(player1, player2, maps) {
    const mapEntries = Object.entries(maps);
    if (mapEntries.length === 0) {
        return '';
    }
    
    let html = `
        <div class="pvp-breakdown">
            <div class="pvp-section-title">Win/Loss by Map (Opposing Teams Only)</div>
            <div class="pvp-breakdown-grid">
    `;
    
    mapEntries.sort((a, b) => b[1].total - a[1].total).forEach(([map, data]) => {
        const p1Pct = data.total > 0 ? (data.p1Wins / data.total) * 100 : 50;
        const p2Pct = data.total > 0 ? (data.p2Wins / data.total) * 100 : 50;
        
        html += `
            <div class="pvp-breakdown-item">
                <div class="pvp-breakdown-header">
                    <span class="pvp-breakdown-name">${map}</span>
                    <span class="pvp-breakdown-total">${data.total} games</span>
                </div>
                <div class="pvp-breakdown-bar">
                    <div class="pvp-bar-p1" style="width: ${p1Pct}%"></div>
                    <div class="pvp-bar-p2" style="width: ${p2Pct}%"></div>
                </div>
                <div class="pvp-breakdown-scores">
                    <span class="pvp-score-p1">${player1}: ${data.p1Wins}</span>
                    <span class="pvp-score-p2">${player2}: ${data.p2Wins}</span>
                </div>
            </div>
        `;
    });
    
    html += '</div></div>';
    return html;
}

function renderGameTypeBreakdown(player1, player2, gameTypes) {
    const gtEntries = Object.entries(gameTypes);
    if (gtEntries.length === 0) {
        return '';
    }
    
    let html = `
        <div class="pvp-breakdown">
            <div class="pvp-section-title">Win/Loss by Game Type (Opposing Teams Only)</div>
            <div class="pvp-breakdown-grid">
    `;
    
    gtEntries.sort((a, b) => b[1].total - a[1].total).forEach(([gameType, data]) => {
        const p1Pct = data.total > 0 ? (data.p1Wins / data.total) * 100 : 50;
        const p2Pct = data.total > 0 ? (data.p2Wins / data.total) * 100 : 50;
        
        html += `
            <div class="pvp-breakdown-item">
                <div class="pvp-breakdown-header">
                    <span class="pvp-breakdown-name">${gameType}</span>
                    <span class="pvp-breakdown-total">${data.total} games</span>
                </div>
                <div class="pvp-breakdown-bar">
                    <div class="pvp-bar-p1" style="width: ${p1Pct}%"></div>
                    <div class="pvp-bar-p2" style="width: ${p2Pct}%"></div>
                </div>
                <div class="pvp-breakdown-scores">
                    <span class="pvp-score-p1">${player1}: ${data.p1Wins}</span>
                    <span class="pvp-score-p2">${player2}: ${data.p2Wins}</span>
                </div>
            </div>
        `;
    });
    
    html += '</div></div>';
    return html;
}
