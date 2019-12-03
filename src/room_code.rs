use crate::room::Lobby;
use rand::prelude::*;
use serde::{de::Visitor, Deserialize, Deserializer};
use std::collections::{hash_map::Entry, HashMap};
use std::convert::{Into, TryFrom, TryInto};
use std::fmt::{self, Display, Formatter};
use std::str::FromStr;
use std::sync::{Arc, Mutex};
use std::time::Duration;

const MAX_CODE: u32 = 26 * 26 * 26 * 26;
const MAX_CODE_AGE: Duration = Duration::from_secs(3600);

#[derive(PartialEq, Eq, Hash, Debug, Clone)]
pub struct RoomCode([u8; 4]);

impl TryFrom<u32> for RoomCode {
    type Error = ();

    fn try_from(mut value: u32) -> Result<Self, ()> {
        if value >= MAX_CODE {
            return Err(());
        }
        let mut code = [0; 4];
        for letter in code.iter_mut().rev() {
            *letter = (value % 26) as u8 + b'A';
            value /= 26;
        }
        Ok(RoomCode(code))
    }
}

impl Into<u32> for &RoomCode {
    fn into(self) -> u32 {
        self.0
            .iter()
            .map(|c| c - b'A')
            .fold(0, |sum, c| sum * 26 + c as u32)
    }
}

impl Display for RoomCode {
    fn fmt(&self, f: &mut Formatter) -> fmt::Result {
        write!(f, "{}", &String::from_utf8_lossy(&self.0))
    }
}

impl FromStr for RoomCode {
    type Err = ();

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        let trim = s.trim();
        if trim.bytes().len() != 4 {
            return Err(());
        }
        let mut code = [0; 4];
        for (i, c) in trim
            .to_ascii_uppercase()
            .bytes()
            .map(|c| match c {
                b'A'..=b'Z' => Ok(c),
                _ => Err(()),
            })
            .enumerate()
        {
            code[i] = c?;
        }
        Ok(RoomCode(code))
    }
}

impl<'de> Deserialize<'de> for RoomCode {
    fn deserialize<D>(deserializer: D) -> Result<RoomCode, D::Error>
    where
        D: Deserializer<'de>,
    {
        deserializer.deserialize_str(RoomCodeVisitor)
    }
}

struct RoomCodeVisitor;

impl<'de> Visitor<'de> for RoomCodeVisitor {
    type Value = RoomCode;

    fn expecting(&self, formatter: &mut Formatter) -> fmt::Result {
        formatter.write_str("a 4-letter string")
    }

    fn visit_str<E>(self, value: &str) -> Result<Self::Value, E>
    where
        E: serde::de::Error,
    {
        value.parse().map_err(|_| E::custom("invalid room code"))
    }
}

#[derive(Default)]
pub struct Lobbies(HashMap<u32, Arc<Mutex<Lobby>>>);

impl Lobbies {
    pub fn new() -> Self {
        Lobbies(HashMap::new())
    }

    pub fn create_code(&mut self) -> Result<RoomCode, ()> {
        let code = (|| {
            let init_code = thread_rng().gen_range(0, MAX_CODE);
            if !self.0.contains_key(&init_code) {
                return Ok(init_code);
            }
            let mut code = init_code.wrapping_add(1) % MAX_CODE;
            while code != init_code {
                if !self.0.contains_key(&code) {
                    return Ok(code);
                }
                code = code.wrapping_add(1) % MAX_CODE;
            }
            Err(())
        })()?;
        self.0.insert(code, Lobby::new());
        code.try_into()
    }

    pub fn contains(&mut self, code: &RoomCode) -> bool {
        match self.0.entry(code.into())/*.and_modify(|last_used| *last_used = Instant::now())*/ {
            Entry::Occupied(_) => true,
            Entry::Vacant(_) => false,
        }
    }

    pub fn get(&self, code: &RoomCode) -> Option<Arc<Mutex<Lobby>>> {
        eprint!("Current codes:");
        self.0
            .keys()
            .copied()
            .map(RoomCode::try_from)
            .for_each(|code| eprint!(" {}", code.unwrap()));
        eprintln!();
        // for code in self.0.keys() {
        //     dbg!(code);
        // }
        self.0.get(&code.into()).map(Arc::clone)
    }

    pub fn remove(&mut self, code: &RoomCode) {
        self.0.remove(&code.into());
    }

    /// Remove unused codes
    pub fn purge(&mut self) {
        eprintln!("Beginning purge...");
        let before = self.0.len();
        self.0
            .retain(|_, lobby| lobby.lock().unwrap().updated().elapsed() < MAX_CODE_AGE);
        eprintln!("Purged {} lobbies", before - self.0.len());
    }
}

#[test]
fn from_str() {
    const CODE_STR: &str = "abcd";
    assert_eq!(
        Ok(RoomCode([b'A', b'B', b'C', b'D'])),
        RoomCode::from_str(CODE_STR)
    );
}

#[test]
fn contains() {
    let mut codes = Lobbies::new();
    let code = codes.create_code().unwrap();
    assert!(codes.contains(&code));
}
