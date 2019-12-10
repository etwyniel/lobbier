mod room;
mod room_code;
mod room_event;

#[macro_use]
extern crate serde_derive;
use actix_files as fs;
use actix_web::{middleware, web, App, Error, HttpRequest, HttpResponse, HttpServer, Responder};
use actix_web_actors::ws;
use room::{Player, PlayerHandle};
use room_code::{Lobbies, RoomCode};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;

fn game_page(
    state: web::Data<Mutex<Lobbies>>,
    info: web::Path<(RoomCode,)>,
    _req: HttpRequest,
) -> impl Responder {
    let lobby = {
        match state.lock().unwrap().get(&info.0) {
            Some(lobby) => lobby,
            None => return fs::NamedFile::open("static/404.html").unwrap(),
        }
    };
    Player::new("", Arc::clone(&lobby));
    fs::NamedFile::open("static/game.html").unwrap()
}

fn create_lobby(state: web::Data<Mutex<Lobbies>>, r: HttpRequest) -> impl Responder {
    let code = {
        state.lock().unwrap().create_code().unwrap()
    };
    match r.headers().get("Host") {
        Some(host) => eprintln!("Lobby created: http://{}/g/{}", host.to_str().unwrap_or_default(), &code),
        None => eprintln!("Lobby created: {}", &code),
    }
    HttpResponse::TemporaryRedirect()
        .set_header("Location", format!("/g/{}", &code))
        .finish()
}

fn list_lobbies_api(state: web::Data<Mutex<Lobbies>>) -> impl Responder {
    #[derive(Serialize)]
    struct LobbyDescription {
        code: String,
        name: String,
        player_count: usize,
    }
    let state = state.lock().unwrap();
    let public_lobbies = state.list_public();
    web::Json(public_lobbies.map(|(code, lobby)| {
        let name = lobby.host().map(|h| format!("{}'s lobby", h.name())).unwrap_or_else(|| code.to_string());
        LobbyDescription {
            code: code.to_string(),
            name,
            player_count: lobby.player_count(),
        }
    }).collect::<Vec<_>>())
}

fn list_lobbies() -> impl Responder {
    fs::NamedFile::open("static/lobbies.html").unwrap()
}

fn ws_index(
    state: web::Data<Mutex<Lobbies>>,
    info: web::Path<(RoomCode,)>,
    r: HttpRequest,
    stream: web::Payload,
) -> Result<HttpResponse, Error> {
    let lobby = {
        match state.lock().unwrap().get(&info.0) {
            Some(lobby) => lobby,
            None => return Err(().into()),
            // None => return format!("Code {} is not currently in use", &info.0),
        }
    };
    let player = Player::new("player", Arc::clone(&lobby));
    ws::start(PlayerHandle(player), &r, stream)
}

fn main() {
    env_logger::init();

    let data = web::Data::new(Mutex::new(Lobbies::new()));
    let data_clone = data.clone();
    thread::spawn(move || loop {
        thread::sleep(Duration::from_secs(500));
        data_clone.lock().unwrap().purge();
    });

    HttpServer::new(move || {
        App::new()
            .wrap(middleware::Logger::default())
            .register_data(data.clone())
            .service(web::resource("/g/{code}").to(game_page))
            .service(web::resource("/c").to(create_lobby))
            .service(web::resource("/lobbies.json").to(list_lobbies_api))
            .service(web::resource("/l").to(list_lobbies))
            .service(web::resource("/ws/{code}").to(ws_index))
            .service(fs::Files::new("/", "static/").index_file("index.html"))
    })
    .bind(std::env::args().nth(1).unwrap_or_else(|| "0.0.0.0:8080".to_string()))
    .unwrap()
    .run()
    .unwrap();
}
