const enum GameState {
    InProgress, StartGame, GameOver
}

interface Configuration {
    force:number;
    speed:number;
    pipe: { delay:number, gap:number };
}

interface Sounds {
    point:Howl; 
    hit:Howl;
    wing:Howl;
}

var config:Configuration = {
    force:6,
    speed:3,
    pipe: { delay:100, gap:100 }
};

var sounds:Sounds = {
    point: new Howl({
        src:'/audio/point.ogg'
    }),
    hit: new Howl({
        src:'/audio/hit.ogg'
    }),
    wing: new Howl({
        src:'/audio/wing.ogg'
    })
};

const enum FlappyEvent {
    StartGame, Die
}

interface FlappyListener {
    onReset:() => void;
    onGameStart:() => void;
    onDie:(score:number, highScore:number) => void;
    onScore:(score:number) => void;
}

var listeners:FlappyListener[] = [];

var relativeTime:Date = new Date();

function elapsed():number {
    return new Date().getTime() - relativeTime.getTime();
}

class FlappyPhysics {
    private engine:Matter.Engine;
    private runner:Matter.Runner;
    private player:Matter.Body;
    private floor:Matter.Body;
    private sensor:Matter.Body;
    private pipes:Matter.Body[];
    private pipeSensors:Matter.Body[];
    private floorOffsets:number[];
    private pipeCounter:number;
    private score:number;
    private highScore:number;
    private cooldown:number;
    private gameState:GameState;

    constructor() {
        this.engine = Matter.Engine.create();
        this.runner = Matter.Runner.create({delta:1000/60});
        this.player = Matter.Bodies.circle(50, 0, 10, {friction:1,restitution:0.9});
        this.floor = Matter.Bodies.rectangle(400, 544, 800, 112, {isStatic:true});
        this.sensor = Matter.Bodies.rectangle(-200, 300, 10, 600, {isSensor:true});
        this.pipes = [];
        this.pipeSensors = [];
        this.floorOffsets = [];
        for(let i = 0; i < 2; i++) {
            this.floorOffsets.push(i * 336);
        }
        this.pipeCounter = 0;
        this.score = 0;
        this.highScore = 0;
        this.cooldown = 0;
        this.gameState = GameState.StartGame;

        Matter.World.add(this.engine.world, [this.player, this.floor, this.sensor]);
        Matter.Events.on(this.engine, 'tick', event => {
            let worldVelocity:Matter.Vector = { x: -config.speed, y: 0 };
            switch(this.gameState) {
                case GameState.InProgress:
                    if(--this.pipeCounter <= 0) {
                        for(let flipped of [true, false]) {
                            this.createPipe(300, flipped);
                        }
                        let pipeSensor:Matter.Body = Matter.Bodies.rectangle(375, 300, 5, 600, { isStatic:true, isSensor: true });
                        Matter.World.add(this.engine.world, pipeSensor);
                        this.pipeSensors.push(pipeSensor);
                        this.pipeCounter = config.pipe.delay;
                    }
                    this.player.angle = -45 * Math.PI / 180;
                    if(this.player.velocity.y > 0) {
                        this.player.angle += Math.min(135 * Math.PI / 180, this.player.velocity.y * 0.3);
                    }
                    break;
                case GameState.StartGame:
                    Matter.Body.setPosition(this.player, { x: 50, y: 275 + Math.sin(elapsed() / 250) * 15});
                    Matter.Body.setVelocity(this.player, { x: 0, y: 0 });
                    Matter.Body.setAngle(this.player, 0);
                    Matter.Body.setAngularVelocity(this.player, 0);
                    break;
                case GameState.GameOver:
                    worldVelocity = { x: 0, y: 0 };
                    break;
            }

            for(let index in this.floorOffsets) {
                this.floorOffsets[index] += worldVelocity.x;
                if(this.floorOffsets[index] < -336) {
                    this.floorOffsets[index] += this.floorOffsets.length * 336;
                }
            }

            for(let i of this.pipes) {
                Matter.Body.setPosition(i, {
                    x:i.position.x+worldVelocity.x,
                    y:i.position.y+worldVelocity.y
                }); // <= Move pipes forward.
                Matter.Body.setVelocity(i, worldVelocity);
            }

            for(let i of this.pipeSensors) {
                Matter.Body.setPosition(i, {
                    x:i.position.x+worldVelocity.x,
                    y:300
                }); // <= Move sensors forward.
            }

            Matter.Body.setVelocity(this.floor, worldVelocity);
            Matter.Body.setPosition(this.sensor, {x:-100,y:300});
            this.cooldown--;
        });
        window.onkeydown = event => {
            if(event.key == ' ' && !event.repeat) {
                this.flap();
            }
        };
        Matter.Events.on(this.engine, 'collisionStart', event => {
            for(let pair of event.pairs) {
                let tuples:Matter.Body[][] = [
                    [pair.bodyA, pair.bodyB],
                    [pair.bodyB, pair.bodyA]
                ];
                for(let tuple of tuples) {
                    switch(tuple[0]) {
                        case this.player:
                            if(this.gameState == GameState.InProgress) {
                                let handled:boolean = false;
                                for(let i = 0; i < this.pipeSensors.length; i++) {
                                    if(this.pipeSensors[i] == tuple[1]) {
                                        Matter.World.remove(this.engine.world, this.pipeSensors[i])
                                        this.pipeSensors.splice(i, 1);
                                        sounds.point.play();
                                        this.score++;
                                        if(this.score >= this.highScore) {
                                            this.highScore = this.score;
                                        }
                                        for(let listener of listeners) {
                                            listener.onScore(this.score);
                                        }
                                        handled = true;
                                        break;
                                    }
                                }
                                if(!handled) {
                                    this.gameState = GameState.GameOver;         
                                    this.cooldown = 20;
                                    for(let listener of listeners) {
                                        listener.onDie(this.score, this.highScore);
                                    }
                                    sounds.hit.play();
                                }
                            }
                            break;
                        case this.sensor:
                            for(let i = 0; i < this.pipes.length; i++) {
                                if(this.pipes[i] == tuple[1]) {
                                    Matter.World.remove(this.engine.world, this.pipes[i])
                                    this.pipes.splice(i, 1);
                                    break;
                                }
                            }
                            break;
                    }
                }   
            }
        });
        Matter.Runner.run(this.runner, this.engine);
    }

