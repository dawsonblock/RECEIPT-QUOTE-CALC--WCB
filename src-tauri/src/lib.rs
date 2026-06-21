use std::process::Child;
use tauri::Manager;

struct BackendProcess(Child);

impl Drop for BackendProcess {
    fn drop(&mut self) {
        let _ = self.0.kill();
        let _ = self.0.wait();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            if let Some(process) = start_backend_server() {
                app.manage(process);
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running WCB Receipt Builder");
}

#[allow(dead_code)]
fn start_backend_server() -> Option<BackendProcess> {
    let manifest_dir = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let repo_root = manifest_dir.join("..");
    let mut command = if cfg!(debug_assertions) {
        let mut dev = std::process::Command::new("pnpm");
        dev.arg("--filter").arg("@wcb/server").arg("dev");
        dev
    } else {
        let mut prod = std::process::Command::new("node");
        prod.arg(manifest_dir.join("../apps/server/dist/index.js"));
        prod
    };

    command.current_dir(repo_root);
    command.stdout(std::process::Stdio::null());
    command.stderr(std::process::Stdio::null());
    command.spawn().ok().map(BackendProcess)
}
