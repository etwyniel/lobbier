import { Game, Color, Player, Card } from "singular";

const pre = document.getElementById("singular-canvas");

function display(game) {
    var players = game.players;
    var dispStr = "";
    players.forEach(p => {
        var hand = p.hand.map(c => new Card(c).display());
        dispStr += p.name + ": " + hand + "\n";
    });
    pre.textContent = dispStr;
}

function deal(game, count) {
    if (count === 0) return;
    game.draw_one();
    game.end_turn();
    display(game);
    setTimeout(() => deal(game, count - 1), 300);
}

var game = new Game();
var player = new Player("me");
game.add_player(player);
deal(game, 7 * game.players.length);
// for (var i = 0; i < 7; i++) {
//     for (var j = 0, len = game.players.length; j < len; j++) {
//         game.draw_one();
//         game.end_turn();
//         display(game);
//     }
// }
// var hand = player.hand;
// pre.textContent = hand.map(c => new Card(c).display());
// console.log(hand[0], new Card(hand[0]));
console.log(game.color(), Color.Red, game.color() === Color.Red);
console.log(game.last.is_wild());
console.log(Color);
