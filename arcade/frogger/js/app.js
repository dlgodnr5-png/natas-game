// Enemy object initialize stats
var Enemy = function(x, y, speed) {
    // The image/sprite for our enemies
    this.sprite = 'images/enemy-bug.png';
    //setting enemy location
    this.x = x;
    this.y = y;
    //setting enemy speed
    this.speed = speed;
};

// Update the enemy's position, required method for game
// Parameter: dt, a time delta between ticks
Enemy.prototype.update = function(dt) {
    // You should multiply any movement by the dt parameter
    // which will ensure the game runs at the same speed for
    // all computers.
    this.x += (this.speed * dt);

    //allow enemy objects to travel a bit before appearing
    if (this.x > 600) {
      this.x = -200;
    }

    //detects collision by padding their locations and reset score if occurs
    if ((player.x < this.x + 80) && (player.x > this.x - 80) && (player.y < this.y + 10) && (player.y > this.y - 10)) {
      player.score = 0;
      player.x = 200;
      player.y = 380;

      //prevent negative scores
      if (player.score < 0) {
        player.score = 0;
      }
    }
};

// Draw the enemy on the screen, required method for game
Enemy.prototype.render = function() {
    ctx.drawImage(Resources.get(this.sprite), this.x, this.y);
};

// player initialize stats
var Player = function(x, y, score) {
  this.sprite = 'images/char-boy.png';
  this.x = x;
  this.y = y;
  this.score = score;
};

Player.prototype.update = function() {
  //if player touches water, reset and increase score
  if (this.y < 50) {
    this.x = 200;
    this.y = 380;
    this.score++;
  }
};

Player.prototype.render = function() {
  //score board and player sprite init
  ctx.font ="20px Georgia";
  ctx.fillStyle = "pink";
  ctx.fillText("Score: " + this.score, 420, 80);

  ctx.drawImage(Resources.get(this.sprite), this.x, this.y);

  //win condition
  if (this.score === 5) {
    ctx.font ="50px Georgia";
    ctx.fillStyle = 'white';
    ctx.fillText("You Win!", 160, 280);
  }
};

Player.prototype.handleInput = function(allowedKeys) {
  //moves player and prevents offscreen movement
  if (this.x > 50) {
    if (allowedKeys === 'left') {
      this.x -= 100;
    }
  }
  if (this.y > 50) {
    if (allowedKeys === 'up') {
      this.y -= 80;
    }
  }
  if (this.x < 400) {
    if (allowedKeys === 'right') {
      this.x += 100;
    }
  }
  if (this.y < 350) {
    if (allowedKeys === 'down') {
      this.y += 80;
    }
  }
};
// Now instantiate your objects.
// Place all enemy objects in an array called allEnemies
// Place the player object in a variable called player
var enemy1 = new Enemy(-100, 55, 400);
var enemy2 = new Enemy(-250, 140, 300);
var enemy3 = new Enemy(-200, 140, 200);
var enemy4 = new Enemy(-100, 220, 250);
var enemy5 = new Enemy(-50, 220, 150);

//our player obj
var player = new Player(200, 380, 0);

//enemy objects
var allEnemies = [enemy1, enemy2, enemy3, enemy4, enemy5];

// This listens for key presses and sends the keys to your
// Player.handleInput() method. You don't need to modify this.
document.addEventListener('keyup', function(e) {
    var allowedKeys = {
        37: 'left',
        38: 'up',
        39: 'right',
        40: 'down'
    };
    player.handleInput(allowedKeys[e.keyCode]);
});
