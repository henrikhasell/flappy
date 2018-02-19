interface Configuration {
    force:number;
    speed:number;
    pipe:{delay:number,gap:number};
}

var config:Configuration = {
    force:7,
    speed:3,
    pipe: {
        delay:100,
        gap:100
    }
};

class FlappyPhysics {
    private engine:Matter.Engine;
    private runner:Matter.Runner;
    private mouseConstraint:Matter.MouseConstraint;
    private player:Matter.Body;
    private floor:Matter.Body;
    private pipes:Matter.Body[];
    private floorOffsets:number[];
    private playerAlive:boolean;
    private pipeCounter:number;

    constructor() {
        this.engine = Matter.Engine.create();
        this.runner = Matter.Runner.create({delta:1000/60});
        this.mouseConstraint = Matter.MouseConstraint.create(this.engine);
        this.player = Matter.Bodies.circle(100, 0, 10, {friction:1,restitution:0.9});
        this.floor = Matter.Bodies.rectangle(400, 544, 800, 112, {isStatic:true});
        this.pipes = [];
        this.floorOffsets = [];
        for(let i = 0; i < 5; i++) {
            this.floorOffsets.push(i * 336);
        }
        this.playerAlive = true;
        this.pipeCounter = 0;

        Matter.World.add(this.engine.world, [this.player, this.floor]);
        Matter.Events.on(this.engine, 'tick', (event) => {
            let worldVelocity:Matter.Vector;
            if(--this.pipeCounter <= 0) {
                this.pipeCounter = config.pipe.delay;
                for(let flipped of [true, false]) {
                    this.createPipe(300, flipped);
                }
            }
            if(this.playerAlive) {
                this.player.angle = -45 * Math.PI / 180;
                if(this.player.velocity.y > 0) {
                    this.player.angle += Math.min(135 * Math.PI / 180, this.player.velocity.y * 0.3);
                }
                for(let i in this.floorOffsets) {
                    this.floorOffsets[i] -= config.speed;
                    if(this.floorOffsets[i] < -336) {
                        this.floorOffsets[i] += this.floorOffsets.length * 336;
                    }
                }
                worldVelocity = {x:-config.speed,y:0};
            }
            else {
                worldVelocity = {x:0,y:0}
            }
            for(let i of this.pipes) {
                Matter.Body.setPosition(i, {
                    x:i.position.x+worldVelocity.x,
                    y:i.position.y+worldVelocity.y
                }); // <= Move the pipes forwards.
                Matter.Body.setVelocity(i, worldVelocity);
            }
            Matter.Body.setVelocity(this.floor, worldVelocity);

        });
        Matter.Events.on(this.mouseConstraint, 'mousedown', (event) => {
            if(this.playerAlive) {
                Matter.Body.setVelocity(this.player, {x:0, y:-config.force});
            }
        });
        Matter.Events.on(this.engine, 'collisionStart', (event) => {
            for(let pair of event.pairs) {
                for(let body of [pair.bodyA, pair.bodyB]) {
                    if(body == this.player) {
                        this.playerAlive = false;
                    }
                }
            }
        });
        Matter.Runner.run(this.runner, this.engine);
    }

    public createPipe(height:number, flipped:boolean):Matter.Body {
        let result:Matter.Body = Matter.Bodies.rectangle(900, 300 + (160+config.pipe.gap/2) * (flipped ? -1 : 1), 52, 320, {isStatic:true,angle:flipped ? Math.PI : 0});
        Matter.World.add(this.engine.world, result);
        this.pipes.push(result);
        return result;
    }

    public getPlayerPosition():{x:number,y:number} {
        return {x:this.player.position.x, y:this.player.position.y}
    }

    public getPlayerRotation():number {
        return this.player.angle;
    }

    public getFloorOffsets():number[] {
        return this.floorOffsets.slice(0);
    }

    public getPlayerAlive():boolean {
        return this.playerAlive;
    }

    public getPipeOrientations():{x:number,y:number,r:number}[] {
        let result:{x:number,y:number,r:number}[] = [];
        for(let pipe of this.pipes) {
            result.push({x:pipe.position.x,y:pipe.position.y,r:pipe.angle});
        }
        return result;
    }
}

class FlappyGraphics {
    private application:PIXI.Application;
    private animation:PIXI.extras.AnimatedSprite;
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
            'images/background.png'
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
            this.animation.animationSpeed = 0.2;

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
            document.body.appendChild(this.application.view);
            this.display(physics);
        })
        .load();
    }

    public display(physics:FlappyPhysics):void {
        let position:{x:number,y:number} = physics.getPlayerPosition();
        let rotation:number = physics.getPlayerRotation();
        let alive:boolean = physics.getPlayerAlive();

        this.animation.position.x = position.x;
        this.animation.position.y = position.y;
        this.animation.rotation = rotation;

        if(alive) {
            this.animation.play();
        }
        else {
            this.animation.stop();
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

        window.requestAnimationFrame((time:number) => {
            this.display(physics);
        });
    }
}

new FlappyGraphics(new FlappyPhysics());