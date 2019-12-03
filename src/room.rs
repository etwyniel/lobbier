use crate::room_event::{PlayerInfo, Role, RoomEvent};
use actix::prelude::*;
use actix_web_actors::ws;
use std::convert::Into;
use std::ops::Deref;
use std::sync::mpsc::{channel, Receiver, Sender, TryRecvError};
use std::sync::{Arc, Mutex, Weak};
use std::time::{Duration, Instant};

pub struct Player {
    name: String,
    id: u32,
    role: Role,
    lobby: Weak<Mutex<Lobby>>,
    hb: Instant,
    rx: Receiver<RoomEvent>,
    tx: Sender<RoomEvent>,
}

pub struct Lobby {
    players: Vec<Arc<Mutex<Player>>>,
    started: bool,
    updated: Instant,
}

pub struct PlayerHandle(pub Arc<Mutex<Player>>);

impl Lobby {
    pub fn new() -> Arc<Mutex<Lobby>> {
        Arc::new(Mutex::new(Lobby {
            players: Vec::new(),
            started: false,
            updated: Instant::now(),
        }))
    }

    fn update(&mut self) {
        self.updated = Instant::now();
    }

    pub fn updated(&self) -> Instant {
        self.updated
    }

    pub fn event(&self, event: &RoomEvent) {
        for player in &self.players {
            let player = player.lock().unwrap();
            player.tx.send(event.clone()).unwrap();
        }
    }
}

impl Deref for PlayerHandle {
    type Target = Mutex<Player>;

    fn deref(&self) -> &Self::Target {
        &*self.0
    }
}

impl Into<PlayerHandle> for Arc<Mutex<Player>> {
    fn into(self) -> PlayerHandle {
        PlayerHandle(self)
    }
}

impl Actor for PlayerHandle {
    type Context = ws::WebsocketContext<Self>;

    fn started(&mut self, ctx: &mut Self::Context) {
        self.hb(ctx);
        ctx.run_interval(Duration::from_millis(30), |act, ctx| {
            loop {
                match act.lock().unwrap().rx.try_recv() {
                    Err(TryRecvError::Empty) => (),
                    Err(TryRecvError::Disconnected) => ctx.stop(),
                    Ok(msg) => {
                        ctx.notify(msg);
                        continue;
                    }
                }
                break;
            }
        });
    }

    fn stopped(&mut self, _: &mut Self::Context) {
        let player = self.lock().unwrap();
        let id = player.id;
        let lobby = match player.lobby.upgrade() {
            Some(lobby) => lobby,
            None => return,
        };
        drop(player);
        let mut lobby = lobby.lock().unwrap();
        lobby.players.retain(|p| p.lock().unwrap().id != id);
        lobby.event(&RoomEvent::PlayerLeft { id });
    }
}

impl StreamHandler<ws::Message, ws::ProtocolError> for PlayerHandle {
    fn handle(&mut self, msg: ws::Message, ctx: &mut Self::Context) {
        let mut player = self.lock().unwrap();
        player.hb = Instant::now();
        let lobby = match player.lobby.upgrade() {
            Some(lobby) => lobby,
            None => {
                ctx.stop();
                return;
            }
        };
        let mut lobby = lobby.lock().unwrap();
        lobby.update();
        match msg {
            ws::Message::Text(text) => {
                if text.is_empty() {
                    return;
                }
                let event = serde_json::from_str(&text).unwrap();
                eprintln!("Player {}: {:?}", player.id, &event);
                let response = match event {
                    RoomEvent::PlayerJoined { name, .. } => {
                        if lobby.started {
                            return;  // TODO: notify player that they can't join
                        }
                        player.name = name.clone();
                        player.id = lobby.players.len() as u32;
                        if lobby.players.is_empty() {
                            player.role = Role::Host;
                        }
                        let players = lobby
                            .players
                            .iter()
                            .map(|p| {
                                let p = p.lock().unwrap();
                                PlayerInfo {
                                    name: p.name.clone(),
                                    id: p.id,
                                }
                            })
                            .collect();
                        ctx.text(
                            serde_json::to_string(&RoomEvent::InitData {
                                players,
                                id: player.id,
                                role: player.role,
                            })
                            .unwrap(),
                        );
                        lobby.players.push(Arc::clone(&self.0));
                        Some(RoomEvent::PlayerJoined {
                            name,
                            id: Some(player.id),
                        })
                    }
                    RoomEvent::PlayerLeft { id } => {
                        lobby.players.retain(|p| p.lock().unwrap().id != id);
                        Some(event)
                    }
                    RoomEvent::ChatMessage { msg, .. } if !msg.is_empty() => {
                        Some(RoomEvent::ChatMessage {
                            msg,
                            id: Some(player.id),
                        })
                    }
                    RoomEvent::GameStart(_) if player.role == Role::Host => {
                        lobby.started = true;
                        Some(event)
                    }
                    RoomEvent::Reset if player.role == Role::Host => {
                        lobby.started = false;
                        Some(event)
                    }
                    RoomEvent::GameEvent(_) => Some(event),
                    RoomEvent::ToHost(_) => {
                        drop(player);
                        for player in &lobby.players {
                            let p = player.lock().unwrap();
                            if p.role == Role::Host {
                                p.tx.send(event).unwrap();
                                break;
                            }
                        }
                        return
                    }
                    RoomEvent::FromHost { id, .. } if player.role == Role::Host => {
                        drop(player);
                        for player in &lobby.players {
                            let p = player.lock().unwrap();
                            if p.id == id {
                                p.tx.send(event).unwrap();
                                break;
                            }
                        }
                        return
                    }
                    RoomEvent::HostEvent(_) if player.role == Role::Host => Some(event),
                    _ => None,
                };
                drop(player);
                if let Some(resp) = response {
                    lobby.event(&resp);
                }
            }
            ws::Message::Close(_) => {
                ctx.stop();
            }
            ws::Message::Ping(_) => {
                ctx.pong("");
            }
            _ => (),
        }
    }

    fn error(&mut self, e: ws::ProtocolError, _: &mut Self::Context) -> Running {
        dbg!(e);
        Running::Continue
    }
}

pub struct Response;

impl actix::dev::MessageResponse<PlayerHandle, RoomEvent> for Response {
    fn handle<R: actix::dev::ResponseChannel<RoomEvent>>(
        self,
        _: &mut ws::WebsocketContext<PlayerHandle>,
        _: Option<R>,
    ) {
    }
}

impl Handler<RoomEvent> for PlayerHandle {
    type Result = Response;
    fn handle(&mut self, msg: RoomEvent, ctx: &mut Self::Context) -> Response {
        ctx.text(serde_json::to_string(&msg).unwrap());
        Response
    }
}

impl Player {
    pub fn new(name: &str, lobby: Arc<Mutex<Lobby>>) -> Arc<Mutex<Self>> {
        let (tx, rx) = channel();
        let player = Arc::new(Mutex::new(Player {
            name: name.to_string(),
            id: 0,
            role: Role::Player,
            lobby: Arc::downgrade(&lobby),
            hb: Instant::now(),
            rx,
            tx,
        }));
        let mut lobby = lobby.lock().unwrap();
        lobby.update();
        player
    }
}

impl PlayerHandle {
    fn hb(&self, ctx: &mut <Self as Actor>::Context) {
        ctx.run_interval(Duration::from_secs(5), |act, ctx| {
            let player = act.lock().unwrap();
            if player.hb.elapsed() > Duration::from_secs(10) {
                println!("Player {} died", &player.name);
                ctx.stop();
                return;
            }
            ctx.ping("");
        });
    }
}
