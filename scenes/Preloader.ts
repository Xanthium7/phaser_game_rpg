

import {GridEngine, Direction} from "grid-engine";
import Phaser, {Scene} from "phaser";



export default class Preloader extends Scene {
    private gridEngine!: GridEngine;
    private socket!: SocketIOClient.Socket;
    private players: { [id: string]: Phaser.GameObjects.Sprite } = {};
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    constructor() {
        super('Preloader');
    }

    init(data: { socket: SocketIOClient.Socket }) {
      this.socket = data.socket;
      this.cursors = this.input.keyboard!.createCursorKeys();
    }

    preload(){

        this.load.tilemapTiledJSON('map', 'assets/map.json');
        this.load.image('tileset', 'assets/Overworld.png');
        this.load.spritesheet('hero', 'assets/character.png', { frameWidth: 16, frameHeight: 32 });
    }
    create(){
    
        const map = this.make.tilemap({ key: 'map' });
        const tileset = map.addTilesetImage('Overworld', 'tileset');
  
  // Create layers based on layer names in Tiled
        const groundLayer = map.createLayer('ground', tileset!, 0, 0);
        const fenceLayer = map.createLayer('fence', tileset!, 0, 0);

        
        const heroSprite = this.physics.add.sprite(0, 0, 'hero');
        

       
        
        // Camera follow logic >o<
        this.cameras.main.startFollow(heroSprite, true)
        this.cameras.main.setFollowOffset(-heroSprite.width, -heroSprite.height)
    
        const gridEngineConfig = {
            // characters: [{
            //     id: 'hero',
            //     sprite: heroSprite,
            //     startPosition: { x: 25, y: 20 },
            // }],
            characters: [],
            //collisionTilePropertyName: 'collides', 
            tiles: {
                width: 16,
                height: 16,
            }
        };
        this.gridEngine.create(map, gridEngineConfig);
        
        this.cursors = this.input.keyboard!.createCursorKeys();

        // Objects
        this.setupMultiplayerEvents();
        this.gridEngine.movementStopped().subscribe(({ charId }) => {
          if (charId === this.socket.id) {
            const newPosition = this.gridEngine.getPosition(charId);
            console.log(`Player moved to position: x=${newPosition.x}, y=${newPosition.y}`);
            this.socket.emit('playerMovement', {
              id: charId,
              x: newPosition.x,
              y: newPosition.y,
            });
          }
        });
    }
    private setupMultiplayerEvents() {
      // Handle current players already in the game
      this.socket.on("currentPlayers", (players: any) => {
        console.log('Received currentPlayers:', players);
        Object.keys(players).forEach((id) => {
          const playerInfo = players[id];
          console.log(`Processing player ID: ${id}`);
          if (id === this.socket.id) {
            console.log('Adding current player');
            this.addPlayer({ id, x: playerInfo.x, y: playerInfo.y }, true);
          } else {
            console.log('Adding other player');
            this.addPlayer({ id, x: playerInfo.x, y: playerInfo.y }, false);
          }
        });
      });

      
    // Handle new player joining
    this.socket.on("newPlayer", (playerInfo: any) => {
      this.addPlayer(playerInfo, false);
    });

    // Handle player movement updates
    this.socket.on("playerMoved", (playerInfo: any) => {
      console.log('Received playerMoved:', playerInfo);
      if (playerInfo.id !== this.socket.id && this.gridEngine.hasCharacter(playerInfo.id)) {
        this.gridEngine.moveTo(playerInfo.id, {
          x: playerInfo.x,
          y: playerInfo.y,
        });
      }
    });

    // Handle player disconnection
    this.socket.on("playerDisconnected", (playerId: string) => {
      if (this.players[playerId]) {
        this.gridEngine.removeCharacter(playerId);
        this.players[playerId].destroy();
        delete this.players[playerId];
      }
    });
  }

  private addPlayer(playerInfo: any, isCurrentPlayer: boolean) {
    const sprite = this.add.sprite(25, 20, 'hero');
    this.players[playerInfo.id] = sprite;
  
    const characterConfig = {
      id: playerInfo.id,
      sprite: sprite,
      startPosition: { x: playerInfo.x, y: playerInfo.y },
      speed: 4,
      collides: true,
    };
  
    this.gridEngine.addCharacter(characterConfig);
  
    if (isCurrentPlayer) {
      this.cameras.main.startFollow(sprite, true);
      this.cameras.main.setFollowOffset(-sprite.width, -sprite.height);
    }
  }
  update() {
    const playerId = this.socket.id;
  
    if (!this.gridEngine.hasCharacter(playerId)) {
      console.log(`Character with ID ${playerId} does not exist in GridEngine`);
      return;
    }


    if (!this.gridEngine.isMoving(playerId)) {
        let moved = false;

        if (this.cursors.left.isDown) {
            console.log("Left key is down");
            this.gridEngine.move(playerId, Direction.LEFT);
            moved = true;
        } else if (this.cursors.right.isDown) {
            console.log("Right key is down");
            this.gridEngine.move(playerId, Direction.RIGHT);
            moved = true;
        } else if (this.cursors.up.isDown) {
            console.log("Up key is down");
            this.gridEngine.move(playerId, Direction.UP);
            moved = true;
        } else if (this.cursors.down.isDown) {
            console.log("Down key is down");
            this.gridEngine.move(playerId, Direction.DOWN);
            moved = true;
        } else {
            console.log("No movement keys are pressed");
        }
  
    // Listen for movement completion
    // if(moved){

      
    // }
  }
}}