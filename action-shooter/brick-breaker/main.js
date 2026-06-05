var loadLevel = function (game, n) {
    n = n - 1
    var level = levels[n]
    var blocks = []
    for (var i = 0; i < level.length; i++) {
        var p = level[i]
        var b = Block(game, p)
        blocks.push(b)
    }
    return blocks
}
var blocks = []
var enableDebugMode = function (game, enable) {
    if (!enable) {
        return
    }
    window.paused = false
    window.addEventListener('keydown', function (event) {
        var k = event.key
        if (k == 'p') {
            // 暂停功能
            window.paused = !window.paused
        } else if ('1234567'.includes(k)) {
            // 为了 debug 临时加的载入关卡功能
            blocks = loadLevel(game, Number(k))
        }
    })
    // 控制速度
    document.querySelector('#id-input-speed').addEventListener('input', function (event) {
        var input = event.target
        // log(event, input.value)
        window.fps = Number(input.value)
    })
}
var __main = function () {
    
    var score = 0

    var images = {
        ball: 'images/ball.png',
        paddle: 'images/paddle.png',
        block: 'images/Brick.png'
    }

    var game = GuaGame(30, images, function(g){
        var paddle = Paddle(game)
        var ball = Ball(game)
        blocks = loadLevel(game, 1)
        var paused = false
        game.registerAction('a', function () {
            paddle.moveLeft()
        })
        game.registerAction('d', function () {
            paddle.moveRight()
        })
        game.registerAction('f', function () {
            ball.fire()
        })
        game.update = function () {
            if (window.paused) {
                return
            }
            ball.move()
            // 判断相撞
            if (paddle.collide(ball)) {
                // 这里应该调用一个 ball.反弹() 来实现
                ball.bounce()
            }
            // 判断 ball 和 blocks 相撞
            for (var i = 0; i < blocks.length; i++) {
                var block = blocks[i]
                if (block.collide(ball)) {
                    // log('block 相撞')
                    block.kill()
                    ball.bounce()
                    score += 100
                }
            }
        }
        game.draw = function () {
            // draw background
            game.context.fillStyle = "#555"
            game.context.fillRect(0, 0, 400, 300)
            // draw
            game.drawImage(paddle)
            game.drawImage(ball)
            // draw blocks
            for (var i = 0; i < blocks.length; i++) {
                var block = blocks[i]
                if (block.alive) {
                    game.drawImage(block)
                }
            }
            //draw labels
            game.context.fillText('score: ' + score, 10, 290) 

            //mouse event
        var enableDrag = false
        game.canvas.addEventListener('mousedown', function(event){
            var x = event.offsetX
            var y = event.offsetY
            log(x, y, 'down')
            if (ball.hasPoint(x, y)) {
                enableDrag = true
            }
        })

        game.canvas.addEventListener('mousemove', function(event){
            // log(event)
            var x = event.offsetX
            var y = event.offsetY
            // log(x, y, 'move')
            if (enableDrag) {
                ball.x = x
                ball.y = y
            }
        })

        game.canvas.addEventListener('mouseup', function(event){
            // log(event)
            var x = event.offsetX
            var y = event.offsetY
            log(x, y, 'up')
            enableDrag = false 
        })
    }
    })
    enableDebugMode(game, true)
    
}
__main()