    public createPipe(height:number, flipped:boolean):Matter.Body {
        let result:Matter.Body =
            Matter.Bodies.rectangle(375, 300 + (160+config.pipe.gap/2) * (flipped ? -1 : 1), 52, 320, {isStatic:true,angle:flipped ? Math.PI : 0});// WTF is this ungliness?
        Matter.World.add(this.engine.world, result);
        this.pipes.push(result);
        return result;
    }

    public getPlayerPosition():{x:number,y:number} {
        return {
            x: this.player.position.x,
            y: this.player.position.y
        };
    }

    public getPlayerRotation():number {
        return this.player.angle;
    }

    public getFloorOffsets():number[] {
        return this.floorOffsets.slice(0);
    }

    public getPipeOrientations():{x:number,y:number,r:number}[] {
        let result:{x:number,y:number,r:number}[] = [];
        for(let pipe of this.pipes) {
            result.push({
                x: pipe.position.x,
                y: pipe.position.y,
                r: pipe.angle
            });
        }
        return result;
    }

    public flap():void {
        if(this.cooldown > 0)
            return;
        switch(this.gameState) {
            case GameState.GameOver:
                while(this.pipes.length > 0) {
                    Matter.World.remove(this.engine.world, this.pipes.pop());
                }
                while(this.pipeSensors.length > 0) {
                    Matter.World.remove(this.engine.world, this.pipeSensors.pop());
                }
                this.gameState = GameState.StartGame;
                this.pipeCounter = config.pipe.delay;
                this.score = 0;
                this.cooldown = 20;
                for(let listener of listeners) {
                    listener.onReset();
                }
                break;
            case GameState.StartGame:
                for(let listener of listeners) {
                    listener.onGameStart();
                }
                this.gameState = GameState.InProgress;
            case GameState.InProgress:
                Matter.Body.setVelocity(this.player, {x:0, y:-config.force});
                sounds.wing.play();
        }
    }

