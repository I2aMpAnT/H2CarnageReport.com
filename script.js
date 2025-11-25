// Initialize empty games data array
let gamesData = [];

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
        
        loadingArea.style.display = 'none';
        statsArea.style.display = 'block';
        mainHeader.classList.add('loaded');
        
        renderGamesList();
        renderLeaderboard();
        initializeSearch();
    } catch (error) {
        console.error('Error loading games data:', error);
        loadingArea.innerHTML = '<div class="loading-message">[ ERROR LOADING GAME DATA ]</div>';
    }
}

function switchMainTab(tabName) {
    // Hide all main tabs
    const allMainTabs = document.querySelectorAll('.main-tab-content');
    allMainTabs.forEach(tab => tab.style.display = 'none');
    
    // Remove active class from all buttons
    const allMainBtns = document.querySelectorAll('.main-tab-btn');
    allMainBtns.forEach(btn => btn.classList.remove('active'));
    
    // Show selected tab
    const selectedTab = document.getElementById('main-tab-' + tabName);
    if (selectedTab) {
        selectedTab.style.display = 'block';
    }
    
    // Add active class to clicked button
    const selectedBtn = document.getElementById('btn-main-' + tabName);
    if (selectedBtn) {
        selectedBtn.classList.add('active');
    }
}

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
        const gameItem = createGameItem(game, gameNumber);
        gamesList.appendChild(gameItem);
    });
}

function createGameItem(game, gameNumber) {
    const gameDiv = document.createElement('div');
    gameDiv.className = 'game-item';
    gameDiv.id = `game-${gameNumber}`;
    
    const details = game.details;
    const players = game.players;
    
    // Determine game type for display
    let displayGameType = details['Variant Name'] || details['Game Type'] || 'Unknown';
    let mapName = details['Map Name'] || 'Unknown Map';
    let duration = details['Duration'] || '0:00';
    
    gameDiv.innerHTML = `
        <div class="game-header-bar" onclick="toggleGameDetails(${gameNumber})">
            <div class="game-header-left">
                <div class="game-number">GAME ${gameNumber}</div>
                <div class="game-info">
                    <span class="game-meta-tag">${displayGameType}</span>
                    <span class="game-meta-tag">${mapName}</span>
                    <span class="game-meta-tag">${duration}</span>
                    <span class="game-meta-tag">${players.length} Players</span>
                </div>
            </div>
            <div class="expand-icon">▶</div>
        </div>
        <div class="game-details">
            <div class="game-details-content">
                <div class="game-date">${details['Start Time'] || 'Unknown Date'}</div>
                <div id="game-content-${gameNumber}"></div>
            </div>
        </div>
    `;
    
    return gameDiv;
}

function toggleGameDetails(gameNumber) {
    const gameItem = document.getElementById(`game-${gameNumber}`);
    const gameContent = document.getElementById(`game-content-${gameNumber}`);
    
    if (!gameItem) return;
    
    const isExpanded = gameItem.classList.contains('expanded');
    
    if (isExpanded) {
        gameItem.classList.remove('expanded');
    } else {
        gameItem.classList.add('expanded');
        
        // Load game details if not already loaded
        if (!gameContent.innerHTML) {
            const gameIndex = gamesData.length - gameNumber;
            const game = gamesData[gameIndex];
            gameContent.innerHTML = renderGameContent(game);
        }
    }
}

function renderGameContent(game) {
    const details = game.details;
    const gameType = (details['Game Type'] || '').toLowerCase();
    
    let html = '<div class="tab-navigation">';
    html += '<button class="tab-btn active" onclick="switchGameTab(this, \'scoreboard\')">Scoreboard</button>';
    html += '<button class="tab-btn" onclick="switchGameTab(this, \'stats\')">Detailed Stats</button>';
    html += '<button class="tab-btn" onclick="switchGameTab(this, \'medals\')">Medals</button>';
    html += '<button class="tab-btn" onclick="switchGameTab(this, \'weapons\')">Weapons</button>';
    html += '</div>';
    
    // Scoreboard tab
    html += '<div class="tab-content active">';
    html += renderScoreboard(game);
    html += '</div>';
    
    // Stats tab
    html += '<div class="tab-content">';
    html += renderDetailedStats(game);
    html += '</div>';
    
    // Medals tab
    html += '<div class="tab-content">';
    html += renderMedals(game);
    html += '</div>';
    
    // Weapons tab
    html += '<div class="tab-content">';
    html += renderWeapons(game);
    html += '</div>';
    
    return html;
}

