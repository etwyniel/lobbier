import { Game, Color, Card, CardType, Direction, Player, PlayResult, default as init } from '/singular.js';

async function run() {
  await init('/singular_bg.wasm');
  window.Color = Color;
}

const code = window.location.pathname.replace("/g/", "");
const host_start_message = `
<p>Press Start when all the players are here</p>
<p class="is-size-7">Players can join by navigating to this page or
by entering the code <span class="spoiler" onclick="$(this).toggleClass('is-active')">${code}</span> on the home page</p>
`;

var loaded = run();
var conn = null;
var players = [];
var username;
var player;
var game;
window.players = players;
var my_id;
var my_role;
var started = true;

function card_to_class(card, last) {
  if (!last) {
    switch (card.ty) {
      case CardType.Wild:
      case CardType.PlusFour:
        return "is-black";
    }
  }
  switch (card.color) {
    case Color.Red:
      return "is-danger";
    case Color.Green:
      return "is-success";
    case Color.Blue:
      return "is-link";
    case Color.Yellow:
      return "is-warning";
  }
}

function connect(name) {
  var wsUri = (window.location.protocol == 'https:'&&'wss://'||'ws://') + window.location.host + '/ws/' + code;
  conn = new WebSocket(wsUri);
  conn.onopen = function() {
    console.log("connected");
    conn.send(JSON.stringify({ type: "PlayerJoined", data: { name } }));
  };
  conn.onerror = e => {
    console.log(e);
  };
  conn.onmessage = function(msg) {
    msg = JSON.parse(msg.data);
    switch (msg.type) {
      case "GameInProgress":
        $('#connect-error')
          .removeClass('is-hidden')
          .text('Game is already in progress');
        $('#username-input').attr('disabled', false);
        $('#connect').attr('disabled', false);
        return;
      case "InitData":
        my_id = msg.data.id;
        my_role = msg.data.role;
        player = new Player(username, msg.data.id);
        game = new Game(player, msg.data.role == "Host");
        console.log("my role: " + my_role);
        $('#username-form').hide();
        $('#main-content')
          .show()
          .attr('style', 'display: flex;');
        msg.data.players.forEach(p => {
          $('#player-list').append($(`<span class="panel-block">${p.name}</span>`));
          players.push(p)
          game.add_player(new Player(p.name, p.id));
        });
        if (my_role == "Host") {
          $('#start-game').show().attr('disabled', false);
          $('#message').show().html(host_start_message);
        } else {
          $('#message').show().text('Waiting for the host to start the game...');
        }
        break;
      case "PlayerJoined": {
        const { name, id } = msg.data;
        players.push({ name, id });
        game.add_player(new Player(name, id));
        $('#player-list').append($(`<span class="panel-block">${name}</span>`));
        if (my_role == "Host" && players.length > 1) {
          $('#start-game').attr('disabled', false);
        }
        break;
      }
      case "PlayerLeft": {
        const {id} = msg.data;
        game.remove_player(id);
        break;
      }
      case "ChatMessage":
        var sender = players.find(p => p.id == msg.data.id);
        let chat = document.getElementById("chat");
        var isScrolledToBottom = chat.scrollHeight - chat.clientHeight <= chat.scrollTop + 1;
        $(chat).append($(`<p>${sender.name}: ${msg.data.msg}</p>`));
        if (isScrolledToBottom)
          chat.scrollTop = chat.scrollHeight;
        break;
      case "GameStart":
        game.handle_event(msg.data);
        $('#start-game').hide();
        $('#game-content').show();
        $('#message').hide();
        if (my_role == "Host") {
          started = false;
          deal(7 * game.players.length);
        }
        break;
      case "Reset":
        game.reset();
        $('#reset-game').hide();
        if (my_role == "Host") {
          $('#start-game').show();
          $('#message').show().html(host_start_message);
        } else {
          $('#message').show().text('Waiting for the host to start the game...');
        }
        break;
      case "ToHost":
        if (my_role != "Host") break;
        if (msg.data == "DrawRequest") {
          var deal_event = game.deal_event();
          conn.send(JSON.stringify({type: "HostEvent", data: deal_event}));
          var response_event = game.draw_response();
          conn.send(JSON.stringify({type: "FromHost", data: {id: game.current_player, msg: response_event}}));
        }
        break;
      case "FromHost":
        game.handle_host_event(msg.data.msg);
        const {DrawResponse} = msg.data.msg;
        if (DrawResponse) {
          update();
          let last = $('#hand').children().last();
          let dest = last.position();
          last.css({position: 'absolute', ...$('#draw-pile').position()});
          setTimeout(() => last.css(dest), 20);
          setTimeout(update, 300)
          return;
        }
        break;
      case "HostEvent":
        game.handle_host_event(msg.data);
        const {Deal} = msg.data;
        if (Deal && Deal.player != my_id) {
          var count = Deal.count;
          var dealCard = function() {
            let card = $('<span class="button is-dark playing-card">?</span>');
            $('body').append(card);
            card.css({position: 'absolute', ...$('#draw-pile').offset()});
            card.css({opacity: 0, ...$('#player-' + Deal.player).offset()});
            setTimeout(() => card.remove(), 300);
            if (--count > 0) setTimeout(dealCard, 100);
          };
          setTimeout(dealCard, 100);
        }
        break;
      case "GameEvent":
        var res = game.handle_event(msg.data);
        if (msg.data.hasOwnProperty("PlayCard")) {
          var ev = msg.data.PlayCard;
          if (ev.player != my_id) {
            try_play(fake_card(new Card(ev.card)), $('#player-' + ev.player).offset());
          }
          setTimeout(() => {
            update();
            if (res == PlayResult.GameOver) {
              var winner = players.find(p => p.id == game.current_player);
              $('#game-content').hide();
              $('#message').show().text(winner.name + ' wins!');
              if (my_role == "Host") {
                $('#reset-game').show().attr('disabled', false);
              }
            }
          }, 200);
          return;
        }
        break;
    }
    update();
  };
}

