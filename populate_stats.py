#!/usr/bin/env python3
"""
Script to parse Excel stats files and populate the site with game data and rankings.
"""

import pandas as pd
import json
import os
from datetime import datetime
import re

# File paths
STATS_DIR = 'stats'
RANKSTATS_FILE = 'rankstats.json'
GAMESTATS_FILE = 'gamestats.json'
MATCHHISTORY_FILE = 'matchhistory.json'
GAMESDATA_FILE = 'gameshistory.json'  # This is what the frontend needs
XP_CONFIG_FILE = 'xp_config.json'

def load_xp_config():
    """Load XP configuration for ranking."""
    with open(XP_CONFIG_FILE, 'r') as f:
        return json.load(f)

def load_rankstats():
    """Load existing rankstats.json."""
    try:
        with open(RANKSTATS_FILE, 'r') as f:
            return json.load(f)
    except:
        return {}

def calculate_rank(xp, rank_thresholds):
    """Calculate rank based on XP and thresholds."""
    for rank in range(50, 0, -1):
        rank_str = str(rank)
        if rank_str in rank_thresholds:
            min_xp, max_xp = rank_thresholds[rank_str]
            if min_xp <= xp <= max_xp:
                return rank
    return 1

def parse_score(score_val):
    """Parse score which can be an integer or time format (M:SS)."""
    if pd.isna(score_val):
        return 0, '0'

    score_str = str(score_val).strip()

    # Check if it's a time format (contains ':')
    if ':' in score_str:
        # Return as string for display, convert to seconds for sorting
        parts = score_str.split(':')
        try:
            minutes = int(parts[0])
            seconds = int(parts[1]) if len(parts) > 1 else 0
            return minutes * 60 + seconds, score_str
        except:
            return 0, score_str

    # Try to parse as integer
    try:
        return int(float(score_val)), str(int(float(score_val)))
    except:
        return 0, str(score_val)

