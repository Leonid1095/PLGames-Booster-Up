fn main() {
    // Set WINDIVERT_PATH for windivert-sys compilation on Windows
    #[cfg(target_os = "windows")]
    {
        let manifest_dir = std::env::var("CARGO_MANIFEST_DIR").unwrap();
        let windivert_path = std::path::Path::new(&manifest_dir).join("resources").join("windivert");
        if windivert_path.exists() {
            println!(
                "cargo:rustc-env=WINDIVERT_PATH={}",
                windivert_path.display()
            );
            println!(
                "cargo:rustc-link-search=native={}",
                windivert_path.display()
            );
        }
    }

    tauri_build::build()
}
