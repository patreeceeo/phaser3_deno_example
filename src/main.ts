import { Phaser, importLocal, Dep } from "./deps.ts";

const Test = await importLocal(Dep.test);

console.log(Test.message);

console.log("Phaser version:", Phaser.VERSION);

class Example extends Phaser.Scene {
  preload () {
    this.load.image('sky', 'assets/space3.png');
    this.load.image('logo', 'assets/phaser3-logo.png');
    this.load.image('red', 'assets/red.png');
  }

  create () {
    this.add.image(400, 300, 'sky');
    const logo = this.physics.add.image(400, 100, 'logo');
    const emitter = this.add.particles(0, 0, 'red', {
      speed: 100,
      scale: { start: 1, end: 0 },
      blendMode: Phaser.BlendModes.ADD
    });

    logo.setVelocity(100, 200);
    logo.setBounce(1, 1);
    logo.setCollideWorldBounds(true);

    emitter.startFollow(logo);
  }
}

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 200 }
    }
  },
  scene: Example
};

new Phaser.Game(config);

