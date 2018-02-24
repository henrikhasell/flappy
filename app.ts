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
    point: new Howl({ src:'audio/point.ogg' }),
    hit: new Howl({ src:'audio/hit.ogg' }),
    wing: new Howl({ src:'audio/wing.ogg' }),
};

class FlappyPhysics {
    private engine:Matter.Engine;
    private runner:Matter.Runner;
    private mouseConstraint:Matter.MouseConstraint;
    private player:Matter.Body;
    private floor:Matter.Body;
    private sensor:Matter.Body;
    private pipes:Matter.Body[];
    private pipeSensors:Matter.Body[];
    private floorOffsets:number[];
    private pipeCounter:number;
    private score:number;
    private gameState:GameState;

    constructor() {
        this.engine = Matter.Engine.create();
        this.runner = Matter.Runner.create({delta:1000/60});
        this.mouseConstraint = Matter.MouseConstraint.create(this.engine);
        this.player = Matter.Bodies.circle(50, 0, 10, {friction:1,restitution:0.9});
        this.floor = Matter.Bodies.rectangle(400, 544, 800, 112, {isStatic:true});
        this.sensor = Matter.Bodies.rectangle(-200, 300, 10, 600, {isSensor:true});
        this.pipes = [];
        this.pipeSensors = [];
        this.floorOffsets = [];
        for(let i = 0; i < 5; i++) {
            this.floorOffsets.push(i * 336);
        }
        this.pipeCounter = 0;
        this.score = 0;
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
                        let pipeSensor:Matter.Body = Matter.Bodies.rectangle(900, 300, 5, 600, { isStatic:true, isSensor: true });
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
                    Matter.Body.setPosition(this.player, { x: 50, y: 300 });
                    Matter.Body.setVelocity(this.player, { x: 0, y: 0 });
                    Matter.Body.setAngle(this.player, 0);
                    Matter.Body.setAngularVelocity(this.player, 0);
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
        });
        Matter.Events.on(this.mouseConstraint, 'mousedown', event => {
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
                    this.score = 0; break;
                case GameState.StartGame:
                    this.gameState = GameState.InProgress;
                case GameState.InProgress:
                    Matter.Body.setVelocity(this.player, {x:0, y:-config.force});
                    sounds.wing.play();
            }
        });
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
                                        handled = true;
                                        break;
                                    }
                                }
                                if(!handled) {
                                    this.gameState = GameState.GameOver;
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
        let result:Matter.Body = Matter.Bodies.rectangle(900, 300 + (160+config.pipe.gap/2) * (flipped ? -1 : 1), 52, 320, {isStatic:true,angle:flipped ? Math.PI : 0});// WTF is this ungliness?
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
    
    public getScore():number {
        return this.score;
    }

    public getPlayerRotation():number {
        return this.player.angle;
    }

    public getFloorOffsets():number[] {
        return this.floorOffsets.slice(0);
    }

    public getPlayerAlive():GameState {
        return this.gameState;
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
}

class FlappyGraphics {
    private application:PIXI.Application;
    private animation:PIXI.extras.AnimatedSprite;
    private bitmapText:PIXI.extras.BitmapText;
    private pipeContainer:PIXI.Container;
    private floorContainer:PIXI.Container;
    private background:PIXI.Sprite;
    private pipeSprites:PIXI.Sprite[];
    private floorSprites:PIXI.Sprite[];
    
    constructor(physics:FlappyPhysics) {
        this.application = new PIXI.Application();
        this.pipeContainer = new PIXI.Container();
        this.floorContainer = new PIXI.Container();
        PIXI.loader
        .add([
            'images/bluebird-downflap.png',
            'images/bluebird-midflap.png',
            'images/bluebird-upflap.png',
            'images/floor.png',
            'images/pipe-green.png',
            'images/background.png',
            'fonts/score.xml'
        ])
        .on('progress', (loader, resource) => {
            console.info('Loaded resource ' + resource.name);
        })
        .on('complete', (loader, resource) => {

            this.animation = new PIXI.extras.AnimatedSprite([
                PIXI.loader.resources['images/bluebird-downflap.png'].texture,
                PIXI.loader.resources['images/bluebird-midflap.png'].texture,
                PIXI.loader.resources['images/bluebird-upflap.png'].texture,
                PIXI.loader.resources['images/bluebird-midflap.png'].texture
            ]);
            
            this.animation.anchor.x = 0.5;
            this.animation.anchor.y = 0.5;
            this.animation.loop = true;
            this.animation.animationSpeed = 0.15;

            this.bitmapText = new PIXI.extras.BitmapText("Hello, world!", { font: '36px Score' });

            this.floorSprites = [];
            let floorTexture:PIXI.Texture = PIXI.loader.resources['images/floor.png'].texture;
            for(let i:number = 0; i < 5; i ++) {
                let section:PIXI.Sprite = new PIXI.Sprite(floorTexture);
                section.position.y = 600 - floorTexture.height;
                this.floorContainer.addChild(section);
                this.floorSprites.push(section);
            }
            this.pipeSprites = [];
            this.background = new PIXI.Sprite(PIXI.loader.resources['images/background.png'].texture);
            this.application.stage.addChild(this.background);
            this.application.stage.addChild(this.pipeContainer);
            this.application.stage.addChild(this.floorContainer);
            this.application.stage.addChild(this.animation);
            this.application.stage.addChild(this.bitmapText);
            document.body.appendChild(this.application.view);
            this.display(physics);
        })
        .load();
    }

    public display(physics:FlappyPhysics):void {
        let position:{x:number,y:number} = physics.getPlayerPosition();
        let rotation:number = physics.getPlayerRotation();
        let gameState:GameState = physics.getPlayerAlive();

        this.animation.position.x = position.x;
        this.animation.position.y = position.y;
        this.animation.rotation = rotation;

        switch(gameState) {
            case GameState.GameOver:
                this.animation.stop(); break;
            case GameState.StartGame:
                while(this.pipeSprites.length > 0) {
                    let pipeSprite:PIXI.Sprite = this.pipeSprites.pop();
                    this.application.stage.removeChild(pipeSprite);
                    pipeSprite.destroy();
                }
                this.animation.play(); break;
        }

        let floorOffsets:number[] = physics.getFloorOffsets();
        for(let i in floorOffsets) {
            this.floorSprites[i].position.x = floorOffsets[i];
        }

        let pipeOrientations:{x:number,y:number,r:number}[] = physics.getPipeOrientations();
        for(let i in pipeOrientations) {
            let sprite:PIXI.Sprite = this.pipeSprites[i];
            if(sprite == undefined) {
                sprite = this.pipeSprites[i] = new PIXI.Sprite(PIXI.loader.resources['images/pipe-green.png'].texture);
                sprite.anchor.x = 0.5;
                sprite.anchor.y = 0.5;
                this.pipeContainer.addChild(sprite);
            }
            sprite.position.x = pipeOrientations[i].x;
            sprite.position.y = pipeOrientations[i].y;
            sprite.rotation = pipeOrientations[i].r;
        }

        this.bitmapText.text = "" + physics.getScore();
        this.bitmapText.position.x = 144 - this.bitmapText.width / 2;
        this.bitmapText.position.y = 50;

        window.requestAnimationFrame(time => {
            this.display(physics);
        });
    }
}

new FlappyGraphics(new FlappyPhysics());