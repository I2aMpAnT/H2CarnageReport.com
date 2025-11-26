# commands.py - All Bot Commands

import discord
from discord import app_commands
from discord.ext import commands
import random
from datetime import datetime

# Admin role configuration
ADMIN_ROLES = ["Overlord", "Staff", "Server Support"]

def has_admin_role():
    """Check if user has admin role"""
    async def predicate(interaction: discord.Interaction):
        user_roles = [role.name for role in interaction.user.roles]
        if any(role in ADMIN_ROLES for role in user_roles):
            return True
        await interaction.response.send_message("❌ You need Overlord, Staff, or Server Support role!", ephemeral=True)
        return False
    return app_commands.check(predicate)

def log_action(message: str):
    """Log actions"""
    from searchmatchmaking import log_action as queue_log
    queue_log(message)

async def get_player_mmr(user_id: int) -> int:
    """Get player MMR"""
    import STATSRANKS
    stats = STATSRANKS.get_player_stats(user_id)
    if stats and 'mmr' in stats:
        return stats['mmr']
    return 1500

def setup_commands(bot: commands.Bot, PREGAME_LOBBY_ID: int, POSTGAME_LOBBY_ID: int, QUEUE_CHANNEL_ID: int):
    """Setup all bot commands"""
    
    # ==== ADMIN COMMANDS ====
    
    @bot.tree.command(name="addplayer", description="[ADMIN] Add a player to the queue")
    @has_admin_role()
    async def add_player(interaction: discord.Interaction, user: discord.User):
        """Add player to queue"""
        from searchmatchmaking import queue_state, update_queue_embed, MAX_QUEUE_SIZE
        from pregame import start_pregame
        
        if user.id in queue_state.queue:
            await interaction.response.send_message("❌ Player already in queue!", ephemeral=True)
            return
        
        if len(queue_state.queue) >= MAX_QUEUE_SIZE:
            await interaction.response.send_message("❌ Queue is full!", ephemeral=True)
            return
        
        queue_state.queue.append(user.id)
        queue_state.recent_action = {'type': 'join', 'user_id': user.id, 'name': user.name}
        log_action(f"Admin {interaction.user.name} added {user.name} to queue")
        
        channel = interaction.guild.get_channel(QUEUE_CHANNEL_ID)
        if channel:
            await update_queue_embed(channel)
        
        await interaction.response.defer()
        
        if len(queue_state.queue) == MAX_QUEUE_SIZE:
            await start_pregame(channel if channel else interaction.channel)
    
    @bot.tree.command(name="removeplayer", description="[ADMIN] Remove a player from current matchmaking")
    @has_admin_role()
    async def remove_player(interaction: discord.Interaction, user: discord.User):
        """Remove player from active match"""
        from searchmatchmaking import queue_state
        from ingame import show_series_embed
        
        if not queue_state.current_series:
            await interaction.response.send_message("❌ No active match!", ephemeral=True)
            return
        
        series = queue_state.current_series
        all_players = series.red_team + series.blue_team
        
        if user.id not in all_players:
            await interaction.response.send_message("❌ Player not in current match!", ephemeral=True)
            return
        
        if user.id in series.red_team:
            series.red_team.remove(user.id)
            team = "Red"
        else:
            series.blue_team.remove(user.id)
            team = "Blue"
        
        log_action(f"Admin {interaction.user.name} removed {user.name} from {team} team")
        
        await interaction.response.defer()
        await show_series_embed(interaction.channel)
    
    @bot.tree.command(name="resetqueue", description="[ADMIN] Reset the queue completely")
    @has_admin_role()
    async def reset_queue(interaction: discord.Interaction):
        """Reset queue"""
        from searchmatchmaking import queue_state, update_queue_embed
        
        queue_state.queue.clear()
        queue_state.queue_join_times.clear()
        queue_state.pregame_timer_task = None
        queue_state.pregame_timer_end = None
        queue_state.recent_action = None
        
        log_action(f"Admin {interaction.user.name} reset the queue")
        
        # Clear saved state
        try:
            import state_manager
            state_manager.clear_state()
        except:
            pass
        
        channel = interaction.guild.get_channel(QUEUE_CHANNEL_ID)
        if channel:
            await update_queue_embed(channel)
        
        await interaction.response.defer()
    
    @bot.tree.command(name="cancelmatch", description="[ADMIN] Cancel current match (completed games stay recorded)")
    @has_admin_role()
    async def cancel_queue(interaction: discord.Interaction):
        """Cancel match but register games"""
        from searchmatchmaking import queue_state, update_queue_embed
        from postgame import save_match_history
        
        if not queue_state.current_series:
            await interaction.response.send_message("❌ No active match!", ephemeral=True)
            return
        
        series = queue_state.current_series
        
        if series.games:
            red_wins = series.games.count('RED')
            blue_wins = series.games.count('BLUE')
            
            log_action(f"Admin {interaction.user.name} cancelled match - {len(series.games)} games played")
            save_match_history(series, 'CANCELLED')
        
        await interaction.response.defer()
        
        # Move players to postgame
        postgame_vc = interaction.guild.get_channel(POSTGAME_LOBBY_ID)
        if postgame_vc:
            all_players = series.red_team + series.blue_team
            for user_id in all_players:
                member = interaction.guild.get_member(user_id)
                if member and member.voice:
                    try:
                        await member.move_to(postgame_vc)
                    except:
                        pass
        
        # Delete VCs
        if series.red_vc_id:
            red_vc = interaction.guild.get_channel(series.red_vc_id)
            if red_vc:
                try:
                    await red_vc.delete(reason="Match cancelled")
                except:
                    pass
        
        if series.blue_vc_id:
            blue_vc = interaction.guild.get_channel(series.blue_vc_id)
            if blue_vc:
                try:
                    await blue_vc.delete(reason="Match cancelled")
                except:
                    pass
        
        # Delete general chat embed
        try:
            from ingame import delete_general_chat_embed
            await delete_general_chat_embed(interaction.guild, series)
        except:
            pass
        
        # Clear state
        queue_state.current_series = None
        queue_state.queue.clear()
        queue_state.test_mode = False
        
        # Clear saved state
        try:
            import state_manager
            state_manager.clear_state()
        except:
            pass
        
        channel = interaction.guild.get_channel(QUEUE_CHANNEL_ID)
        if channel:
            await update_queue_embed(channel)
    
    @bot.tree.command(name="correctcurrent", description="[ADMIN] Correct a game result in current match")
    @has_admin_role()
    async def correct_current(interaction: discord.Interaction, game_number: int, winner: str):
        """Correct a game result"""
        from searchmatchmaking import queue_state
        from ingame import show_series_embed
        
        if not queue_state.current_series:
            await interaction.response.send_message("❌ No active match!", ephemeral=True)
            return
        
        series = queue_state.current_series
        
        if game_number < 1 or game_number > len(series.games):
            await interaction.response.send_message(
                f"❌ Invalid game number! Must be between 1 and {len(series.games)}",
                ephemeral=True
            )
            return
        
        winner_upper = winner.upper()
        if winner_upper not in ['RED', 'BLUE']:
            await interaction.response.send_message(
                "❌ Winner must be 'RED' or 'BLUE'!",
                ephemeral=True
            )
            return
        
        old_winner = series.games[game_number - 1]
        series.games[game_number - 1] = winner_upper
        
        log_action(f"Admin {interaction.user.name} corrected Game {game_number} from {old_winner} to {winner_upper} in Match #{series.match_number}")
        
        await interaction.response.defer()
        await show_series_embed(interaction.channel)
    
    @bot.tree.command(name="bannedroles", description="[ADMIN] Set roles that cannot queue (comma separated)")
    @has_admin_role()
    async def banned_roles(interaction: discord.Interaction, roles: str):
        """Set banned roles"""
        import json
        role_list = [r.strip() for r in roles.split(',') if r.strip()]
        
        # Load existing config
        try:
            with open('queue_config.json', 'r') as f:
                config = json.load(f)
        except:
            config = {}
        
        config['banned_roles'] = role_list
        
        with open('queue_config.json', 'w') as f:
            json.dump(config, f, indent=2)
        
        # Push to GitHub
        try:
            import github_webhook
            github_webhook.update_queue_config_on_github()
        except:
            pass
        
        await interaction.response.defer()
        log_action(f"Admin {interaction.user.name} set banned roles: {role_list}")
    
    @bot.tree.command(name="requiredroles", description="[ADMIN] Set roles required to queue (comma separated)")
    @has_admin_role()
    async def required_roles(interaction: discord.Interaction, roles: str):
        """Set required roles"""
        import json
        role_list = [r.strip() for r in roles.split(',') if r.strip()]
        
        # Load existing config
        try:
            with open('queue_config.json', 'r') as f:
                config = json.load(f)
        except:
            config = {}
        
        config['required_roles'] = role_list
        
        with open('queue_config.json', 'w') as f:
            json.dump(config, f, indent=2)
        
        # Push to GitHub
        try:
            import github_webhook
            github_webhook.update_queue_config_on_github()
        except:
            pass
        
        await interaction.response.defer()
        log_action(f"Admin {interaction.user.name} set required roles: {role_list}")
    
    @bot.tree.command(name='silentrankrefresh', description='[ADMIN] Silently refresh all player ranks (no DMs)')
    @has_admin_role()
    async def silent_rank_refresh(interaction: discord.Interaction):
        """Refresh all player ranks based on their stats - no DMs sent"""
        await interaction.response.defer(ephemeral=True)
        
        import STATSRANKS
        
        guild = interaction.guild
        stats = STATSRANKS.load_json_file(STATSRANKS.RANKSTATS_FILE)
        
        refreshed = 0
        reset_to_one = 0
        
        # Process all players in the stats file
        for user_id_str, player_stats in stats.items():
            try:
                user_id = int(user_id_str)
                member = guild.get_member(user_id)
                
                if not member:
                    continue
                
                # Check if they have any games played
                total_games = player_stats.get("wins", 0) + player_stats.get("losses", 0)
                
                if total_games == 0:
                    # No games = Level 1
                    new_level = 1
                    reset_to_one += 1
                else:
                    # Calculate rank from XP
                    new_level = STATSRANKS.calculate_rank(player_stats.get("xp", 0))
                
                # Update role silently (send_dm=False)
                await STATSRANKS.update_player_rank_role(guild, user_id, new_level, send_dm=False)
                refreshed += 1
                
            except Exception as e:
                log_action(f"Error refreshing rank for {user_id_str}: {e}")
                continue
        
        # Also check all guild members who might not be in stats yet
        for member in guild.members:
            if member.bot:
                continue
            
            user_id_str = str(member.id)
            if user_id_str not in stats:
                # Not in stats = Level 1
                try:
                    await STATSRANKS.update_player_rank_role(guild, member.id, 1, send_dm=False)
                    reset_to_one += 1
                    refreshed += 1
                except:
                    pass
        
        log_action(f"Admin {interaction.user.name} ran silent rank refresh: {refreshed} players updated, {reset_to_one} reset to Level 1")
        await interaction.followup.send(
            f"✅ Silent rank refresh complete!\n"
            f"• **{refreshed}** players updated\n"
            f"• **{reset_to_one}** players set to Level 1 (no games)",
            ephemeral=True
        )
    
    @bot.tree.command(name='setupgameemojis', description='[ADMIN] Auto-detect game emoji IDs')
    @has_admin_role()
    async def setup_game_emojis(interaction: discord.Interaction):
        """Find all Game#RED and Game#BLUE emojis and save their IDs"""
        await interaction.response.defer(ephemeral=True)
        
        import json
        guild = interaction.guild
        
        # Find all game emojis
        game_emojis = {}
        found_count = 0
        missing = []
        
        for i in range(1, 21):
            red_name = f"Game{i}RED"
            blue_name = f"Game{i}BLUE"
            
            red_emoji = discord.utils.get(guild.emojis, name=red_name)
            blue_emoji = discord.utils.get(guild.emojis, name=blue_name)
            
            if red_emoji:
                if i not in game_emojis:
                    game_emojis[i] = {}
                game_emojis[i]["RED"] = str(red_emoji.id)
                found_count += 1
            else:
                missing.append(red_name)
            
            if blue_emoji:
                if i not in game_emojis:
                    game_emojis[i] = {}
                game_emojis[i]["BLUE"] = str(blue_emoji.id)
                found_count += 1
            else:
                missing.append(blue_name)
        
        # Save to file
        with open('game_emojis.json', 'w') as f:
            json.dump(game_emojis, f, indent=2)
        
        # Build response
        response = f"✅ **Game Emojis Setup Complete!**\n\n"
        response += f"**Found:** {found_count}/40 emojis\n"
        response += f"**Saved to:** game_emojis.json\n\n"
        
        if missing:
            response += f"**Missing ({len(missing)}):**\n"
            response += ", ".join(missing[:10])
            if len(missing) > 10:
                response += f"... and {len(missing) - 10} more"
        else:
            response += "🎉 All 40 game emojis found!"
        
        await interaction.followup.send(response, ephemeral=True)
        log_action(f"{interaction.user.display_name} ran game emoji setup - found {found_count}/40")
    
    @bot.tree.command(name='logtestmatch', description='[ADMIN] Log a test match with all map/gametype combinations')
    @has_admin_role()
    async def log_test_match(interaction: discord.Interaction):
        """Generate a test match with all valid map/gametype combinations"""
        await interaction.response.defer(ephemeral=True)
        
        import json
        import os
        from datetime import datetime
        import STATSRANKS
        
        guild = interaction.guild
        
        # Get 8 random members (exclude bots)
        all_members = [m for m in guild.members if not m.bot]
        if len(all_members) < 8:
            await interaction.followup.send("❌ Not enough members in server (need 8)", ephemeral=True)
            return
        
        random_players = random.sample(all_members, 8)
        player_ids = [m.id for m in random_players]
        
        # Get MMRs and balance teams
        player_mmrs = {}
        for user_id in player_ids:
            mmr = await get_player_mmr(user_id)
            player_mmrs[user_id] = mmr
        
        # Simple balance: sort by MMR and alternate
        sorted_players = sorted(player_ids, key=lambda x: player_mmrs[x], reverse=True)
        red_team = [sorted_players[i] for i in range(0, 8, 2)]
        blue_team = [sorted_players[i] for i in range(1, 8, 2)]
        
        red_avg = int(sum(player_mmrs[uid] for uid in red_team) / len(red_team))
        blue_avg = int(sum(player_mmrs[uid] for uid in blue_team) / len(blue_team))
        
        # Build all valid map/gametype combinations
        MAP_GAMETYPES = {
            "Midship": ["MLG CTF5", "MLG Team Slayer", "MLG Oddball", "MLG Bomb"],
            "Beaver Creek": ["MLG Team Slayer"],
            "Lockout": ["MLG Team Slayer", "MLG Oddball"],
            "Warlock": ["MLG Team Slayer", "MLG CTF5"],
            "Sanctuary": ["MLG CTF3", "MLG Team Slayer"]
        }
        
        all_combinations = []
        for map_name, gametypes in MAP_GAMETYPES.items():
            for gametype in gametypes:
                all_combinations.append((map_name, gametype))
        
        # Create games with RANDOM winners
        games = []
        for i, (map_name, gametype) in enumerate(all_combinations):
            winner = random.choice(["RED", "BLUE"])
            loser = "BLUE" if winner == "RED" else "RED"
            
            games.append({
                "game_number": i + 1,
                "winner": winner,
                "loser": loser,
                "map": map_name,
                "gametype": gametype
            })
        
        # Calculate final score
        red_wins = sum(1 for g in games if g["winner"] == "RED")
        blue_wins = sum(1 for g in games if g["winner"] == "BLUE")
        overall_winner = "RED" if red_wins > blue_wins else "BLUE" if blue_wins > red_wins else "TIE"
        
        # Create test match entry
        timestamp = datetime.now().isoformat()
        timestamp_display = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        
        match_entry = {
            "match_type": "TEST_LOG",
            "match_id": "test_log_" + datetime.now().strftime('%Y%m%d_%H%M%S'),
            "timestamp": timestamp,
            "timestamp_display": timestamp_display,
            "winner": overall_winner,
            "final_score": {
                "red": red_wins,
                "blue": blue_wins
            },
            "teams": {
                "red": {
                    "players": red_team,
                    "avg_mmr": red_avg
                },
                "blue": {
                    "players": blue_team,
                    "avg_mmr": blue_avg
                }
            },
            "games": games,
            "total_games_played": len(games),
            "logged_by": interaction.user.id,
            "logged_by_name": interaction.user.display_name
        }
        
        # Load or create testmatchhistory.json
        history_file = 'testmatchhistory.json'
        if os.path.exists(history_file):
            try:
                with open(history_file, 'r') as f:
                    history = json.load(f)
            except:
                history = {"total_test_logs": 0, "matches": []}
        else:
            history = {"total_test_logs": 0, "matches": []}
        
        # Add match
        history["total_test_logs"] = history.get("total_test_logs", 0) + 1
        history["matches"].append(match_entry)
        
        # Save
        with open(history_file, 'w') as f:
            json.dump(history, f, indent=2)
        
        log_action(f"{interaction.user.display_name} logged test match with {len(games)} games")
        
        # Push to GitHub
        try:
            import github_webhook
            github_webhook.update_testmatchhistory_on_github()
        except Exception as e:
            log_action(f"Failed to push test match history to GitHub: {e}")
        
        # Send summary
        await interaction.followup.send(
            f"✅ **Test match logged to testmatchhistory.json**\n\n"
            f"**Teams:**\n"
            f"🔴 Red Team (Avg MMR: {red_avg})\n"
            f"🔵 Blue Team (Avg MMR: {blue_avg})\n\n"
            f"**Games:** {len(games)} total\n"
            f"**Final Score:** Red {red_wins} - {blue_wins} Blue\n"
            f"**Winner:** {overall_winner}\n\n"
            f"All valid map/gametype combinations played with alternating wins!",
            ephemeral=True
        )
    
    # ==== TEST COMMANDS ====
    
    @bot.tree.command(name='testmatchmaking', description='[STAFF] Start a 2-player test match with full flow')
    @has_admin_role()
    async def test_matchmaking(interaction: discord.Interaction):
        """Start a 2-player test match - goes through full pregame/ingame flow"""
        await interaction.response.defer(ephemeral=True)
        
        from searchmatchmaking import queue_state, log_action, update_queue_embed
        from pregame import start_pregame, PREGAME_LOBBY_ID
        
        guild = interaction.guild
        tester = interaction.user
        
        # Get a random member (exclude bots and tester)
        all_members = [m for m in guild.members if not m.bot and m.id != tester.id]
        if len(all_members) < 1:
            await interaction.followup.send("❌ Not enough members in server for test", ephemeral=True)
            return
        
        random_partner = random.choice(all_members)
        
        # Set up test mode
        queue_state.test_mode = True
        queue_state.test_team = None  # Will be determined by team selection
        queue_state.queue = [tester.id, random_partner.id]
        queue_state.queue_join_times = {
            tester.id: datetime.now(),
            random_partner.id: datetime.now()
        }
        
        log_action(f"Test matchmaking started by {tester.display_name} with {random_partner.display_name}")
        
        # Move players to pregame lobby if they're in voice
        pregame_lobby = guild.get_channel(PREGAME_LOBBY_ID)
        if pregame_lobby:
            for member in [tester, random_partner]:
                if member.voice and member.voice.channel:
                    try:
                        await member.move_to(pregame_lobby)
                        log_action(f"Moved {member.display_name} to Pregame Lobby")
                    except:
                        pass
        
        # Start pregame with 2 players
        await start_pregame(interaction.channel, test_mode=True, test_players=[tester.id, random_partner.id])
    
    @bot.tree.command(name='swap', description='Swap a player on Red team with a player on Blue team')
    @app_commands.describe(
        red_player="Player currently on RED team to swap",
        blue_player="Player currently on BLUE team to swap"
    )
    async def swap_players(
        interaction: discord.Interaction,
        red_player: discord.Member,
        blue_player: discord.Member
    ):
        """Swap players between teams mid-series"""
        from searchmatchmaking import queue_state, log_action
        
        if not queue_state.current_series:
            await interaction.response.send_message("❌ No active series to swap players in!", ephemeral=True)
            return
        
        series = queue_state.current_series
        
        # Verify players are on correct teams
        if red_player.id not in series.red_team:
            await interaction.response.send_message(f"❌ {red_player.display_name} is not on Red team!", ephemeral=True)
            return
        
        if blue_player.id not in series.blue_team:
            await interaction.response.send_message(f"❌ {blue_player.display_name} is not on Blue team!", ephemeral=True)
            return
        
        # Perform swap
        red_index = series.red_team.index(red_player.id)
        blue_index = series.blue_team.index(blue_player.id)
        
        series.red_team[red_index] = blue_player.id
        series.blue_team[blue_index] = red_player.id
        
        # Track swap history
        if not hasattr(series, 'swap_history'):
            series.swap_history = []
        
        series.swap_history.append({
            "game": series.current_game,
            "red_to_blue": red_player.id,
            "blue_to_red": blue_player.id,
            "timestamp": datetime.now().isoformat()
        })
        
        log_action(f"Swap: {red_player.display_name} (RED→BLUE) ↔ {blue_player.display_name} (BLUE→RED)")
        
        # Move players to new VCs if they're in voice and VCs exist
        guild = interaction.guild
        if hasattr(series, 'red_vc_id') and hasattr(series, 'blue_vc_id'):
            red_vc = guild.get_channel(series.red_vc_id)
            blue_vc = guild.get_channel(series.blue_vc_id)
            
            if red_vc and blue_vc:
                # Move red_player to blue VC
                if red_player.voice and red_player.voice.channel:
                    try:
                        await red_player.move_to(blue_vc)
                    except:
                        pass
                
                # Move blue_player to red VC
                if blue_player.voice and blue_player.voice.channel:
                    try:
                        await blue_player.move_to(red_vc)
                    except:
                        pass
        
        # Update series embed if it exists
        from ingame import SeriesView
        if series.series_message:
            try:
                view = SeriesView(series)
                await view.update_series_embed(interaction.channel)
            except:
                pass
        
        # Save state
        try:
            import state_manager
            state_manager.save_state()
        except:
            pass
        
        await interaction.response.defer()
    
    # ========== ALIAS COMMANDS ==========
    
    @bot.tree.command(name="linkalias", description="Link an in-game alias to your Discord account")
    @app_commands.describe(alias="Your in-game name/alias (e.g., your gamertag)")
    async def link_alias(interaction: discord.Interaction, alias: str):
        """Link an in-game alias - can have multiple"""
        import twitch
        
        alias = alias.strip()
        
        if not alias:
            await interaction.response.send_message("❌ Please provide an alias.", ephemeral=True)
            return
        
        if len(alias) > 50:
            await interaction.response.send_message("❌ Alias too long (max 50 characters).", ephemeral=True)
            return
        
        players = twitch.load_players()
        user_id = str(interaction.user.id)
        
        # Initialize player entry if doesn't exist
        if user_id not in players:
            players[user_id] = {}
        
        # Initialize aliases list if doesn't exist
        if "aliases" not in players[user_id]:
            players[user_id]["aliases"] = []
        
        # Check if alias already linked to this user
        if alias.lower() in [a.lower() for a in players[user_id]["aliases"]]:
            await interaction.response.send_message(
                f"❌ Alias **{alias}** is already linked to your account.",
                ephemeral=True
            )
            return
        
        # Check if alias is taken by someone else
        for other_id, other_data in players.items():
            if other_id != user_id:
                other_aliases = other_data.get("aliases", [])
                if alias.lower() in [a.lower() for a in other_aliases]:
                    await interaction.response.send_message(
                        f"❌ Alias **{alias}** is already linked to another user.",
                        ephemeral=True
                    )
                    return
        
        # Add alias
        players[user_id]["aliases"].append(alias)
        twitch.save_players(players)
        
        # Show all aliases
        all_aliases = players[user_id]["aliases"]
        await interaction.response.send_message(
            f"✅ Alias **{alias}** linked!\n"
            f"Your aliases: {', '.join(all_aliases)}",
            ephemeral=True
        )
        log_action(f"{interaction.user.name} linked alias: {alias}")
    
    @bot.tree.command(name="unlinkalias", description="Remove an in-game alias from your Discord account")
    @app_commands.describe(alias="The alias to remove")
    async def unlink_alias(interaction: discord.Interaction, alias: str):
        """Remove an in-game alias"""
        import twitch
        
        alias = alias.strip()
        players = twitch.load_players()
        user_id = str(interaction.user.id)
        
        if user_id not in players or "aliases" not in players[user_id]:
            await interaction.response.send_message("❌ You have no aliases linked.", ephemeral=True)
            return
        
        # Find alias (case-insensitive)
        found_alias = None
        for a in players[user_id]["aliases"]:
            if a.lower() == alias.lower():
                found_alias = a
                break
        
        if not found_alias:
            await interaction.response.send_message(
                f"❌ Alias **{alias}** not found in your linked aliases.",
                ephemeral=True
            )
            return
        
        # Remove alias
        players[user_id]["aliases"].remove(found_alias)
        twitch.save_players(players)
        
        remaining = players[user_id].get("aliases", [])
        if remaining:
            await interaction.response.send_message(
                f"✅ Alias **{found_alias}** removed.\n"
                f"Remaining aliases: {', '.join(remaining)}",
                ephemeral=True
            )
        else:
            await interaction.response.send_message(
                f"✅ Alias **{found_alias}** removed. You have no more aliases.",
                ephemeral=True
            )
        log_action(f"{interaction.user.name} unlinked alias: {found_alias}")
    
    @bot.tree.command(name="myaliases", description="View your linked in-game aliases")
    async def my_aliases(interaction: discord.Interaction):
        """View your linked aliases"""
        import twitch
        
        players = twitch.load_players()
        user_id = str(interaction.user.id)
        
        if user_id not in players or not players[user_id].get("aliases"):
            await interaction.response.send_message(
                "You have no aliases linked. Use `/linkalias` to add one.",
                ephemeral=True
            )
            return
        
        aliases = players[user_id]["aliases"]
        await interaction.response.send_message(
            f"Your aliases: **{', '.join(aliases)}**",
            ephemeral=True
        )
    
    @bot.tree.command(name="checkaliases", description="Check someone's in-game aliases")
    @app_commands.describe(user="The user to check")
    async def check_aliases(interaction: discord.Interaction, user: discord.Member):
        """Check someone's aliases"""
        import twitch
        
        players = twitch.load_players()
        user_id = str(user.id)
        
        if user_id not in players or not players[user_id].get("aliases"):
            await interaction.response.send_message(
                f"{user.display_name} has no aliases linked.",
                ephemeral=True
            )
            return
        
        aliases = players[user_id]["aliases"]
        await interaction.response.send_message(
            f"{user.display_name}'s aliases: **{', '.join(aliases)}**",
            ephemeral=True
        )
    
    @bot.tree.command(name="adminunlinkalias", description="[ADMIN] Remove an alias from someone")
    @has_admin_role()
    @app_commands.describe(user="The user", alias="The alias to remove")
    async def admin_unlink_alias(interaction: discord.Interaction, user: discord.Member, alias: str):
        """Admin: Remove someone's alias"""
        import twitch
        
        alias = alias.strip()
        players = twitch.load_players()
        user_id = str(user.id)
        
        if user_id not in players or "aliases" not in players[user_id]:
            await interaction.response.send_message(
                f"❌ {user.display_name} has no aliases linked.",
                ephemeral=True
            )
            return
        
        # Find alias (case-insensitive)
        found_alias = None
        for a in players[user_id]["aliases"]:
            if a.lower() == alias.lower():
                found_alias = a
                break
        
        if not found_alias:
            await interaction.response.send_message(
                f"❌ Alias **{alias}** not found for {user.display_name}.",
                ephemeral=True
            )
            return
        
        players[user_id]["aliases"].remove(found_alias)
        twitch.save_players(players)
        
        await interaction.response.defer()
        log_action(f"Admin {interaction.user.name} removed alias '{found_alias}' from {user.display_name}")
    
    @bot.tree.command(name='testmatchmakingred', description='[LEGACY] Test matchmaking as RED team')
    async def test_matchmaking_red(interaction: discord.Interaction):
        """Test queue for RED team - 8 random members, balanced, tester moved to red VC"""
        await interaction.response.defer(ephemeral=True)
        
        from searchmatchmaking import queue_state
        from pregame import finalize_teams
        
        queue_state.test_mode = True
        queue_state.test_team = 'RED'
        
        guild = interaction.guild
        
        # Get 8 random members (exclude bots)
        all_members = [m for m in guild.members if not m.bot]
        if len(all_members) < 8:
            await interaction.followup.send("❌ Not enough members in server for test (need 8)")
            return
        
        random_players = random.sample(all_members, 8)
        player_ids = [m.id for m in random_players]
        
        # Get MMRs and balance teams
        player_mmrs = {}
        for user_id in player_ids:
            player_mmrs[user_id] = await get_player_mmr(user_id)
        
        # Sort by MMR and snake draft
        sorted_players = sorted(player_mmrs.items(), key=lambda x: x[1], reverse=True)
        red_team = []
        blue_team = []
        
        for i, (user_id, mmr) in enumerate(sorted_players):
            if i % 2 == 0:
                red_team.append(user_id)
            else:
                blue_team.append(user_id)
        
        # Optimize balance
        red_mmr = sum(player_mmrs[uid] for uid in red_team)
        blue_mmr = sum(player_mmrs[uid] for uid in blue_team)
        
        best_diff = abs(red_mmr - blue_mmr)
        best_red = red_team[:]
        best_blue = blue_team[:]
        
        for i in range(len(red_team)):
            for j in range(len(blue_team)):
                test_red = red_team[:]
                test_blue = blue_team[:]
                test_red[i], test_blue[j] = test_blue[j], test_red[i]
                
                test_red_mmr = sum(player_mmrs[uid] for uid in test_red)
                test_blue_mmr = sum(player_mmrs[uid] for uid in test_blue)
                diff = abs(test_red_mmr - test_blue_mmr)
                
                if diff < best_diff:
                    best_diff = diff
                    best_red = test_red
                    best_blue = test_blue
        
        # FIRST: Move tester to pregame lobby
        pregame_vc = guild.get_channel(PREGAME_LOBBY_ID)
        tester = interaction.user
        if tester.voice and pregame_vc:
            try:
                await tester.move_to(pregame_vc)
                log_action(f"Moved tester {tester.name} to pregame lobby")
            except Exception as e:
                log_action(f"Failed to move tester to pregame: {e}")
        
        # Calculate MMRs for display
        red_avg = int(sum(player_mmrs[uid] for uid in best_red) / len(best_red))
        blue_avg = int(sum(player_mmrs[uid] for uid in best_blue) / len(best_blue))
        
        log_action(f"Test RED queue started by {interaction.user.name} - Balanced teams (MMR diff: {best_diff})")
        
        # Use finalize_teams to create VCs and series - MUST pass test_mode=True
        await finalize_teams(interaction.channel, best_red, best_blue, test_mode=True)
        
        # THEN: Manually move tester to RED VC since they're testing red
        if tester.voice and queue_state.current_series:
            red_vc = guild.get_channel(queue_state.current_series.red_vc_id)
            if red_vc:
                try:
                    await tester.move_to(red_vc)
                    log_action(f"Moved tester {tester.name} to RED VC for testing")
                except Exception as e:
                    log_action(f"Failed to move tester to red VC: {e}")
    
    @bot.tree.command(name='testmatchmakingblue', description='Test matchmaking as BLUE team')
    async def test_matchmaking_blue(interaction: discord.Interaction):
        """Test queue for BLUE team - 8 random members, balanced, tester moved to blue VC"""
        await interaction.response.defer(ephemeral=True)
        
        from searchmatchmaking import queue_state
        from pregame import finalize_teams
        
        queue_state.test_mode = True
        queue_state.test_team = 'BLUE'
        
        guild = interaction.guild
        
        # Get 8 random members (exclude bots)
        all_members = [m for m in guild.members if not m.bot]
        if len(all_members) < 8:
            await interaction.followup.send("❌ Not enough members in server for test (need 8)")
            return
        
        random_players = random.sample(all_members, 8)
        player_ids = [m.id for m in random_players]
        
        # Get MMRs and balance teams
        player_mmrs = {}
        for user_id in player_ids:
            player_mmrs[user_id] = await get_player_mmr(user_id)
        
        # Sort by MMR and snake draft
        sorted_players = sorted(player_mmrs.items(), key=lambda x: x[1], reverse=True)
        red_team = []
        blue_team = []
        
        for i, (user_id, mmr) in enumerate(sorted_players):
            if i % 2 == 0:
                red_team.append(user_id)
            else:
                blue_team.append(user_id)
        
        # Optimize balance
        red_mmr = sum(player_mmrs[uid] for uid in red_team)
        blue_mmr = sum(player_mmrs[uid] for uid in blue_team)
        
        best_diff = abs(red_mmr - blue_mmr)
        best_red = red_team[:]
        best_blue = blue_team[:]
        
        for i in range(len(red_team)):
            for j in range(len(blue_team)):
                test_red = red_team[:]
                test_blue = blue_team[:]
                test_red[i], test_blue[j] = test_blue[j], test_red[i]
                
                test_red_mmr = sum(player_mmrs[uid] for uid in test_red)
                test_blue_mmr = sum(player_mmrs[uid] for uid in test_blue)
                diff = abs(test_red_mmr - test_blue_mmr)
                
                if diff < best_diff:
                    best_diff = diff
                    best_red = test_red
                    best_blue = test_blue
        
        # FIRST: Move tester to pregame lobby
        pregame_vc = guild.get_channel(PREGAME_LOBBY_ID)
        tester = interaction.user
        if tester.voice and pregame_vc:
            try:
                await tester.move_to(pregame_vc)
                log_action(f"Moved tester {tester.name} to pregame lobby")
            except Exception as e:
                log_action(f"Failed to move tester to pregame: {e}")
        
        # Calculate MMRs for display
        red_avg = int(sum(player_mmrs[uid] for uid in best_red) / len(best_red))
        blue_avg = int(sum(player_mmrs[uid] for uid in best_blue) / len(best_blue))
        
        log_action(f"Test BLUE queue started by {interaction.user.name} - Balanced teams (MMR diff: {best_diff})")
        
        # Use finalize_teams to create VCs and series - MUST pass test_mode=True
        await finalize_teams(interaction.channel, best_red, best_blue, test_mode=True)
        
        # THEN: Manually move tester to BLUE VC since they're testing blue
        if tester.voice and queue_state.current_series:
            blue_vc = guild.get_channel(queue_state.current_series.blue_vc_id)
            if blue_vc:
                try:
                    await tester.move_to(blue_vc)
                    log_action(f"Moved tester {tester.name} to BLUE VC for testing")
                except Exception as e:
                    log_action(f"Failed to move tester to blue VC: {e}")
    
    # ==== PUBLIC COMMANDS ====
    
    @bot.tree.command(name='help', description='Show all available commands')
    async def help_command(interaction: discord.Interaction):
        """Show all commands with availability info"""
        user_roles = [role.name for role in interaction.user.roles]
        is_admin = any(role in ADMIN_ROLES for role in user_roles)
        
        embed = discord.Embed(
            title="Bot Commands",
            description="Here are all available commands:",
            color=discord.Color.blue()
        )
        
        # Public Commands
        public_commands = """
        **Queue Commands:**
        • Use the buttons in the queue channel to join/leave
        
        **Match Commands:**
        • `/swap @red_player @blue_player` - Swap players between teams
        • `/stream` - Get MultiTwitch links for current match
        
        **Twitch Commands:**
        • `/settwitch <username>` - Link your Twitch account
        • `/removetwitch` - Unlink your Twitch
        • `/mytwitch` - Check your linked Twitch
        • `/checktwitch @user` - Check someone's Twitch
        
        **Alias Commands:**
        • `/linkalias <name>` - Link an in-game alias
        • `/unlinkalias <name>` - Remove an alias
        • `/myaliases` - View your aliases
        • `/checkaliases @user` - Check someone's aliases
        
        **Info Commands:**
        • `/help` - Show this help message
        • `/playerstats` - View your stats
        • `/playerstats @user` - View someone's stats
        • `/leaderboard` - View leaderboard (Rank/Wins/Series/MMR)
        • `/verifystats` - Update your rank role
        """
        
        embed.add_field(
            name="Commands Available to Everyone",
            value=public_commands.strip(),
            inline=False
        )
        
        # Admin Commands (show to everyone but note admin-only)
        admin_commands = """
        **Queue Management:**
        • `/addplayer @user` - Add player to queue
        • `/removeplayer @user` - Remove player from match
        • `/resetqueue` - Clear the entire queue
        • `/cancelmatch` - Cancel match (games stay recorded)
        
        **Match Management:**
        • `/correctcurrent <game#> <winner>` - Fix game result
        • `/mmr @user <value>` - Set player MMR
        • `/addgamestats` - Add map/gametype info
        • `/silentrankrefresh` - Refresh all ranks silently (no DMs)
        
        **Configuration:**
        • `/bannedroles <roles>` - Set banned roles
        • `/requiredroles <roles>` - Set required roles
        
        **Testing:**
        • `/testmatchmaking` - Start 2-player test match (full flow)
        • `/testmatchmakingred` - Test as RED team (8 players)
        • `/testmatchmakingblue` - Test as BLUE team (8 players)
        • `/logtestmatch` - Log test match with all map combos
        
        **Twitch/Alias Admin:**
        • `/adminsettwitch @user <twitch>` - Set someone's Twitch
        • `/adminremovetwitch @user` - Remove someone's Twitch
        • `/adminunlinkalias @user <alias>` - Remove someone's alias
        """
        
        if is_admin:
            embed.add_field(
                name="Admin Commands (You have access)",
                value=admin_commands.strip(),
                inline=False
            )
        else:
            embed.add_field(
                name="Admin Commands (Staff/Overlord only)",
                value=admin_commands.strip(),
                inline=False
            )
        
        embed.set_footer(text="Use /help anytime to see this list again")
        
        await interaction.response.send_message(embed=embed, ephemeral=True)
    
    return bot