function deal(count) {
  if (count === 0) {
    started = true;
    update();
    return;
  }
  var deal_event = game.deal_event();
  conn.send(JSON.stringify({type: "HostEvent", data: deal_event}));
  var response_event = game.draw_response();
  conn.send(JSON.stringify({type: "FromHost", data: {id: game.current_player, msg: response_event}}));
  game.end_turn();
  setTimeout(() => deal(count - 1), 100);
}

function play_card(i, button) {
  try_play(button);
  $('#color-modal').removeClass("is-active");
  $('#color-prompt')
    .empty();
  var card = new Card(game.own_hand()[i]);
  conn.send(JSON.stringify({type: "GameEvent", data: game.play_card_event(i)}));
}

function play_wild(i, color, button) {
  button.removeClass("is-black")
    .addClass(card_to_class({color}));
  var card = new Card(game.own_hand()[i]);
  game.set_wild_color(i, color);
  play_card(i, button);
}

function wild_select_color(i, card) {
  var link = color => {
    var colorClass = card_to_class({color: Color[color]});
    let button = $(`<a class="button ${colorClass}">${color}</a>`);
    button.click({i, color, card}, ({data: {i, color, card}}) => play_wild(i, Color[color], card));
    return $('<div class="column"></div>').append(button);
  };
  $('#color-modal').addClass("is-active");
  $('#color-prompt')
    .empty()
    .append(link("Red"))
    .append(link("Green"))
    .append(link("Yellow"))
    .append(link("Blue"));
}

function try_play(card, start = null) {
  let src = start ? start : card.offset();
  card.css({position: 'absolute', ...src});
  card.detach();
  $('body').append(card);
  let dest = $('#last-card').offset();
  card.css(dest);
  setTimeout(() => card.remove(), 500);
}

function card_click_event(e) {
  let {card, i, link} = e.data;
  if (card.is_wild())
    wild_select_color(i, link);
  else
    play_card(i, link);
}

