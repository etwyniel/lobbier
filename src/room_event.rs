#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct PlayerInfo {
    pub name: String,
    pub id: u32,
}

#[derive(Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum Role {
    Host,
    Player,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(tag = "type", content = "data")]
pub enum RoomEvent {
    PlayerJoined {
        name: String,
        id: Option<u32>,
    },
    PlayerLeft {
        id: u32,
    },
    InitData {
        players: Vec<PlayerInfo>,
        id: u32,
        role: Role,
    },
    ChatMessage {
        msg: String,
        id: Option<u32>,
    },
    GameStart(serde_json::Value),
    Reset,
    ToHost(serde_json::Value),
    FromHost {
        id: u32,
        msg: serde_json::Value,
    },
    SetPublic(bool),
    HostEvent(serde_json::Value),
    GameEvent(serde_json::Value),
}

impl actix::Message for RoomEvent {
    type Result = ();
}
