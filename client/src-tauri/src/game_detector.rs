use sysinfo::{ProcessesToUpdate, System};
use crate::api_client::GameProfile;

/// Scan running processes and match against known game exe_names.
/// Returns the first matched game profile or None.
pub fn detect_running_game(system: &mut System, games: &[GameProfile]) -> Option<GameProfile> {
    system.refresh_processes(ProcessesToUpdate::All, true);

    for process in system.processes().values() {
        let proc_name = process.name().to_string_lossy().to_lowercase();
        for game in games {
            if game
                .exe_names
                .iter()
                .any(|exe| proc_name == exe.to_lowercase())
            {
                return Some(game.clone());
            }
        }
    }
    None
}

/// Get list of all running process names (for debugging)
pub fn list_running_processes(system: &mut System) -> Vec<String> {
    system.refresh_processes(ProcessesToUpdate::All, true);
    let mut names: Vec<String> = system
        .processes()
        .values()
        .map(|p| p.name().to_string_lossy().to_string())
        .collect();
    names.sort();
    names.dedup();
    names
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_game(name: &str, exe_names: &[&str]) -> GameProfile {
        GameProfile {
            id: "test-id".to_string(),
            name: name.to_string(),
            slug: name.to_lowercase().replace(' ', "-"),
            exe_names: exe_names.iter().map(|s| s.to_string()).collect(),
            server_ips: vec![],
            ports: vec![],
            protocol: "UDP".to_string(),
            category: "fps".to_string(),
            is_popular: false,
            created_at: "2024-01-01".to_string(),
        }
    }

    #[test]
    fn test_detect_returns_none_with_no_games() {
        let mut sys = System::new();
        let games: Vec<GameProfile> = vec![];
        assert!(detect_running_game(&mut sys, &games).is_none());
    }

    #[test]
    fn test_detect_with_games_no_match() {
        let mut sys = System::new();
        let games = vec![
            make_game("Test Game", &["nonexistent_game_12345.exe"]),
        ];
        assert!(detect_running_game(&mut sys, &games).is_none());
    }

    #[test]
    fn test_list_processes() {
        let mut sys = System::new();
        let procs = list_running_processes(&mut sys);
        assert!(!procs.is_empty());
    }
}