function display_hand() {
  var hand = $('#hand');
  hand.empty();
  var cards = game.own_hand();
  var disabled = game.current_player == my_id && started ? "" : "disabled"
  for (var i = 0; i < cards.length; i++) {
    var card = new Card(cards[i]);
    var func = card.is_wild() ? "wild_select_color" : "play_card";
    var colorClass = card_to_class(card);
    let link = $(`<a class="button ${colorClass} playing-card" ${disabled}>` + card_contents(card) + '</a>');
    link.click({card, i, link}, card_click_event);
    hand.append(link);
    // hand.append($(`<a class="button ${colorClass}" href="javascript:${func}(${i})" ${disabled}>` + card_contents(card) + '</a>'));
  }
}

function card_contents(card) {
  switch (card.ty) {
    case CardType.Skip:
      return '<span class="icon is-medium"><i class="fa fa-ban"></i></span>';
    case CardType.Reverse:
      return '<span class="icon is-medium"><i class="fa fa-refresh"></i></span>';
    case CardType.Wild:
      return '<span class="icon is-medium"><i class="fa fa-asterisk"></i></span>';
  }
  return card.display_ty();
}

function fake_card(card) {
    let colorClass = card_to_class(card, true);
    return $(`<span class="button ${colorClass} playing-card">${card_contents(card)}</span>`);
}

function display_draw_button() {
  var button = $('#draw-button');
  button.attr('disabled', game.current_player != my_id || !started);
  var draw_count = game.draw_count == 0 ? "" : ` ${game.draw_count}`;
  button.text(`Draw${draw_count}`);
}

function display_players() {
  $('#player-list-heading').html('Players <span class="icon"><i class="fa fa-arrow-' + (game.direction == Direction.Clockwise ? "down" : "up") + '"></i></span>');
  var list = $('#player-list');
  list.empty();
  var players = game.players;
  for (var i = 0; i < players.length; i++) {
    var player = players[i];
    var text = player.name + ` (${player.hand.length} cards)`;
    if (game.current_player == player.id) {
      text = $('<b>' + text + '</b>');
    }
    var active = game.current_player == player.id ? "active" : "";
    list.append($(`<span id="player-${player.id}" class="panel-block ${active}"></span>`).append(text));
  }
}

function update() {
  display_hand();
  let contents = card_contents(game.last);
  $('#last-card')
    .removeClass()
    .addClass('button')
    .addClass('playing-card')
    .addClass(card_to_class(game.last, true))
    .empty()
    .append(contents);
  $('#draw-pile').text(game.draw_len());
  $('#discard-pile').text(game.discard_len());
  display_draw_button();
  display_players();
}

$(function() {
  window.connect = function() {
    $('#connect-error').addClass('is-hidden');
    $('#connect').attr("disabled", true);
    var input = $('#username-input');
    input.attr("disabled", true);
    username = input.val();
    connect(username);
  };

  loaded.then(() => {
    $('#connect').removeClass('is-loading');
  });

  window.send_message = function() {
    var input = $('#chat-input');
    var msg = input.val();
    input.val('');
    conn.send(JSON.stringify({type: "ChatMessage", data: {msg}}));
  };

  $('#start-game').click(() => {
    conn.send(JSON.stringify({type: "GameStart", data: game.init_event()}));
  });
  $('#reset-game').click(() => {
    conn.send(JSON.stringify({type: "Reset"}));
  });

  $('#draw-button').click(() => {
    conn.send(JSON.stringify({type: "ToHost", data: game.draw_request()}));
  });

  window.play_card = play_card;
  window.wild_select_color = wild_select_color;
  window.play_wild = play_wild;
});

$(".modal-background").click(function() {$(this).parent().removeClass("is-active");});
$(".modal-close").click(function() {$(this).parent().removeClass("is-active");});
$('.spoiler').click(function() {$(this).toggleClass('is-active')});