function switchGameTab(btn, tabName) {
    const parent = btn.closest('.game-details-content');
    const tabs = parent.querySelectorAll('.tab-content');
    const buttons = parent.querySelectorAll('.tab-btn');
    
    buttons.forEach(b => b.classList.remove('active'));
    tabs.forEach(t => t.classList.remove('active'));
    
    btn.classList.add('active');
    const tabIndex = Array.from(buttons).indexOf(btn);
    tabs[tabIndex].classList.add('active');
}

function renderScoreboard(game) {
    const players = game.players;
    const hasTeams = players.some(p => p.team && p.team !== 'none');
    
    let html = '<div class="scoreboard">';
    
    // Header
    html += '<div class="scoreboard-header">';
    html += '<div>Place</div>';
    html += '<div>Player</div>';
    if (hasTeams) html += '<div>Team</div>';
    html += '<div>Score</div>';
    html += '<div>K</div>';
    html += '<div>D</div>';
    html += '<div>A</div>';
    html += '<div>K/D</div>';
    html += '</div>';
    
    // Rows
    players.forEach(player => {
        const teamAttr = player.team && player.team !== 'none' ? `data-team="${player.team}"` : '';
        html += `<div class="scoreboard-row" ${teamAttr}>`;
        html += `<div class="sb-place"><span class="place-badge place-${player.place.replace(/\D/g, '')}">${player.place}</span></div>`;
        html += `<div class="sb-player"><span class="player-name-text">${player.name}</span></div>`;
        if (hasTeams) html += `<div class="sb-col">${player.team || '-'}</div>`;
        html += `<div class="sb-score">${player.score || 0}</div>`;
        html += `<div class="sb-kills">${player.kills || 0}</div>`;
        html += `<div class="sb-deaths">${player.deaths || 0}</div>`;
        html += `<div class="sb-assists">${player.assists || 0}</div>`;
        html += `<div class="sb-kd">${player.kda ? player.kda.toFixed(2) : '0.00'}</div>`;
        html += '</div>';
    });
    
    html += '</div>';
    return html;
}

function renderDetailedStats(game) {
    const stats = game.stats;
    
    let html = '<div class="detailed-stats">';
    html += '<table class="stats-table">';
    html += '<thead><tr>';
    html += '<th>Player</th><th>K</th><th>A</th><th>D</th><th>Betrayals</th><th>Suicides</th><th>Best Spree</th><th>Time Alive</th>';
    html += '</tr></thead>';
    html += '<tbody>';
    
    stats.forEach(stat => {
        const timeAlive = formatTime(stat.total_time_alive || 0);
        html += `<tr>`;
        html += `<td>${stat.Player}</td>`;
        html += `<td>${stat.kills}</td>`;
        html += `<td>${stat.assists}</td>`;
        html += `<td>${stat.deaths}</td>`;
        html += `<td>${stat.betrayals}</td>`;
        html += `<td>${stat.suicides}</td>`;
        html += `<td>${stat.best_spree}</td>`;
        html += `<td>${timeAlive}</td>`;
        html += `</tr>`;
    });
    
    html += '</tbody></table>';
    html += '</div>';
    return html;
}

function renderMedals(game) {
    const medals = game.medals;
    
    let html = '<div class="detailed-stats">';
    html += '<table class="stats-table">';
    html += '<thead><tr>';
    html += '<th>Player</th>';
    
    // Get all medal types
    const medalTypes = new Set();
    medals.forEach(m => {
        Object.keys(m).forEach(key => {
            if (key !== 'player') medalTypes.add(key);
        });
    });
    
    medalTypes.forEach(medal => {
        html += `<th>${formatMedalName(medal)}</th>`;
    });
    html += '</tr></thead>';
    html += '<tbody>';
    
    medals.forEach(medal => {
        html += `<tr>`;
        html += `<td>${medal.player}</td>`;
        medalTypes.forEach(type => {
            html += `<td>${medal[type] || 0}</td>`;
        });
        html += `</tr>`;
    });
    
    html += '</tbody></table>';
    html += '</div>';
    return html;
}