def parse_excel_file(file_path):
    """Parse a single Excel stats file and return game data."""
    print(f"Parsing {file_path}...")

    xl = pd.ExcelFile(file_path)

    # Read all sheets
    game_details_df = pd.read_excel(file_path, sheet_name='Game Details')
    post_game_df = pd.read_excel(file_path, sheet_name='Post Game Report')
    versus_df = pd.read_excel(file_path, sheet_name='Versus')
    game_stats_df = pd.read_excel(file_path, sheet_name='Game Statistics')
    medal_stats_df = pd.read_excel(file_path, sheet_name='Medal Stats')
    weapon_stats_df = pd.read_excel(file_path, sheet_name='Weapon Statistics')

    # Extract game details
    details = {}
    if len(game_details_df) > 0:
        row = game_details_df.iloc[0]
        details = {
            'Game Type': str(row.get('Game Type', 'Unknown')),
            'Variant Name': str(row.get('Variant Name', 'Unknown')),
            'Map Name': str(row.get('Map Name', 'Unknown')),
            'Start Time': str(row.get('Start Time', '')),
            'End Time': str(row.get('End Time', '')),
            'Duration': str(row.get('Duration', '0:00'))
        }

    # Extract players from Post Game Report
    players = []
    for _, row in post_game_df.iterrows():
        score_numeric, score_display = parse_score(row.get('score', 0))
        player = {
            'name': str(row.get('name', '')).strip(),
            'place': str(row.get('place', '')),
            'score': score_display,
            'score_numeric': score_numeric,  # For sorting
            'kills': int(row.get('kills', 0)) if pd.notna(row.get('kills')) else 0,
            'deaths': int(row.get('deaths', 0)) if pd.notna(row.get('deaths')) else 0,
            'assists': int(row.get('assists', 0)) if pd.notna(row.get('assists')) else 0,
            'kda': float(row.get('kda', 0)) if pd.notna(row.get('kda')) else 0,
            'suicides': int(row.get('suicides', 0)) if pd.notna(row.get('suicides')) else 0,
            'team': str(row.get('team', '')).strip(),
            'shots_fired': int(row.get('shots_fired', 0)) if pd.notna(row.get('shots_fired')) else 0,
            'shots_hit': int(row.get('shots_hit', 0)) if pd.notna(row.get('shots_hit')) else 0,
            'accuracy': float(row.get('accuracy', 0)) if pd.notna(row.get('accuracy')) else 0,
            'head_shots': int(row.get('head_shots', 0)) if pd.notna(row.get('head_shots')) else 0
        }
        if player['name']:
            players.append(player)

    # Extract versus data (player vs player matrix)
    versus = {}
    if len(versus_df) > 0:
        # First column is player name
        player_names = versus_df.iloc[:, 0].tolist()
        for i, row in versus_df.iterrows():
            player_name = str(row.iloc[0]).strip()
            if player_name:
                versus[player_name] = {}
                for col in versus_df.columns[1:]:
                    opponent = str(col).strip()
                    kills = int(row[col]) if pd.notna(row[col]) else 0
                    versus[player_name][opponent] = kills

    # Extract detailed game statistics
    detailed_stats = []
    for _, row in game_stats_df.iterrows():
        player_name = str(row.get('Player', '')).strip()
        if player_name:
            stats = {
                'player': player_name,
                'emblem_url': str(row.get('Emblem URL', '')) if pd.notna(row.get('Emblem URL')) else '',
                'kills': int(row.get('kills', 0)) if pd.notna(row.get('kills')) else 0,
                'assists': int(row.get('assists', 0)) if pd.notna(row.get('assists')) else 0,
                'deaths': int(row.get('deaths', 0)) if pd.notna(row.get('deaths')) else 0,
                'headshots': int(row.get('headshots', 0)) if pd.notna(row.get('headshots')) else 0,
                'betrayals': int(row.get('betrayals', 0)) if pd.notna(row.get('betrayals')) else 0,
                'suicides': int(row.get('suicides', 0)) if pd.notna(row.get('suicides')) else 0,
                'best_spree': int(row.get('best_spree', 0)) if pd.notna(row.get('best_spree')) else 0,
                'total_time_alive': int(row.get('total_time_alive', 0)) if pd.notna(row.get('total_time_alive')) else 0,
                'ctf_scores': int(row.get('ctf_scores', 0)) if pd.notna(row.get('ctf_scores')) else 0,
                'ctf_flag_steals': int(row.get('ctf_flag_steals', 0)) if pd.notna(row.get('ctf_flag_steals')) else 0,
                'ctf_flag_saves': int(row.get('ctf_flag_saves', 0)) if pd.notna(row.get('ctf_flag_saves')) else 0
            }
            detailed_stats.append(stats)

    # Extract medal statistics
    medals = []
    medal_columns = ['double_kill', 'triple_kill', 'killtacular', 'kill_frenzy', 'killtrocity',
                     'killamanjaro', 'sniper_kill', 'road_kill', 'bone_cracker', 'assassin',
                     'vehicle_destroyed', 'car_jacking', 'stick_it', 'killing_spree',
                     'running_riot', 'rampage', 'beserker', 'over_kill', 'flag_taken',
                     'flag_carrier_kill', 'flag_returned', 'bomb_planted', 'bomb_carrier_kill', 'bomb_returned']

    for _, row in medal_stats_df.iterrows():
        player_name = str(row.get('player', '')).strip()
        if player_name:
            medal_data = {'player': player_name}
            for col in medal_columns:
                if col in row:
                    medal_data[col] = int(row[col]) if pd.notna(row[col]) else 0
            medals.append(medal_data)

    # Extract weapon statistics
    weapons = []
    for _, row in weapon_stats_df.iterrows():
        player_name = str(row.get('Player', '')).strip()
        if player_name:
            weapon_data = {'Player': player_name}  # Keep capital P for frontend compatibility
            for col in weapon_stats_df.columns:
                if col != 'Player':
                    col_clean = str(col).strip().lower()
                    weapon_data[col_clean] = int(row[col]) if pd.notna(row[col]) else 0
            weapons.append(weapon_data)

    # Construct game object
    game = {
        'details': details,
        'players': players,
        'versus': versus,
        'detailed_stats': detailed_stats,
        'medals': medals,
        'weapons': weapons
    }

    return game

def determine_winners_losers(game):
    """Determine winning and losing teams/players for a game."""
    players = game['players']

    # Group by team
    teams = {}
    for player in players:
        team = player.get('team', '').strip()
        if team:
            if team not in teams:
                teams[team] = {'score': 0, 'players': []}
            # Use score_numeric for proper comparison
            teams[team]['score'] += player.get('score_numeric', 0)
            teams[team]['players'].append(player['name'])

    if len(teams) >= 2:
        # Team game - determine winning and losing teams
        sorted_teams = sorted(teams.items(), key=lambda x: x[1]['score'], reverse=True)

        winners = []
        losers = []

        winning_score = sorted_teams[0][1]['score']
        losing_score = sorted_teams[-1][1]['score']

        for team_name, team_data in sorted_teams:
            if team_data['score'] == winning_score:
                winners.extend(team_data['players'])
            else:
                losers.extend(team_data['players'])

        # If it's a tie, no winners/losers
        if winning_score == losing_score:
            return [], []

        return winners, losers
    else:
        # FFA game - winner is first place
        sorted_players = sorted(players, key=lambda x: x.get('score_numeric', 0), reverse=True)
        if len(sorted_players) > 1:
            winners = [sorted_players[0]['name']]
            losers = [p['name'] for p in sorted_players[1:]]
            return winners, losers
        return [], []

