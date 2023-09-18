import { declareModule, ModuleId, ModuleState } from "deps";

let _game: Phaser.Game;
let _logo: Phaser.Physics.Arcade.Image;

declareModule(
  ModuleId.Main,
  import.meta.url,
  [ModuleId.Phaser, ModuleId.Constants],
  ({ [ModuleId.Phaser]: Phaser, [ModuleId.Constants]: Constants }, state) => {
    console.log("Phaser version:", Phaser.VERSION);

    class Example extends Phaser.Scene {
      preload() {
        this.load.image("sky", "assets/space3.png");
        this.load.image("logo", "assets/phaser3-logo.png");
        this.load.image("red", "assets/red.png");
      }

      create() {
        this.add.image(400, 300, "sky");
        _logo = this.physics.add.image(400, 100, "logo");
        const emitter = this.add.particles(0, 0, "red", {
          speed: 100,
          scale: { start: 1, end: 0 },
          blendMode: Phaser.BlendModes.ADD,
        });


        emitter.startFollow(_logo);
        _game.events.emit("configure");
      }
    }

    if(state === ModuleState.UNLOADING) {
      _game.destroy(true);
    }

    if(state === ModuleState.LOADING) {
      _game = new Phaser.Game({
        type: Phaser.AUTO,
        width: 800,
        height: 800,
        physics: {
          default: "arcade",
          arcade: {
            gravity: { y: 200 },
          },
        },
        scene: Example,
      });
    }

    _game.events.on("configure", () => {
      _logo.setVelocity(Constants.LOGO_SPEED_X, Constants.LOGO_SPEED_Y);
      _logo.setBounce(1, 1);
      _logo.setCollideWorldBounds(true);
    })

    if(state === ModuleState.RELOADING_DEPS) {
      _game.events.emit("configure");
    }
  }
);