function renderWeapons(game) {
    const weapons = game.weapons;
    
    let html = '<div class="detailed-stats">';
    html += '<table class="stats-table">';
    html += '<thead><tr>';
    html += '<th>Player</th>';
    
    // Get all weapon types
    const weaponCols = Object.keys(weapons[0] || {}).filter(k => k !== 'Player');
    weaponCols.forEach(col => {
        html += `<th>${col}</th>`;
    });
    html += '</tr></thead>';
    html += '<tbody>';
    
    weapons.forEach(weapon => {
        html += `<tr>`;
        html += `<td>${weapon.Player}</td>`;
        weaponCols.forEach(col => {
            html += `<td>${weapon[col] || 0}</td>`;
        });
        html += `</tr>`;
    });
    
    html += '</tbody></table>';
    html += '</div>';
    return html;
}

function renderLeaderboard() {
    const leaderboardContainer = document.getElementById('leaderboardContainer');
    if (!leaderboardContainer) return;
    
    if (gamesData.length === 0) {
        leaderboardContainer.innerHTML = '<div class="loading-message">No leaderboard data available</div>';
        return;
    }
    
    // Calculate player stats
    const playerStats = {};
    
    gamesData.forEach(game => {
        game.players.forEach(player => {
            if (!playerStats[player.name]) {
                playerStats[player.name] = {
                    name: player.name,
                    games: 0,
                    kills: 0,
                    deaths: 0,
                    assists: 0,
                    wins: 0
                };
            }
            
            const stats = playerStats[player.name];
            stats.games++;
            stats.kills += player.kills || 0;
            stats.deaths += player.deaths || 0;
            stats.assists += player.assists || 0;
            
            // Count wins (1st place)
            if (player.place === '1st') {
                stats.wins++;
            }
        });
    });
    
    // Convert to array and calculate derived stats
    const players = Object.values(playerStats).map(p => {
        p.kd = p.deaths > 0 ? (p.kills / p.deaths).toFixed(2) : p.kills.toFixed(2);
        p.winrate = p.games > 0 ? ((p.wins / p.games) * 100).toFixed(1) : '0.0';
        return p;
    });
    
    // Sort by wins, then K/D
    players.sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins;
        return parseFloat(b.kd) - parseFloat(a.kd);
    });
    
    let html = '<div class="leaderboard">';
    html += '<div class="leaderboard-header">';
    html += '<div>Rank</div>';
    html += '<div>Player</div>';
    html += '<div>Games</div>';
    html += '<div>W-L</div>';
    html += '<div>Win%</div>';
    html += '<div>K/D</div>';
    html += '</div>';
    
    players.forEach((player, index) => {
        const rank = index + 1;
        const rankClass = rank <= 3 ? `rank-${rank}` : '';
        
        html += '<div class="leaderboard-row">';
        html += `<div class="lb-rank ${rankClass}">${rank}</div>`;
        html += `<div class="lb-player">${player.name}</div>`;
        html += `<div class="lb-record">${player.games}</div>`;
        html += `<div class="lb-record">${player.wins}-${player.games - player.wins}</div>`;
        html += `<div class="lb-winrate">${player.winrate}%</div>`;
        html += `<div class="lb-kd">${player.kd}</div>`;
        html += '</div>';
    });
    
    html += '</div>';
    leaderboardContainer.innerHTML = html;
}

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
        const playerNames = new Set();
        gamesData.forEach(game => {
            game.players.forEach(player => {
                if (player.name.toLowerCase().includes(query)) {
                    playerNames.add(player.name);
                }
            });
        });
        
        playerNames.forEach(name => {
            results.push({
                type: 'player',
                name: name,
                meta: 'Player'
            });
        });
        
        // Search maps
        const maps = new Set();
        gamesData.forEach(game => {
            const mapName = game.details['Map Name'];
            if (mapName && mapName.toLowerCase().includes(query)) {
                maps.add(mapName);
            }
        });
        
        maps.forEach(map => {
            results.push({
                type: 'map',
                name: map,
                meta: 'Map'
            });
        });
        
        // Search game types
        const gameTypes = new Set();
        gamesData.forEach(game => {
            const variantName = game.details['Variant Name'];
            if (variantName && variantName.toLowerCase().includes(query)) {
                gameTypes.add(variantName);
            }
        });
        
        gameTypes.forEach(type => {
            results.push({
                type: 'gametype',
                name: type,
                meta: 'Game Type'
            });
        });
        
        displaySearchResults(results);
    });
    
    // Close search results when clicking outside
    document.addEventListener('click', function(e) {
        if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
            searchResults.classList.remove('active');
        }
    });
}

