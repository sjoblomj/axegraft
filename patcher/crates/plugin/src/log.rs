//! The log file. Not being able to write it never stops a mod.

use axegraft_patcher_core::report::LogSink;
use std::fs::File;
use std::io::Write;

const NAME: &str = "AxeGraftPatcher.log";

pub struct FileLog {
    file: Option<File>,
    path: String,
    pending: String,
}

impl FileLog {
    /// Replaces the previous launch's log.
    pub fn create() -> FileLog {
        let path = std::env::temp_dir().join(NAME);
        FileLog { file: File::create(&path).ok(), path: path.to_string_lossy().into_owned(), pending: String::new() }
    }

    /// Flushes and closes the log, and returns its path if it was written.
    pub fn close(mut self) -> Option<String> {
        self.flush();
        self.file.take().map(|_| self.path)
    }
}

impl LogSink for FileLog {
    fn line(&mut self, text: &str) {
        self.pending.push_str(text);
        self.pending.push_str("\r\n");
    }

    fn flush(&mut self) {
        let failed = self.file.as_mut().is_some_and(|f| f.write_all(self.pending.as_bytes()).is_err());
        if failed {
            self.file = None;
        }
        self.pending.clear();
    }
}