    public getScore():number {
        return this.score;
    }
}

class FlappyGraphics implements FlappyListener {

    private application:PIXI.Application;
    private mask:PIXI.Graphics;
    private animation:PIXI.extras.AnimatedSprite;
    private bitmapText:PIXI.extras.BitmapText;
    private pipeContainer:PIXI.Container;
    private floorContainer:PIXI.Container;
    private background:PIXI.Sprite;
    private pipeSprites:PIXI.Sprite[];
    private floorSprites:PIXI.Sprite[];
    private scoreSprite:PIXI.Sprite;
    private scoreText:PIXI.extras.BitmapText;
    private highScoreText:PIXI.extras.BitmapText;
    private leaderboardButton:PIXI.Sprite;
    private leaderboardButtonGlow:PIXI.Sprite;
    private restartButton:PIXI.Sprite;
    private shareButton:PIXI.Sprite;
    private titleSprite:PIXI.Sprite;
    private touch:PIXI.Graphics;
    
    constructor(physics:FlappyPhysics, canvas?:HTMLCanvasElement) {
        listeners.push(this);
        PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;
        this.application = new PIXI.Application({view:canvas});
        this.pipeContainer = new PIXI.Container();
        this.floorContainer = new PIXI.Container();
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
            window.onresize = () => {
                let fullscreen:boolean = false;

                if(!fullscreen) {
                    let w:number = this.application.view.clientWidth;
                    let h:number = this.application.view.clientHeight;
                    let ratio:number = w / h;  

                    if(ratio > 0.683 || ratio < 0.48) {
                        let scale:number = w * (600 / h);
                        this.application.stage.x = scale / 2 - 144;
                        this.application.stage.y = 0;
                        this.application.renderer.resize(scale, 600);
                    }
                    else
                    {
                        let scale:number = h * (288 / w);
                        this.application.stage.x = 0;
                        this.application.stage.y = scale / 2 - 300;
                        this.application.renderer.resize(288, scale);
                    }

                    if(ratio < 0.54) {
                        this.titleSprite.position.y = this.bitmapText.position.y = 75;
                    }
                    else if(ratio < 0.57) {
                        this.titleSprite.position.y = this.bitmapText.position.y = 100;
                    }
                    else if(ratio < 0.65) {
                        this.titleSprite.position.y = this.bitmapText.position.y = 125;
                    }
                    else if(ratio < 0.683) {
                        this.titleSprite.position.y = this.bitmapText.position.y = 150;
                    }
                    else {
                        this.titleSprite.position.y = this.bitmapText.position.y = 100;
                    }
                }
            };

            this.animation = new PIXI.extras.AnimatedSprite([
                PIXI.loader.resources['/images/bluebird-downflap.png'].texture,
                PIXI.loader.resources['/images/bluebird-midflap.png'].texture,
                PIXI.loader.resources['/images/bluebird-upflap.png'].texture,
                PIXI.loader.resources['/images/bluebird-midflap.png'].texture
            ]);

            this.animation.play();

            this.titleSprite = new PIXI.Sprite(PIXI.loader.resources['/images/title.png'].texture);
            this.titleSprite.position.x = 144;
            this.titleSprite.position.y = 150;
            this.titleSprite.anchor.x = 0.5;
            this.titleSprite.anchor.y = 0.5;

            this.scoreSprite = new PIXI.Sprite(PIXI.loader.resources['/images/score.png'].texture);
            this.scoreSprite.anchor.x = 0.5;
            this.scoreSprite.anchor.y = 0.5;
            this.scoreSprite.position.x = 144;
            this.scoreSprite.position.y = 240;
            this.scoreSprite.visible = false;

            this.scoreText = new PIXI.extras.BitmapText("0", { font: '36px Score' });
            (<any>this.scoreText).anchor.x = 0.5;
            (<any>this.scoreText).anchor.y = 0.5;
            this.scoreText.position.y = -30;

            this.highScoreText = new PIXI.extras.BitmapText("0", { font: '36px Score' });
            (<any>this.highScoreText).anchor.x = 0.5;
            (<any>this.highScoreText).anchor.y = 0.5;
            this.highScoreText.position.y = 44;

            this.leaderboardButton = new PIXI.Sprite(PIXI.loader.resources['/images/add-to-leaderboard.png'].texture);
            this.leaderboardButton.anchor.x = 0.5;
            this.leaderboardButton.anchor.y = 0.5;
            this.leaderboardButton.position.y = 170;

            this.leaderboardButtonGlow = new PIXI.Sprite(PIXI.loader.resources['/images/add-to-leaderboard-glow.png'].texture);
            this.leaderboardButtonGlow.anchor.x = 0.5;
            this.leaderboardButtonGlow.anchor.y = 0.5;
            this.leaderboardButtonGlow.position.x = this.leaderboardButton.position.x;
            this.leaderboardButtonGlow.position.y = this.leaderboardButton.position.y;

            this.restartButton = new PIXI.Sprite(PIXI.loader.resources['/images/restart.png'].texture);
            this.restartButton.anchor.x = 0.5;
            this.restartButton.anchor.y = 0.5;
            this.restartButton.position.x = 50;
            this.restartButton.position.y = 135;

            this.shareButton = new PIXI.Sprite(PIXI.loader.resources['/images/share.png'].texture);
            this.shareButton.anchor.x = 0.5;
            this.shareButton.anchor.y = 0.5;
            this.shareButton.position.x = -50;
            this.shareButton.position.y = 135;

            this.shareButton.interactive = true;
            this.shareButton.buttonMode = true;
            this.shareButton.on('pointerup', () => {
                window.location.href = 'Home/Share';
            });

            this.leaderboardButton.interactive = true;
            this.leaderboardButton.buttonMode = true;
            this.leaderboardButton.on('pointerup', () => {
                let scoreInput:HTMLInputElement = document.createElement("input");
                scoreInput.setAttribute('type', 'hidden');
                scoreInput.setAttribute('name', 'value');
                scoreInput.setAttribute('value', '' + physics.getScore());
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
            
            this.shareButton.interactive = true;
            this.shareButton.buttonMode = true;
            this.shareButton.on('pointerup', () => {
                window.location.href = 'Home/Share';
            });
            
            this.restartButton.interactive = true;
            this.restartButton.buttonMode = true;
            this.restartButton.on('pointerup', () => {
                physics.flap();
            });

            this.touch = new PIXI.Graphics();
            this.touch.beginFill(0xFF0000, 0);
            this.touch.drawRect(0, 0, 288, 600);

            this.touch.interactive = true;
            this.touch.on('pointerdown', () => {
                physics.flap();
            });
            /*
            this.application.view.onpointerdown = () => {
                let func = (<any>this.application.view).requestFullscreen
                || (<any>this.application.view).webkitRequestFullScreen
                || (<any>this.application.view).mozRequestFullScreen
                || (<any>this.application.view).msRequestFullscreen;
                if(func) {
                    func.call(this.application.view);
                }
            }
            */
            this.scoreSprite.addChild(this.scoreText);
            this.scoreSprite.addChild(this.highScoreText);
            this.scoreSprite.addChild(this.leaderboardButtonGlow);
            this.scoreSprite.addChild(this.leaderboardButton);
            this.scoreSprite.addChild(this.restartButton);
            this.scoreSprite.addChild(this.shareButton);

            this.mask = new PIXI.Graphics();
            this.mask.beginFill(0xffffff, 1);
            this.mask.drawRect(0, 0, 288, 600);
            this.application.stage.mask = this.mask;

            this.animation.anchor.x = 0.5;
            this.animation.anchor.y = 0.5;
            this.animation.loop = true;
            this.animation.animationSpeed = 0.15;

            this.bitmapText = new PIXI.extras.BitmapText("0", { font: '36px Score' });
            this.bitmapText.position.x = 144;
            this.bitmapText.position.y = 150;
            this.bitmapText.visible = false;
            (<any>this.bitmapText).anchor.x = 0.5;
            (<any>this.bitmapText).anchor.y = 0.5;

            this.floorSprites = [];
            let floorTexture:PIXI.Texture = PIXI.loader.resources['/images/floor.png'].texture;
            for(let i:number = 0; i < 2; i ++) {
                let section:PIXI.Sprite = new PIXI.Sprite(floorTexture);
                section.position.y = 600 - floorTexture.height;
                this.floorContainer.addChild(section);
                this.floorSprites.push(section);
            }
            this.pipeSprites = [];
            this.background = new PIXI.Sprite(PIXI.loader.resources['/images/background.png'].texture);
            this.application.stage.addChild(this.background);
            this.application.stage.addChild(this.pipeContainer);
            this.application.stage.addChild(this.floorContainer);
            this.application.stage.addChild(this.animation);
            this.application.stage.addChild(this.bitmapText);
            this.application.stage.addChild(this.touch);
            this.application.stage.addChild(this.scoreSprite);
            this.application.stage.addChild(this.titleSprite);
            this.application.stage.addChild(this.mask);
            if(!canvas) {
                document.body.appendChild(this.application.view);
            }
            window.onresize(null);
            this.display(physics);
        })
        .load();
    }