function displaySearchResults(results) {
    const searchResults = document.getElementById('searchResults');
    
    if (results.length === 0) {
        searchResults.innerHTML = '<div class="search-result-item">No results found</div>';
        searchResults.classList.add('active');
        return;
    }
    
    let html = '';
    results.slice(0, 10).forEach(result => {
        html += `<div class="search-result-item" onclick="handleSearchResultClick('${result.type}', '${result.name}')">`;
        html += `<div class="search-result-type">${result.meta}</div>`;
        html += `<div class="search-result-name">${result.name}</div>`;
        html += `</div>`;
    });
    
    searchResults.innerHTML = html;
    searchResults.classList.add('active');
}

function handleSearchResultClick(type, name) {
    console.log(`Clicked ${type}: ${name}`);
    // Close search results
    document.getElementById('searchResults').classList.remove('active');
    document.getElementById('playerSearch').value = name;
    
    // Could implement filtering or navigation here
}

function closePlayerModal() {
    const modal = document.getElementById('playerModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

function openPlayerModal(playerName) {
    const modal = document.getElementById('playerModal');
    const modalPlayerName = document.getElementById('modalPlayerName');
    const modalPlayerStats = document.getElementById('modalPlayerStats');
    
    if (!modal || !modalPlayerName || !modalPlayerStats) return;
    
    modalPlayerName.textContent = playerName;
    modalPlayerStats.innerHTML = '<div class="loading-message">Loading player stats...</div>';
    
    modal.classList.add('active');
    
    // Calculate player stats
    setTimeout(() => {
        const stats = calculatePlayerStats(playerName);
        modalPlayerStats.innerHTML = renderPlayerModalStats(stats);
    }, 100);
}

function calculatePlayerStats(playerName) {
    const stats = {
        games: 0,
        wins: 0,
        kills: 0,
        deaths: 0,
        assists: 0,
        bestSpree: 0
    };
    
    gamesData.forEach(game => {
        const player = game.players.find(p => p.name === playerName);
        if (player) {
            stats.games++;
            if (player.place === '1st') stats.wins++;
            stats.kills += player.kills || 0;
            stats.deaths += player.deaths || 0;
            stats.assists += player.assists || 0;
        }
        
        const gameStat = game.stats.find(s => s.Player === playerName);
        if (gameStat && gameStat.best_spree > stats.bestSpree) {
            stats.bestSpree = gameStat.best_spree;
        }
    });
    
    stats.kd = stats.deaths > 0 ? (stats.kills / stats.deaths).toFixed(2) : stats.kills.toFixed(2);
    stats.winrate = stats.games > 0 ? ((stats.wins / stats.games) * 100).toFixed(1) : '0.0';
    
    return stats;
}

function renderPlayerModalStats(stats) {
    let html = '<div class="stats-grid">';
    html += `<div class="stat-card"><div class="stat-label">Games Played</div><div class="stat-value">${stats.games}</div></div>`;
    html += `<div class="stat-card"><div class="stat-label">Wins</div><div class="stat-value">${stats.wins}</div></div>`;
    html += `<div class="stat-card"><div class="stat-label">Win Rate</div><div class="stat-value">${stats.winrate}%</div></div>`;
    html += `<div class="stat-card"><div class="stat-label">Total Kills</div><div class="stat-value">${stats.kills}</div></div>`;
    html += `<div class="stat-card"><div class="stat-label">Total Deaths</div><div class="stat-value">${stats.deaths}</div></div>`;
    html += `<div class="stat-card"><div class="stat-label">K/D Ratio</div><div class="stat-value">${stats.kd}</div></div>`;
    html += `<div class="stat-card"><div class="stat-label">Assists</div><div class="stat-value">${stats.assists}</div></div>`;
    html += `<div class="stat-card"><div class="stat-label">Best Spree</div><div class="stat-value">${stats.bestSpree}</div></div>`;
    html += '</div>';
    return html;
}

// Helper functions
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatMedalName(name) {
    return name.split('_').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
}

// Close modal when clicking outside
document.addEventListener('click', function(e) {
    const modal = document.getElementById('playerModal');
    if (modal && e.target === modal) {
        closePlayerModal();
    }
});

