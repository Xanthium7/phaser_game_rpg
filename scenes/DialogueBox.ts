import Phaser from "phaser";

export default class DialogueBox extends Phaser.GameObjects.Container {
  private text: Phaser.GameObjects.Text;
  private background: Phaser.GameObjects.Graphics;
  private isVisible: boolean = false;
  private spaceKey: Phaser.Input.Keyboard.Key;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number,
    height: number
  ) {
    super(scene, x, y);

    this.background = scene.add.graphics();
    this.background.fillStyle(0xffffff, 0.7);
    this.background.fillRoundedRect(0, 0, width, height, 20);
    this.background.lineStyle(2, 0x8f9da6, 1);
    this.background.strokeRoundedRect(0, 0, width, height, 20);
    this.add(this.background);

    this.text = scene.add.text(20, 20, "", {
      font: "18px Arial",
      color: "#000",
      wordWrap: { width: width - 40 },
      align: "left",
    });
    this.add(this.text);

    this.setSize(width, height);
    this.setVisible(false); // initially hidden
    this.setScrollFactor(0);
    this.setDepth(100);

    scene.add.existing(this);

    this.spaceKey = this.scene.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.SPACE
    );

    this.spaceKey.on("down", () => {
      if (Phaser.Input.Keyboard.JustDown(this.spaceKey) && this.isVisible) {
        this.hide();
      }
    });

    this.scene.input.on("pointerdown", () => {
      if (this.isVisible) {
        this.hide();
      }
    });
  }
  public show(message: string) {
    if (this.isVisible) {
      return;
    }

    this.text.setText(`${message}\n\nPress SPACE or Click to Continue.`);
    this.setVisible(true);
    this.setAlpha(0);
    this.isVisible = true;

    // Fade in the DialogueBox
    this.scene.tweens.add({
      targets: this,
      alpha: 1,
      duration: 50,
      ease: "Power2",
    });
  }

  public hide() {
    if (!this.isVisible) {
      return;
    }

    // Fade out the DialogueBox
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      duration: 50,
      ease: "Power2",
      onComplete: () => {
        this.setVisible(false);
        this.text.setText("");
        this.isVisible = false;
      },
    });
  }
}
