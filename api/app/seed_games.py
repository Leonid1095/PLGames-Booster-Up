"""Seed data for game profiles."""

GAMES = [
    # FPS
    {"name": "Counter-Strike 2", "slug": "cs2", "exe_names": ["cs2.exe"], "server_ips": ["155.133.232.0/23", "155.133.234.0/23", "155.133.236.0/22", "155.133.240.0/23", "155.133.242.0/23", "155.133.244.0/23", "155.133.246.0/23", "155.133.248.0/21", "162.254.192.0/21", "185.25.180.0/22", "192.69.96.0/22"], "ports": ["27015-27050"], "protocol": "UDP", "category": "fps", "is_popular": True},
    {"name": "Valorant", "slug": "valorant", "exe_names": ["VALORANT-Win64-Shipping.exe", "VALORANT.exe"], "server_ips": ["162.249.72.0/22", "162.249.76.0/22", "104.160.128.0/17"], "ports": ["7000-8000"], "protocol": "UDP", "category": "fps", "is_popular": True},
    {"name": "Overwatch 2", "slug": "overwatch-2", "exe_names": ["Overwatch.exe"], "server_ips": ["24.105.0.0/18", "37.244.0.0/18"], "ports": ["26503-36503"], "protocol": "UDP", "category": "fps", "is_popular": True},
    {"name": "Apex Legends", "slug": "apex-legends", "exe_names": ["r5apex.exe"], "server_ips": ["159.153.0.0/16"], "ports": ["37000-37100"], "protocol": "UDP", "category": "fps", "is_popular": True},
    {"name": "Call of Duty: Warzone", "slug": "cod-warzone", "exe_names": ["cod.exe", "ModernWarfare.exe"], "server_ips": ["185.34.106.0/24", "185.34.107.0/24"], "ports": ["3074", "27014-27050"], "protocol": "UDP", "category": "fps", "is_popular": True},
    {"name": "Rainbow Six Siege", "slug": "rainbow-six-siege", "exe_names": ["RainbowSix.exe"], "server_ips": ["185.82.200.0/22"], "ports": ["10000-10100"], "protocol": "UDP", "category": "fps", "is_popular": True},
    {"name": "Escape from Tarkov", "slug": "escape-from-tarkov", "exe_names": ["EscapeFromTarkov.exe"], "server_ips": ["185.104.184.0/22"], "ports": ["17000-17100"], "protocol": "UDP", "category": "fps", "is_popular": True},
    {"name": "Team Fortress 2", "slug": "tf2", "exe_names": ["hl2.exe"], "server_ips": ["155.133.232.0/23", "162.254.192.0/21"], "ports": ["27015-27050"], "protocol": "UDP", "category": "fps", "is_popular": False},
    {"name": "Battlefield 2042", "slug": "battlefield-2042", "exe_names": ["BF2042.exe"], "server_ips": ["159.153.0.0/16"], "ports": ["25200-25300"], "protocol": "UDP", "category": "fps", "is_popular": False},
    {"name": "Hunt: Showdown", "slug": "hunt-showdown", "exe_names": ["HuntGame.exe"], "server_ips": ["185.82.200.0/22"], "ports": ["27015-27030"], "protocol": "UDP", "category": "fps", "is_popular": False},
    {"name": "The Finals", "slug": "the-finals", "exe_names": ["Discovery.exe"], "server_ips": ["159.153.0.0/16"], "ports": ["27015-27050"], "protocol": "UDP", "category": "fps", "is_popular": True},
    {"name": "Deadlock", "slug": "deadlock", "exe_names": ["project8.exe", "deadlock.exe"], "server_ips": ["155.133.232.0/23", "162.254.192.0/21"], "ports": ["27015-27050"], "protocol": "UDP", "category": "fps", "is_popular": True},
    {"name": "XDefiant", "slug": "xdefiant", "exe_names": ["XDefiant.exe"], "server_ips": ["185.82.200.0/22"], "ports": ["10000-10100"], "protocol": "UDP", "category": "fps", "is_popular": False},
    {"name": "Halo Infinite", "slug": "halo-infinite", "exe_names": ["HaloInfinite.exe"], "server_ips": ["20.33.0.0/16", "20.40.0.0/13"], "ports": ["3074-3075"], "protocol": "UDP", "category": "fps", "is_popular": False},
    {"name": "Counter-Strike: Global Offensive", "slug": "csgo", "exe_names": ["csgo.exe"], "server_ips": ["155.133.232.0/23", "162.254.192.0/21"], "ports": ["27015-27050"], "protocol": "UDP", "category": "fps", "is_popular": False},

    # MOBA
    {"name": "Dota 2", "slug": "dota-2", "exe_names": ["dota2.exe"], "server_ips": ["155.133.232.0/23", "162.254.192.0/21", "185.25.180.0/22", "192.69.96.0/22"], "ports": ["27015-27050"], "protocol": "UDP", "category": "moba", "is_popular": True},
    {"name": "League of Legends", "slug": "league-of-legends", "exe_names": ["League of Legends.exe", "LeagueClient.exe"], "server_ips": ["104.160.128.0/17", "185.40.64.0/22"], "ports": ["5000-5500", "8393-8400"], "protocol": "UDP", "category": "moba", "is_popular": True},
    {"name": "Smite 2", "slug": "smite-2", "exe_names": ["Smite2.exe"], "server_ips": ["159.153.0.0/16"], "ports": ["9000-9100"], "protocol": "UDP", "category": "moba", "is_popular": False},
    {"name": "Heroes of the Storm", "slug": "heroes-of-the-storm", "exe_names": ["HeroesOfTheStorm_x64.exe"], "server_ips": ["24.105.0.0/18", "37.244.0.0/18"], "ports": ["1119-1120"], "protocol": "UDP", "category": "moba", "is_popular": False},

    # Battle Royale
    {"name": "Fortnite", "slug": "fortnite", "exe_names": ["FortniteClient-Win64-Shipping.exe"], "server_ips": ["99.83.128.0/17", "18.160.0.0/15"], "ports": ["5222", "5795-5847"], "protocol": "UDP", "category": "battle_royale", "is_popular": True},
    {"name": "PUBG: Battlegrounds", "slug": "pubg", "exe_names": ["TslGame.exe"], "server_ips": ["13.124.0.0/16", "52.78.0.0/16"], "ports": ["7086-7995"], "protocol": "UDP", "category": "battle_royale", "is_popular": True},
    {"name": "Naraka: Bladepoint", "slug": "naraka-bladepoint", "exe_names": ["NarakaBladepoint.exe"], "server_ips": ["159.153.0.0/16"], "ports": ["27015-27050"], "protocol": "UDP", "category": "battle_royale", "is_popular": False},
    {"name": "Super People 2", "slug": "super-people-2", "exe_names": ["SuperPeople2.exe"], "server_ips": ["13.124.0.0/16"], "ports": ["7777-7800"], "protocol": "UDP", "category": "battle_royale", "is_popular": False},

    # MMO/RPG
    {"name": "World of Warcraft", "slug": "world-of-warcraft", "exe_names": ["Wow.exe", "WowClassic.exe"], "server_ips": ["24.105.0.0/18", "37.244.0.0/18"], "ports": ["3724", "1119-1120"], "protocol": "TCP", "category": "mmo", "is_popular": True},
    {"name": "Final Fantasy XIV", "slug": "ffxiv", "exe_names": ["ffxiv_dx11.exe"], "server_ips": ["204.2.229.0/24", "124.150.157.0/24"], "ports": ["54992-54994", "55006-55007", "55021-55040"], "protocol": "TCP", "category": "mmo", "is_popular": True},
    {"name": "Lost Ark", "slug": "lost-ark", "exe_names": ["LOSTARK.exe"], "server_ips": ["99.83.128.0/17"], "ports": ["6040-6050"], "protocol": "TCP", "category": "mmo", "is_popular": False},
    {"name": "New World: Aeternum", "slug": "new-world", "exe_names": ["NewWorld.exe"], "server_ips": ["99.83.128.0/17"], "ports": ["5061-5062"], "protocol": "TCP", "category": "mmo", "is_popular": False},
    {"name": "Guild Wars 2", "slug": "guild-wars-2", "exe_names": ["Gw2-64.exe"], "server_ips": ["64.25.38.0/24"], "ports": ["6112-6119"], "protocol": "TCP", "category": "mmo", "is_popular": False},
    {"name": "Elder Scrolls Online", "slug": "elder-scrolls-online", "exe_names": ["eso64.exe"], "server_ips": ["159.153.0.0/16"], "ports": ["24100-24131"], "protocol": "TCP", "category": "mmo", "is_popular": False},
    {"name": "Path of Exile 2", "slug": "path-of-exile-2", "exe_names": ["PathOfExileSteam.exe", "PathOfExile_x64Steam.exe"], "server_ips": ["159.153.0.0/16"], "ports": ["6112-6119", "20481"], "protocol": "TCP", "category": "mmo", "is_popular": True},
    {"name": "Diablo IV", "slug": "diablo-iv", "exe_names": ["Diablo IV.exe"], "server_ips": ["24.105.0.0/18", "37.244.0.0/18"], "ports": ["1119-1120"], "protocol": "TCP", "category": "mmo", "is_popular": True},
    {"name": "Throne and Liberty", "slug": "throne-and-liberty", "exe_names": ["TLGame.exe"], "server_ips": ["99.83.128.0/17"], "ports": ["10000-10100"], "protocol": "TCP", "category": "mmo", "is_popular": False},

    # Racing / Sports
    {"name": "Rocket League", "slug": "rocket-league", "exe_names": ["RocketLeague.exe"], "server_ips": ["159.153.0.0/16"], "ports": ["7000-9000"], "protocol": "UDP", "category": "sports", "is_popular": True},
    {"name": "EA FC 25", "slug": "ea-fc-25", "exe_names": ["FC25.exe"], "server_ips": ["159.153.0.0/16"], "ports": ["3659", "9960-9969"], "protocol": "UDP", "category": "sports", "is_popular": True},
    {"name": "Assetto Corsa Competizione", "slug": "assetto-corsa-competizione", "exe_names": ["AC2-Win64-Shipping.exe"], "server_ips": ["159.153.0.0/16"], "ports": ["9232-9236"], "protocol": "UDP", "category": "racing", "is_popular": False},
    {"name": "iRacing", "slug": "iracing", "exe_names": ["iRacingSim64DX11.exe"], "server_ips": ["184.168.0.0/16"], "ports": ["32034"], "protocol": "UDP", "category": "racing", "is_popular": False},

    # Survival / Sandbox
    {"name": "Rust", "slug": "rust", "exe_names": ["RustClient.exe"], "server_ips": ["155.133.232.0/23", "162.254.192.0/21"], "ports": ["28015-28016"], "protocol": "UDP", "category": "survival", "is_popular": True},
    {"name": "ARK: Survival Ascended", "slug": "ark-survival-ascended", "exe_names": ["ArkAscended.exe"], "server_ips": ["159.153.0.0/16"], "ports": ["7777-7778"], "protocol": "UDP", "category": "survival", "is_popular": False},
    {"name": "Minecraft (Java)", "slug": "minecraft-java", "exe_names": ["javaw.exe"], "server_ips": ["0.0.0.0/0"], "ports": ["25565"], "protocol": "TCP", "category": "survival", "is_popular": True},
    {"name": "DayZ", "slug": "dayz", "exe_names": ["DayZ_x64.exe"], "server_ips": ["155.133.232.0/23", "162.254.192.0/21"], "ports": ["2302-2305"], "protocol": "UDP", "category": "survival", "is_popular": False},
    {"name": "7 Days to Die", "slug": "7-days-to-die", "exe_names": ["7DaysToDie.exe"], "server_ips": ["155.133.232.0/23", "162.254.192.0/21"], "ports": ["26900-26902"], "protocol": "UDP", "category": "survival", "is_popular": False},
    {"name": "Palworld", "slug": "palworld", "exe_names": ["Palworld-Win64-Shipping.exe"], "server_ips": ["155.133.232.0/23", "162.254.192.0/21"], "ports": ["8211"], "protocol": "UDP", "category": "survival", "is_popular": True},

    # Strategy / RTS
    {"name": "Starcraft II", "slug": "starcraft-ii", "exe_names": ["SC2_x64.exe"], "server_ips": ["24.105.0.0/18", "37.244.0.0/18"], "ports": ["1119-1120"], "protocol": "TCP", "category": "strategy", "is_popular": False},
    {"name": "Age of Empires IV", "slug": "age-of-empires-iv", "exe_names": ["RelicCardinal.exe"], "server_ips": ["20.33.0.0/16", "20.40.0.0/13"], "ports": ["27015-27030"], "protocol": "UDP", "category": "strategy", "is_popular": False},

    # Fighting
    {"name": "Street Fighter 6", "slug": "street-fighter-6", "exe_names": ["StreetFighter6.exe"], "server_ips": ["159.153.0.0/16"], "ports": ["27015-27030"], "protocol": "UDP", "category": "fighting", "is_popular": True},
    {"name": "Tekken 8", "slug": "tekken-8", "exe_names": ["Tekken8.exe", "Polaris-Win64-Shipping.exe"], "ports": ["27015-27030"], "server_ips": ["159.153.0.0/16"], "protocol": "UDP", "category": "fighting", "is_popular": True},
    {"name": "Mortal Kombat 1", "slug": "mortal-kombat-1", "exe_names": ["MK1.exe"], "server_ips": ["159.153.0.0/16"], "ports": ["27015-27030"], "protocol": "UDP", "category": "fighting", "is_popular": False},

    # Card / Auto-battler
    {"name": "Hearthstone", "slug": "hearthstone", "exe_names": ["Hearthstone.exe"], "server_ips": ["24.105.0.0/18", "37.244.0.0/18"], "ports": ["1119-1120", "3724"], "protocol": "TCP", "category": "card", "is_popular": False},
    {"name": "Teamfight Tactics", "slug": "teamfight-tactics", "exe_names": ["League of Legends.exe"], "server_ips": ["104.160.128.0/17"], "ports": ["5000-5500"], "protocol": "TCP", "category": "card", "is_popular": False},

    # Misc Competitive
    {"name": "War Thunder", "slug": "war-thunder", "exe_names": ["aces.exe"], "server_ips": ["159.153.0.0/16"], "ports": ["20010-20200"], "protocol": "UDP", "category": "fps", "is_popular": False},
    {"name": "World of Tanks", "slug": "world-of-tanks", "exe_names": ["WorldOfTanks.exe"], "server_ips": ["178.20.235.0/24"], "ports": ["20010-20020"], "protocol": "UDP", "category": "fps", "is_popular": False},
    {"name": "Albion Online", "slug": "albion-online", "exe_names": ["Albion-Online.exe"], "server_ips": ["5.188.125.0/24"], "ports": ["4535", "5055"], "protocol": "UDP", "category": "mmo", "is_popular": False},
    {"name": "Destiny 2", "slug": "destiny-2", "exe_names": ["destiny2.exe"], "server_ips": ["155.133.232.0/23", "162.254.192.0/21"], "ports": ["3097", "3478-3480"], "protocol": "UDP", "category": "fps", "is_popular": True},
    {"name": "Genshin Impact", "slug": "genshin-impact", "exe_names": ["GenshinImpact.exe", "YuanShen.exe"], "server_ips": ["47.88.0.0/15"], "ports": ["22101-22102"], "protocol": "UDP", "category": "mmo", "is_popular": True},
    {"name": "Honkai: Star Rail", "slug": "honkai-star-rail", "exe_names": ["StarRail.exe"], "server_ips": ["47.88.0.0/15"], "ports": ["23301-23302"], "protocol": "UDP", "category": "mmo", "is_popular": True},
    {"name": "Wuthering Waves", "slug": "wuthering-waves", "exe_names": ["Client-Win64-Shipping.exe"], "server_ips": ["47.88.0.0/15"], "ports": ["27015-27030"], "protocol": "UDP", "category": "mmo", "is_popular": False},
]
