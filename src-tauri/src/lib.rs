use std::path::PathBuf;
use std::process::{Child, Command, Stdio};
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
    let backend = start_backend_server().map(BackendProcess);

    tauri::Builder::default()
        .setup(move |app| {
            if let Some(process) = backend {
                app.manage(process);
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running WCB Receipt Builder");
}

fn start_backend_server() -> Option<Child> {
    let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let repo_root = manifest_dir.join("..");
    let mut command = if cfg!(debug_assertions) {
        let mut dev = Command::new("pnpm");
        dev.arg("--filter").arg("@wcb/server").arg("dev");
        dev
    } else {
        let mut prod = Command::new("node");
        prod.arg(manifest_dir.join("../apps/server/dist/index.js"));
        prod
    };

    command.current_dir(repo_root);
    command.stdout(Stdio::null());
    command.stderr(Stdio::null());
    command.spawn().ok()
}
