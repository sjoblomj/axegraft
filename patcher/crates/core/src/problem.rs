//! Problems found in a mod, the library or the running game.

use std::fmt;

/// One problem, with the input it came from and where in it.
///
/// `input` names the file (or other source) the problem is about, and `path`
/// points into it in the same form AxeGraft Editor uses, such as
/// `button_sets[3].buttons[2].action_variable`. An empty path means the input
/// as a whole.
#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct Problem {
    pub input: String,
    pub path: String,
    pub message: String,
}

impl Problem {
    pub fn new(input: impl Into<String>, path: impl Into<String>, message: impl Into<String>) -> Self {
        Problem { input: input.into(), path: path.into(), message: message.into() }
    }
}

impl fmt::Display for Problem {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match (self.input.is_empty(), self.path.is_empty()) {
            (false, false) => write!(f, "{}: {}: {}", self.input, self.path, self.message),
            (false, true) => write!(f, "{}: {}", self.input, self.message),
            (true, false) => write!(f, "{}: {}", self.path, self.message),
            (true, true) => write!(f, "{}", self.message),
        }
    }
}

/// Collects problems for one input.
#[derive(Debug, Default)]
pub(crate) struct Problems {
    input: String,
    pub(crate) list: Vec<Problem>,
}

impl Problems {
    pub(crate) fn new(input: &str) -> Self {
        Problems { input: input.to_string(), list: Vec::new() }
    }

    pub(crate) fn add(&mut self, path: impl Into<String>, message: impl Into<String>) {
        self.list.push(Problem::new(self.input.clone(), path, message));
    }

    pub(crate) fn is_empty(&self) -> bool {
        self.list.is_empty()
    }

    pub(crate) fn count(&self) -> usize {
        self.list.len()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn formats_with_input_path_and_message() {
        let p = Problem::new("my_mod.json", "units[0].id", "Unit ID 300 is outside the game's button table, 0-249.");
        assert_eq!(p.to_string(), "my_mod.json: units[0].id: Unit ID 300 is outside the game's button table, 0-249.");
    }

    #[test]
    fn formats_without_path() {
        let p = Problem::new("my_mod.json", "", "The file isn't valid JSON.");
        assert_eq!(p.to_string(), "my_mod.json: The file isn't valid JSON.");
    }

    #[test]
    fn keeps_all_three_parts() {
        let p = Problem::new("a.json", "constants[1].name", "No such constant.");
        assert_eq!((p.input.as_str(), p.path.as_str(), p.message.as_str()), ("a.json", "constants[1].name", "No such constant."));
    }
}
