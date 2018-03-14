/// <reference path="../d/fb.d.ts"/>
/// <reference path="../d/screenfull.d.ts"/>

const enum GameState {
    InProgress, StartGame, GameOver
}

interface Configuration {
    force:number;
	speed: number;
	variance: number;
    pipe: { delay:number, gap:number };
}

function flappy() {
    interface Sounds {
        point:Howl; 
        hit:Howl;
        wing:Howl;
    }

    let config:Configuration = {
        force: 6.4,
        speed: 2.4,
        variance: 200,
        pipe: { delay:100, gap:88 }
    };

    let sounds:Sounds = {
        point: new Howl({
            src:['/audio/point.ogg', '/audio/point.mp3']
        }),
        hit: new Howl({
            src:['/audio/hit.ogg', '/audio/hit.mp3']
        }),
        wing: new Howl({
            src:['/audio/wing.ogg', '/audio/wing.mp3']
        })
    };

    let relativeTime:Date = new Date();
    let cooldown:number = 0;
    let matterEngine:Matter.Engine = Matter.Engine.create();
    let matterRunner:Matter.Runner = Matter.Runner.create({delta:1000/60});
    let playerBody:Matter.Body = Matter.Bodies.circle(50, 0, 10, {friction:1, restitution:0.9});
    let floorBody:Matter.Body = Matter.Bodies.rectangle(400, 544, 800, 112, {isStatic:true});
    let offscreenCeling:Matter.Body = Matter.Bodies.rectangle(400, -100, 800, 10, {isStatic:true});
    let offscreenSensor:Matter.Body = Matter.Bodies.rectangle(-200, 300, 10, 600, {isSensor:true});
    let pipeBodies:Matter.Body[] = [];
    let pipeSensors:Matter.Body[] = [];
    let floorOffsets:number[] = [0, 336];
    let pipeCounter:number = 0;
    let highScore:number = 0;
    let score:number = 0;
    let gameState:GameState = GameState.StartGame;

    PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;
    let application:PIXI.Application = new PIXI.Application();
    let mask:PIXI.Graphics = new PIXI.Graphics();
    let animation:PIXI.extras.AnimatedSprite;
    let bitmapText:PIXI.extras.BitmapText;
    let pipeContainer:PIXI.Container = new PIXI.Container();;
    let floorContainer:PIXI.Container = new PIXI.Container();;
    let background:PIXI.Sprite;
    let pipeSprites:PIXI.Sprite[];
    let floorSprites:PIXI.Sprite[];
    let scoreSprite:PIXI.Sprite;
    let scoreText:PIXI.extras.BitmapText;
    let highScoreText:PIXI.extras.BitmapText;
    let leaderboardButton:PIXI.Sprite;
    let leaderboardButtonGlow:PIXI.Sprite;
    let restartButton:PIXI.Sprite;
    let shareButton:PIXI.Sprite;
    let titleSprite:PIXI.Sprite;
    let touch:PIXI.Graphics;


    function elapsed():number {
    return new Date().getTime() - relativeTime.getTime();
    }

    Matter.World.add(matterEngine.world, [playerBody, floorBody, offscreenCeling, offscreenSensor]);
    Matter.Events.on(matterEngine, 'tick', event => {
    let worldVelocity:Matter.Vector = { x: -config.speed, y: 0 };
    switch(gameState) {
        case GameState.InProgress:
            if(--pipeCounter <= 0) {
                let height: number = (Math.random() * config.variance - config.variance / 2) + 300;
                for(let flipped of [true, false]) {
                    createPipe(height, flipped);
                }
                let pipeSensor:Matter.Body = Matter.Bodies.rectangle(350, 300, 5, 600, { isStatic:true, isSensor: true });
                Matter.World.add(matterEngine.world, pipeSensor);
                pipeSensors.push(pipeSensor);
                pipeCounter = config.pipe.delay;
            }
            playerBody.angle = -45 * Math.PI / 180;
            if(playerBody.velocity.y > 0) {
                playerBody.angle += Math.min(135 * Math.PI / 180, playerBody.velocity.y * 0.3);
            }
            break;
        case GameState.StartGame:
            Matter.Body.setPosition(playerBody, { x: 50, y: 275 + Math.sin(elapsed() / 250) * 15 });
            Matter.Body.setVelocity(playerBody, { x: 0, y: 0 });
            Matter.Body.setAngle(playerBody, 0);
            Matter.Body.setAngularVelocity(playerBody, 0);
            break;
        case GameState.GameOver:
            worldVelocity = { x: 0, y: 0 };
            break;
    }

    for(let index in floorOffsets) {
        floorOffsets[index] += worldVelocity.x;
        if(floorOffsets[index] < -336) {
            floorOffsets[index] += floorOffsets.length * 336;
        }
    }

    for(let i of pipeBodies) {
        Matter.Body.setPosition(i, {
            x:i.position.x+worldVelocity.x,
            y:i.position.y+worldVelocity.y
        }); // <= Move pipes forward.
        Matter.Body.setVelocity(i, worldVelocity);
    }

    for(let i of pipeSensors) {
        Matter.Body.setPosition(i, {
            x:i.position.x+worldVelocity.x,
            y:300
        }); // <= Move sensors forward.
    }

    Matter.Body.setVelocity(floorBody, worldVelocity);
    Matter.Body.setPosition(offscreenSensor, {x:-100,y:300});
    cooldown--;
    });

    window.onkeydown = event => {
    if(event.key == ' ' && !event.repeat) {
        tapScreen();
    }
    };

    function tapScreen():void {
        if(cooldown > 0)
            return;
        switch(gameState) {
            case GameState.GameOver:
                while(pipeBodies.length > 0) {
                    Matter.World.remove(matterEngine.world, pipeBodies.pop());
                }
                while(pipeSensors.length > 0) {
                    Matter.World.remove(matterEngine.world, pipeSensors.pop());
                }
                gameState = GameState.StartGame;
                pipeCounter = 0;
                score = 0;
                cooldown = 20;
                while(pipeSprites.length > 0) {
                    let pipeSprite:PIXI.Sprite = pipeSprites.pop();
                    application.stage.removeChild(pipeSprite);
                    pipeSprite.destroy();
                }
                scoreSprite.visible = false;
                titleSprite.visible = true;
                animation.play();
                relativeTime = new Date();
                break;
            case GameState.StartGame:
                bitmapText.text = '0';
                bitmapText.visible = true;
                titleSprite.visible = false;
                gameState = GameState.InProgress;
            case GameState.InProgress:
                Matter.Body.setVelocity(playerBody, {x:0, y:-config.force});
                sounds.wing.play();
                break;
        }
    }

    function createPipe(height:number, flipped:boolean):Matter.Body {
        let offset:number = (450/2 + config.pipe.gap/2) * (flipped ? -1 : 1);
        let result:Matter.Body =
            Matter.Bodies.rectangle(350, height + offset, 52, 450, {
                isStatic:true,
                angle:flipped ? Math.PI : 0
            });
        Matter.World.add(matterEngine.world, result);
        pipeBodies.push(result);
        return result;
    }

    Matter.Events.on(matterEngine, 'collisionStart', event => {
    for(let pair of event.pairs) {
        let tuples:Matter.Body[][] = [
            [pair.bodyA, pair.bodyB],
            [pair.bodyB, pair.bodyA]
        ];
        for(let tuple of tuples) {
            switch(tuple[0]) {
                case playerBody:
                    if(gameState == GameState.InProgress) {
                        let handled:boolean = false;
                        for(let i = 0; i < pipeSensors.length; i++) {
                            if(pipeSensors[i] == tuple[1]) {
                                Matter.World.remove(matterEngine.world, pipeSensors[i])
                                pipeSensors.splice(i, 1);
                                sounds.point.play();
                                score++;
                                if(score >= highScore) {
                                    highScore = score;
                                }
                                bitmapText.text = '' + score;
                                handled = true;
                                break;
                            }
                        }
                        if(!handled) {
                            gameState = GameState.GameOver;         
                            cooldown = 20;
                            onDie(score, highScore);
                            sounds.hit.play();
                        }
                    }
                    break;
                case offscreenSensor:
                    for(let i = 0; i < pipeBodies.length; i++) {
                        if(pipeBodies[i] == tuple[1]) {
                            Matter.World.remove(matterEngine.world, pipeBodies[i])
                            pipeBodies.splice(i, 1);
                            break;
                        }
                    }
                    break;
            }
        }   
    }
    });
    Matter.Runner.run(matterRunner, matterEngine);

    PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;
    application = new PIXI.Application();
    pipeContainer = new PIXI.Container();
    floorContainer = new PIXI.Container();
    PIXI.loader
    .add([
    '/images/bluebird-downflap.png',
    '/images/bluebird-midflap.png',
    '/images/bluebird-upflap.png',
    '/images/floor.png',
    '/images/pipe-green.png',
    '/images/background.png',
    '/images/score.png',
    '/images/add-to-leaderboard.png',
    '/images/add-to-leaderboard-glow.png',
    '/images/restart.png',
    '/images/share.png',
    '/images/title.png',
    '/fonts/score.xml'
    ])
    .on('complete', (loader, resource) => {
        application.view.onpointerup = () => {
            if(screenfull.enabled && !screenfull.isFullscreen) {
                screenfull.request(application.view);
            }
        };
        window.onresize = () => {
            let w:number = application.view.clientWidth;
            let h:number = application.view.clientHeight;
            let ratio:number = w / h;  

            if(ratio > 0.683 || ratio < 0.48) {
                let scale:number = w * (600 / h);
                application.stage.x = scale / 2 - 144;
                application.stage.y = 0;
                application.renderer.resize(scale, 600);
            }
            else
            {
                let scale:number = h * (288 / w);
                application.stage.x = 0;
                application.stage.y = scale / 2 - 300;
                application.renderer.resize(288, scale);
            }

            if(ratio < 0.54) {
                titleSprite.position.y = bitmapText.position.y = 75;
            }
            else if(ratio < 0.57) {
                titleSprite.position.y = bitmapText.position.y = 100;
            }
            else if(ratio < 0.65) {
                titleSprite.position.y = bitmapText.position.y = 125;
            }
            else if(ratio < 0.683) {
                titleSprite.position.y = bitmapText.position.y = 150;
            }
            else {
                titleSprite.position.y = bitmapText.position.y = 100;
            }
        };

        animation = new PIXI.extras.AnimatedSprite([
            PIXI.loader.resources['/images/bluebird-downflap.png'].texture,
            PIXI.loader.resources['/images/bluebird-midflap.png'].texture,
            PIXI.loader.resources['/images/bluebird-upflap.png'].texture,
            PIXI.loader.resources['/images/bluebird-midflap.png'].texture
        ]);

        animation.play();

        titleSprite = new PIXI.Sprite(PIXI.loader.resources['/images/title.png'].texture);
        titleSprite.position.x = 144;
        titleSprite.position.y = 150;
        titleSprite.anchor.x = 0.5;
        titleSprite.anchor.y = 0.5;

        scoreSprite = new PIXI.Sprite(PIXI.loader.resources['/images/score.png'].texture);
        scoreSprite.anchor.x = 0.5;
        scoreSprite.anchor.y = 0.5;
        scoreSprite.position.x = 144;
        scoreSprite.position.y = 240;
        scoreSprite.visible = false;

        scoreText = new PIXI.extras.BitmapText("0", { font: '36px Score' });
        (<any>scoreText).anchor.x = 0.5;
        (<any>scoreText).anchor.y = 0.5;
        scoreText.position.y = -30;

        highScoreText = new PIXI.extras.BitmapText("0", { font: '36px Score' });
        (<any>highScoreText).anchor.x = 0.5;
        (<any>highScoreText).anchor.y = 0.5;
        highScoreText.position.y = 44;

        leaderboardButton = new PIXI.Sprite(PIXI.loader.resources['/images/add-to-leaderboard.png'].texture);
        leaderboardButton.anchor.x = 0.5;
        leaderboardButton.anchor.y = 0.5;
        leaderboardButton.position.y = 170;

        leaderboardButtonGlow = new PIXI.Sprite(PIXI.loader.resources['/images/add-to-leaderboard-glow.png'].texture);
        leaderboardButtonGlow.anchor.x = 0.5;
        leaderboardButtonGlow.anchor.y = 0.5;
        leaderboardButtonGlow.position.x = leaderboardButton.position.x;
        leaderboardButtonGlow.position.y = leaderboardButton.position.y;

        restartButton = new PIXI.Sprite(PIXI.loader.resources['/images/restart.png'].texture);
        restartButton.anchor.x = 0.5;
        restartButton.anchor.y = 0.5;
        restartButton.position.x = 50;
        restartButton.position.y = 135;

        shareButton = new PIXI.Sprite(PIXI.loader.resources['/images/share.png'].texture);
        shareButton.anchor.x = 0.5;
        shareButton.anchor.y = 0.5;
        shareButton.position.x = -50;
        shareButton.position.y = 135;

        leaderboardButton.interactive = true;
        leaderboardButton.buttonMode = true;
        leaderboardButton.on('pointerup', () => {
            if(cooldown > 0)
                return;
            let scoreInput:HTMLInputElement = document.createElement("input");
            scoreInput.setAttribute('type', 'hidden');
            scoreInput.setAttribute('name', 'value');
            scoreInput.setAttribute('value', '' + score);

            let validInput:HTMLInputElement = document.createElement("input");
            validInput.setAttribute('type', 'hidden');
            validInput.setAttribute('name', 'validate');
            validInput.setAttribute('value', 'false');

            let form:HTMLFormElement = document.createElement("form");
            form.method = "post";
            form.action = "Home/Leaderboard";
            form.appendChild(scoreInput);
            form.appendChild(validInput);
            
            document.body.appendChild(form);
            form.submit();
        });

        shareButton.interactive = true;
        shareButton.buttonMode = true;
        shareButton.on('pointerup', () => {
            if(cooldown > 0)
                return;
            FB.ui({
                method: 'share',
                href: window.location.href,
                quote: 'I scored ' + score + ' in Flappy Bird Online!'
            }, function(response){});
        });

        restartButton.interactive = true;
        restartButton.buttonMode = true;
        restartButton.on('pointerup', () => {
            tapScreen();
        });

        touch = new PIXI.Graphics();
        touch.beginFill(0xFF0000, 0);
        touch.drawRect(0, 0, 288, 600);

        touch.interactive = true;
        touch.on('pointerdown', () => {
            tapScreen();
        });

        scoreSprite.addChild(scoreText);
        scoreSprite.addChild(highScoreText);
        scoreSprite.addChild(leaderboardButtonGlow);
        scoreSprite.addChild(leaderboardButton);
        scoreSprite.addChild(restartButton);
        scoreSprite.addChild(shareButton);

        mask.beginFill(0xffffff, 1);
        mask.drawRect(0, 0, 288, 600);
        application.stage.mask = mask;

        animation.anchor.x = 0.5;
        animation.anchor.y = 0.5;
        animation.loop = true;
        animation.animationSpeed = 0.15;

        bitmapText = new PIXI.extras.BitmapText('0', { font: '36px Score' });
        bitmapText.position.x = 144;
        bitmapText.position.y = 150;
        bitmapText.visible = false;
        (<any>bitmapText).anchor.x = 0.5;
        (<any>bitmapText).anchor.y = 0.5;

        floorSprites = [];
        let floorTexture:PIXI.Texture = PIXI.loader.resources['/images/floor.png'].texture;
        for(let i:number = 0; i < 2; i ++) {
            let section:PIXI.Sprite = new PIXI.Sprite(floorTexture);
            section.position.y = 600 - floorTexture.height;
            floorContainer.addChild(section);
            floorSprites.push(section);
        }
        pipeSprites = [];
        background = new PIXI.Sprite(PIXI.loader.resources['/images/background.png'].texture);
        application.stage.addChild(background);
        application.stage.addChild(pipeContainer);
        application.stage.addChild(floorContainer);
        application.stage.addChild(animation);
        application.stage.addChild(bitmapText);
        application.stage.addChild(touch);
        application.stage.addChild(scoreSprite);
        application.stage.addChild(titleSprite);
        application.stage.addChild(mask);
        document.body.appendChild(application.view);
        window.onresize(null);
        display();
    })
    .load();



    function display():void {
        let position:Matter.Vector = playerBody.position;
        let rotation:number = playerBody.angle;
        animation.position.x = position.x;
        animation.position.y = position.y;
        animation.rotation = rotation;

        for(let i in floorOffsets) {
            floorSprites[i].position.x = floorOffsets[i];
        }

        for(let i in pipeBodies) {
            let sprite:PIXI.Sprite = pipeSprites[i];
            let body:Matter.Body = pipeBodies[i];
            if(sprite == undefined) {
                sprite = pipeSprites[i] = new PIXI.Sprite(PIXI.loader.resources['/images/pipe-green.png'].texture);
                sprite.anchor.x = 0.5;
                sprite.anchor.y = 0.5;
                pipeContainer.addChild(sprite);
            }
            else {
                sprite.visible = true;
            }
            sprite.position.x = body.position.x;
            sprite.position.y = body.position.y;
            sprite.rotation = body.angle;
        }

        for(let i = pipeBodies.length; i < pipeSprites.length; i++)
        {
            pipeSprites[i].visible = false;
        }
            
        let delta:number = elapsed();
        leaderboardButtonGlow.alpha = (-Math.cos(delta / 500) + 1) / 2;
        scoreSprite.position.y = Math.min(delta, 240);
        scoreSprite.alpha = Math.min(delta / 250, 1);

        window.requestAnimationFrame(time => {
            display();
        });
    }

    function onDie(score:number, highScore:number):void {
        let xmlHttpRequest:XMLHttpRequest = new XMLHttpRequest();
        xmlHttpRequest.open('POST', 'Home/SubmitGame', true);
        xmlHttpRequest.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
        xmlHttpRequest.send('score=' + score);

        leaderboardButtonGlow.alpha = 0;
        bitmapText.visible = false;
        scoreSprite.alpha = 0;
        scoreSprite.position.y = 0;
        scoreSprite.visible = true;
        scoreText.text = '' + score;
        highScoreText.text = '' + highScore;
        animation.stop();
        cooldown = 20;
        relativeTime = new Date();
    }
}

flappy();

window.fbAsyncInit = function() {
    FB.init({ appId: '282422095623841', version: 'v2.12' });
};

(function(d, s, id){
    var j, c = d.getElementsByTagName(s)[0];
    if (!d.getElementById(id)) {
        j = d.createElement(s); j.id = id;
        j.src = 'https://connect.facebook.net/en_GB/sdk.js';
        c.parentNode.insertBefore(j, c);
    }
  }(document, 'script', 'facebook-jssdk'));

//var f:FlappyGraphics = new FlappyGraphics();