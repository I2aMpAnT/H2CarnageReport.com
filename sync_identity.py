#!/usr/bin/env python3
"""
sync_identity.py - Sync identity XLSX files and update players.json with stats_profile.

This module is used by the Discord bot to:
1. Read identity XLSX files from the private stats folder
2. Extract MAC addresses from each file
3. Match MAC addresses to players in players.json
4. Add/update the stats_profile field (in-game name) for matched players

Usage (as module):
    from sync_identity import sync_player_profiles
    updated_count = sync_player_profiles(sftp_connection, players_data)

Usage (standalone):
    python sync_identity.py

The identity files contain MAC addresses. The filename (without .xlsx) IS the
player's in-game profile name used in stats.
"""

import pandas as pd
import json
import os
import io
from datetime import datetime

# Server paths
PRIVATE_STATS_PATH = "/home/carnagereport/stats/private/"

# Local files
PLAYERS_FILE = "players.json"

def log(message):
    """Log with timestamp"""
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    print(f"[IDENTITY] [{timestamp}] {message}")

def load_players():
    """Load players.json"""
    try:
        with open(PLAYERS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except:
        return {}

def save_players(players):
    """Save players.json"""
    with open(PLAYERS_FILE, 'w', encoding='utf-8') as f:
        json.dump(players, f, indent=2, ensure_ascii=False)

def extract_mac_from_xlsx(file_data):
    """
    Extract MAC address from identity XLSX file data.

    Args:
        file_data: BytesIO object containing the XLSX file

    Returns:
        MAC address string (uppercase, colon-separated) or None
    """
    try:
        xl = pd.ExcelFile(file_data)
        mac_address = None

        for sheet_name in xl.sheet_names:
            df = pd.read_excel(file_data, sheet_name=sheet_name)
            file_data.seek(0)

            # Look for MAC-related columns
            for col in df.columns:
                col_lower = str(col).lower()
                if any(p in col_lower for p in ['mac', 'hardware', 'identifier', 'address']):
                    values = df[col].dropna()
                    if len(values) > 0:
                        val = str(values.iloc[0]).strip()
                        if ':' in val or '-' in val:
                            mac_address = val.upper().replace('-', ':')
                            return mac_address

        # Check first cell if no column match
        file_data.seek(0)
        df = pd.read_excel(file_data, sheet_name=0)
        if len(df.columns) > 0 and len(df) > 0:
            first_val = str(df.iloc[0, 0]).strip()
            if ':' in first_val or '-' in first_val:
                return first_val.upper().replace('-', ':')

        return None

    except Exception as e:
        log(f"Error extracting MAC: {e}")
        return None

def sync_player_profiles(sftp, players=None):
    """
    Sync identity files and update players with stats_profile.

    Args:
        sftp: Paramiko SFTP client connected to the stats server
        players: Optional players dict. If None, loads from file.

    Returns:
        Number of players updated
    """
    if players is None:
        players = load_players()

    # Build MAC -> user_id lookup
    mac_to_user = {}
    for user_id, data in players.items():
        for mac in data.get('mac_addresses', []):
            mac_to_user[mac.upper()] = user_id

    log(f"Found {len(mac_to_user)} MAC addresses in players.json")

    # List identity files
    try:
        identity_files = [f for f in sftp.listdir(PRIVATE_STATS_PATH) if f.endswith('.xlsx')]
    except Exception as e:
        log(f"Error listing {PRIVATE_STATS_PATH}: {e}")
        return 0

    log(f"Found {len(identity_files)} identity files")

    updated_count = 0

    for filename in identity_files:
        filepath = os.path.join(PRIVATE_STATS_PATH, filename)
        profile_name = os.path.splitext(filename)[0]  # Filename IS the profile name

        try:
            # Read file
            with sftp.file(filepath, 'rb') as f:
                file_data = io.BytesIO(f.read())

            # Extract MAC
            mac_address = extract_mac_from_xlsx(file_data)

            if mac_address and mac_address in mac_to_user:
                user_id = mac_to_user[mac_address]
                old_profile = players[user_id].get('stats_profile', '')

                if old_profile != profile_name:
                    players[user_id]['stats_profile'] = profile_name
                    updated_count += 1
                    log(f"  {profile_name} -> user {user_id} (MAC: {mac_address})")

        except Exception as e:
            log(f"  Error processing {filename}: {e}")

    if updated_count > 0:
        save_players(players)
        log(f"Updated {updated_count} player profiles")

    return updated_count

def sync_from_server(host="104.207.143.249", user="root"):
    """
    Connect to server and sync identity data.

    Args:
        host: Server hostname/IP
        user: SSH username

    Returns:
        Number of players updated, or -1 on connection failure
    """
    import paramiko

    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    # Try SSH keys
    home = os.path.expanduser("~")
    key_paths = [
        os.path.join(home, ".ssh", "id_rsa"),
        os.path.join(home, ".ssh", "id_ed25519"),
    ]

    key = None
    for kp in key_paths:
        if os.path.exists(kp):
            try:
                key = paramiko.RSAKey.from_private_key_file(kp)
                break
            except:
                try:
                    key = paramiko.Ed25519Key.from_private_key_file(kp)
                    break
                except:
                    pass

    try:
        if key:
            ssh.connect(host, username=user, pkey=key, timeout=30)
        else:
            ssh.connect(host, username=user, timeout=30)

        sftp = ssh.open_sftp()
        result = sync_player_profiles(sftp)
        sftp.close()
        ssh.close()
        return result

    except Exception as e:
        log(f"Connection failed: {e}")
        return -1

if __name__ == '__main__':
    result = sync_from_server()
    if result >= 0:
        print(f"Sync complete: {result} profiles updated")
    else:
        print("Sync failed")
        exit(1)