def find_player_by_name(rankstats, name):
    """Find a player in rankstats by their discord_name or alias."""
    name_lower = name.lower().strip()

    for user_id, data in rankstats.items():
        discord_name = data.get('discord_name', '').lower()
        alias = data.get('alias', '').lower()
        twitch_name = data.get('twitch_name', '').lower()

        if discord_name == name_lower or alias == name_lower or twitch_name == name_lower:
            return user_id

        # Try partial match on discord name
        if name_lower in discord_name or discord_name in name_lower:
            return user_id

    return None

def main():
    print("Starting stats population...")

    # Load configurations
    xp_config = load_xp_config()
    rank_thresholds = xp_config['rank_thresholds']
    xp_win = xp_config['game_win']  # 50 XP per win
    xp_loss = xp_config['game_loss']  # 10 XP per loss

    # Load existing rankstats
    rankstats = load_rankstats()

    # Get all Excel files sorted by date
    stats_files = sorted([f for f in os.listdir(STATS_DIR) if f.endswith('.xlsx')])
    print(f"Found {len(stats_files)} stats files")

    # Parse all games
    all_games = []
    for filename in stats_files:
        file_path = os.path.join(STATS_DIR, filename)
        game = parse_excel_file(file_path)
        game['source_file'] = filename
        all_games.append(game)

    print(f"Parsed {len(all_games)} games")

    # Initialize player stats tracking (for new stats from games)
    player_game_stats = {}  # Track kills, deaths, etc. per player from games

    # Process each game to update player stats
    for game in all_games:
        winners, losers = determine_winners_losers(game)

        for player in game['players']:
            player_name = player['name']

            if player_name not in player_game_stats:
                player_game_stats[player_name] = {
                    'kills': 0,
                    'deaths': 0,
                    'assists': 0,
                    'wins': 0,
                    'losses': 0,
                    'games': 0,
                    'headshots': 0
                }

            player_game_stats[player_name]['kills'] += player.get('kills', 0)
            player_game_stats[player_name]['deaths'] += player.get('deaths', 0)
            player_game_stats[player_name]['assists'] += player.get('assists', 0)
            player_game_stats[player_name]['headshots'] += player.get('head_shots', 0)
            player_game_stats[player_name]['games'] += 1

            if player_name in winners:
                player_game_stats[player_name]['wins'] += 1
            elif player_name in losers:
                player_game_stats[player_name]['losses'] += 1

    print(f"Processed stats for {len(player_game_stats)} players")

    # Update rankstats with game stats
    # First, try to match players from games to existing rankstats entries
    matched_players = {}
    unmatched_players = []

    for player_name, stats in player_game_stats.items():
        user_id = find_player_by_name(rankstats, player_name)
        if user_id:
            matched_players[player_name] = user_id
        else:
            unmatched_players.append(player_name)

    print(f"Matched {len(matched_players)} players to existing entries")
    print(f"Unmatched players: {unmatched_players}")

    # Update matched players in rankstats
    for player_name, user_id in matched_players.items():
        stats = player_game_stats[player_name]

        # Update wins, losses, total_games
        rankstats[user_id]['wins'] = rankstats[user_id].get('wins', 0) + stats['wins']
        rankstats[user_id]['losses'] = rankstats[user_id].get('losses', 0) + stats['losses']
        rankstats[user_id]['total_games'] = rankstats[user_id].get('total_games', 0) + stats['games']

        # Add new stats fields
        rankstats[user_id]['kills'] = rankstats[user_id].get('kills', 0) + stats['kills']
        rankstats[user_id]['deaths'] = rankstats[user_id].get('deaths', 0) + stats['deaths']
        rankstats[user_id]['assists'] = rankstats[user_id].get('assists', 0) + stats['assists']
        rankstats[user_id]['headshots'] = rankstats[user_id].get('headshots', 0) + stats['headshots']

        # Calculate XP
        new_xp = (stats['wins'] * xp_win) + (stats['losses'] * xp_loss)
        rankstats[user_id]['xp'] = rankstats[user_id].get('xp', 0) + new_xp

        # Calculate rank based on XP
        rankstats[user_id]['rank'] = calculate_rank(rankstats[user_id]['xp'], rank_thresholds)

    # Create entries for unmatched players (using generated IDs)
    for player_name in unmatched_players:
        stats = player_game_stats[player_name]

        # Generate a temporary user ID (based on name hash)
        temp_id = str(abs(hash(player_name)) % 10**18)

        xp = (stats['wins'] * xp_win) + (stats['losses'] * xp_loss)
        rank = calculate_rank(xp, rank_thresholds)

        rankstats[temp_id] = {
            'xp': xp,
            'wins': stats['wins'],
            'losses': stats['losses'],
            'series_wins': 0,
            'series_losses': 0,
            'total_games': stats['games'],
            'total_series': 0,
            'mmr': 750,  # Default MMR for new players
            'discord_name': player_name,
            'kills': stats['kills'],
            'deaths': stats['deaths'],
            'assists': stats['assists'],
            'headshots': stats['headshots'],
            'rank': rank
        }

    # Calculate XP and ranks for ALL players based on their wins/losses
    for user_id in rankstats:
        wins = rankstats[user_id].get('wins', 0)
        losses = rankstats[user_id].get('losses', 0)

        # Recalculate XP based on current wins/losses
        calculated_xp = (wins * xp_win) + (losses * xp_loss)
        rankstats[user_id]['xp'] = calculated_xp

        # Calculate rank based on XP
        rankstats[user_id]['rank'] = calculate_rank(calculated_xp, rank_thresholds)

    # Save updated rankstats
    with open(RANKSTATS_FILE, 'w') as f:
        json.dump(rankstats, f, indent=2)
    print(f"Updated {RANKSTATS_FILE}")

    # Save games data for frontend
    with open(GAMESDATA_FILE, 'w') as f:
        json.dump(all_games, f, indent=2)
    print(f"Updated {GAMESDATA_FILE}")

    # Create gamestats.json (simplified game details)
    gamestats = {}
    for i, game in enumerate(all_games, 1):
        match_key = f"match_{i}"
        gamestats[match_key] = {
            f"game_1": {
                'map': game['details'].get('Map Name', 'Unknown'),
                'gametype': game['details'].get('Variant Name', 'Unknown'),
                'game_type': game['details'].get('Game Type', 'Unknown'),
                'timestamp': game['details'].get('Start Time', ''),
                'duration': game['details'].get('Duration', '')
            }
        }

    with open(GAMESTATS_FILE, 'w') as f:
        json.dump(gamestats, f, indent=2)
    print(f"Updated {GAMESTATS_FILE}")

    # Update matchhistory.json
    matchhistory = {
        'total_ranked_matches': len(all_games),
        'matches': []
    }

    for i, game in enumerate(all_games, 1):
        winners, losers = determine_winners_losers(game)

        # Determine teams
        red_team = []
        blue_team = []
        for player in game['players']:
            team = player.get('team', '').lower()
            if team == 'red':
                red_team.append(player['name'])
            elif team == 'blue':
                blue_team.append(player['name'])

        match_entry = {
            'match_number': i,
            'match_type': 'RANKED',
            'timestamp': game['details'].get('Start Time', ''),
            'map': game['details'].get('Map Name', 'Unknown'),
            'gametype': game['details'].get('Variant Name', 'Unknown'),
            'red_team': red_team,
            'blue_team': blue_team,
            'winners': winners,
            'losers': losers
        }
        matchhistory['matches'].append(match_entry)

    with open(MATCHHISTORY_FILE, 'w') as f:
        json.dump(matchhistory, f, indent=2)
    print(f"Updated {MATCHHISTORY_FILE}")

    # Print summary
    print("\n" + "="*50)
    print("STATS POPULATION SUMMARY")
    print("="*50)
    print(f"Total games processed: {len(all_games)}")
    print(f"Total players with game data: {len(player_game_stats)}")
    print(f"Players matched to existing entries: {len(matched_players)}")
    print(f"New player entries created: {len(unmatched_players)}")

    # Print some player stats
    print("\nTop 10 Players by Wins:")
    sorted_players = sorted(
        [(uid, data) for uid, data in rankstats.items() if data.get('wins', 0) > 0],
        key=lambda x: x[1].get('wins', 0),
        reverse=True
    )[:10]

    for uid, data in sorted_players:
        name = data.get('discord_name', 'Unknown')
        wins = data.get('wins', 0)
        losses = data.get('losses', 0)
        xp = data.get('xp', 0)
        rank = data.get('rank', 1)
        print(f"  {name}: {wins}W-{losses}L, XP: {xp}, Rank: {rank}")

    print("\nDone!")

if __name__ == '__main__':
    main()
