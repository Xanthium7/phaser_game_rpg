import * as Phaser from "phaser";

export default class DialogueBox extends Phaser.GameObjects.Container {
  private text: Phaser.GameObjects.Text;
  private background: Phaser.GameObjects.Graphics;
  private isVisible: boolean = false;
  private spaceKey: Phaser.Input.Keyboard.Key;
  private typingSpeed: number = 30;
  private typingEvent?: Phaser.Time.TimerEvent;
  private fullText: string = "";
  private currentText: string = "";
  private typingIndex: number = 0;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number,
    height: number
  ) {
    super(scene, x, y);

    this.background = scene.add.graphics();
    this.background.fillStyle(0xffffff, 0.9);
    this.background.fillRoundedRect(0, 0, width, height, 20);
    this.background.lineStyle(2, 0x8f9da6, 1);
    this.background.strokeRoundedRect(0, 0, width, height, 20);
    this.add(this.background);

    this.text = scene.add.text(20, 20, "", {
      font: "18px Arial",
      fontStyle: "bold",
      fontFamily: "",
      color: "#000",
      wordWrap: { width: width - 40 },
      align: "left",
    });
    this.add(this.text);

    this.setSize(width, height);
    this.setVisible(false);
    this.setScrollFactor(0);
    this.setDepth(100);

    scene.add.existing(this);

    this.spaceKey = this.scene.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.SPACE
    );

    this.spaceKey.on("down", () => {
      if (Phaser.Input.Keyboard.JustDown(this.spaceKey) && this.isVisible) {
        if (this.typingEvent) {
          this.completeTyping();
        } else {
          this.hide();
        }
      }
    });

    this.scene.input.on("pointerdown", () => {
      if (this.isVisible) {
        if (this.typingEvent) {
          this.completeTyping();
        } else {
          this.hide();
        }
      }
    });
  }

  private onCloseCallback: (() => void) | null = null;

  public show(message: string, onClose?: () => void): void {
    if (this.isVisible) {
      return;
    }

    this.fullText = `${message}\n\nPress SPACE or Click to Continue.`;
    this.currentText = "";
    this.text.setText(this.currentText);
    this.setVisible(true);
    this.setAlpha(0);
    this.isVisible = true;
    this.typingIndex = 0;

    // Fade in the DialogueBox
    this.scene.tweens.add({
      targets: this,
      alpha: 1,
      duration: 50,
      ease: "Power2",
      onComplete: () => {
        this.startTyping();

        if (this.onCloseCallback) {
          this.onCloseCallback();
          this.onCloseCallback = null;
        }
      },
    });
  }

  private startTyping() {
    this.typingEvent = this.scene.time.addEvent({
      delay: this.typingSpeed,
      callback: this.typeNextLetter,
      callbackScope: this,
      loop: true,
    });
  }

  private typeNextLetter() {
    if (this.typingIndex < this.fullText.length) {
      this.currentText += this.fullText[this.typingIndex];
      this.text.setText(this.currentText);
      this.typingIndex++;
    } else {
      this.typingEvent?.remove(false);
      this.typingEvent = undefined;
    }
  }

  private completeTyping() {
    if (this.typingEvent) {
      this.typingEvent.remove(false);
      this.typingEvent = undefined;
      this.currentText = this.fullText;
      this.text.setText(this.currentText);
    }
  }

  public hide() {
    if (!this.isVisible) {
      return;
    }

    if (this.typingEvent) {
      this.typingEvent.remove(false);
      this.typingEvent = undefined;
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
