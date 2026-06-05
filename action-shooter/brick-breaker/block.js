var Block = function(game, position) {

    var img = game.imageByName('block')
    var o = {
        // image: image,
        x: position[0],
        y: position[1],
        alive: true,
        lives: position[2] || 1
    }
    o.image = img.image
    o.w = img.w
    o.h = img.h

    o.kill = function() {
        o.lives--
        if (o.lives < 1) {
            o.alive = false
        }
    }

    o.collide = function(b) {
        return o.alive && (rectIntersects(o, b) || rectIntersects(b, o))
    }
    return o
}

