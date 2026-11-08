//! The mod input: the one file chosen in the plugin's configuration.
//!
//! The plugin finds the file through MPQDraft and reads it. Either step can
//! fail, and both failures are errors, because the plugin was selected but
//! has nothing to apply.

use crate::model::Mod;
use crate::parse::parse_mod;
use crate::problem::Problem;
use crate::vocab::Vocabulary;

/// The mod file, as read by the plugin.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ModFile {
    /// The full path, as MPQDraft gives it.
    pub path: String,
    pub bytes: Vec<u8>,
}

impl ModFile {
    /// The name problems use for this input: the file's name without its folders.
    pub fn name(&self) -> &str {
        file_name(&self.path)
    }
}

/// Why the mod file couldn't be read.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum InputError {
    /// MPQDraft couldn't say where the mod file is.
    NotLocated,
    /// The file was located but couldn't be read.
    Unreadable { path: String, reason: String },
}

/// The last component of a Windows or Unix path.
pub fn file_name(path: &str) -> &str {
    path.rsplit(['\\', '/']).next().unwrap_or(path)
}

/// Turns the plugin's attempt to read the mod file into a validated mod for
/// the running game, or the problems that stop it.
pub fn load_mod(input: Result<ModFile, InputError>, vocab: &Vocabulary) -> Result<Mod, Vec<Problem>> {
    match input {
        Err(InputError::NotLocated) => Err(vec![Problem::new(
            "",
            "",
            "No mod file was found. Choose one in AxeGraft Patcher's configuration in MPQDraft, and if this is a SEMPQ, make it again with the mod file chosen.",
        )]),
        Err(InputError::Unreadable { path, reason }) => {
            Err(vec![Problem::new(file_name(&path), "", format!("The mod file couldn't be read ({reason}). It was expected at {path}."))])
        }
        Ok(file) => parse_mod(file.name(), &file.bytes, vocab),
    }
}

#[cfg(test)]
mod tests {
    use super::file_name;

    #[test]
    fn file_names() {
        assert_eq!(file_name(r"C:\Mods\my mod.json"), "my mod.json");
        assert_eq!(file_name("/tmp/a/b.json"), "b.json");
        assert_eq!(file_name("plain.json"), "plain.json");
        assert_eq!(file_name(r"C:\Mods\"), "");
    }
}