    public display(physics:FlappyPhysics):void {
        let position:{x:number,y:number} = physics.getPlayerPosition();
        let rotation:number = physics.getPlayerRotation();
        let floorOffsets:number[] = physics.getFloorOffsets();
        let pipeOrientations:{x:number,y:number,r:number}[] = physics.getPipeOrientations();
        this.animation.position.x = position.x;
        this.animation.position.y = position.y;
        this.animation.rotation = rotation;

        for(let i in floorOffsets) {
            this.floorSprites[i].position.x = floorOffsets[i];
        }

        for(let i in pipeOrientations) {
            let sprite:PIXI.Sprite = this.pipeSprites[i];
            if(sprite == undefined) {
                sprite = this.pipeSprites[i] = new PIXI.Sprite(PIXI.loader.resources['/images/pipe-green.png'].texture);
                sprite.anchor.x = 0.5;
                sprite.anchor.y = 0.5;
                this.pipeContainer.addChild(sprite);
            }
            else {
                sprite.visible = true;
            }
            sprite.position.x = pipeOrientations[i].x;
            sprite.position.y = pipeOrientations[i].y;
            sprite.rotation = pipeOrientations[i].r;
        }
        for(let i = pipeOrientations.length; i < this.pipeSprites.length; i++)
        {
            this.pipeSprites[i].visible = false;
        }
        this.leaderboardButtonGlow.alpha = (-Math.cos(elapsed() / 500) + 1) / 2;
        // this.titleSprite.position.y = Math.min(-200 + elapsed() / 2.5, 0);
        // this.titleSprite.alpha = Math.min(elapsed() / 750, 100);
        window.requestAnimationFrame(time => {
            this.display(physics);
        });
    }

    public onReset():void {
        while(this.pipeSprites.length > 0) {
            let pipeSprite:PIXI.Sprite = this.pipeSprites.pop();
            this.application.stage.removeChild(pipeSprite);
            pipeSprite.destroy();
        }
        this.scoreSprite.visible = false;
        this.titleSprite.visible = true;
        this.animation.play();
        relativeTime = new Date();
    }

    public onGameStart():void {
        this.bitmapText.text = '0';
        this.bitmapText.visible = true;
        this.titleSprite.visible = false;
    }

    public onDie(score:number, highScore:number):void {
        this.leaderboardButtonGlow.alpha = 0;
        this.bitmapText.visible = false;
        this.scoreSprite.visible = true;
        this.scoreText.text = '' + score;
        this.highScoreText.text = '' + highScore;
        this.animation.stop();
        relativeTime = new Date();
    }

    public onScore(score:number):void {
        this.bitmapText.text = '' + score;
    }
}

var f:FlappyGraphics = new FlappyGraphics(new FlappyPhysics());