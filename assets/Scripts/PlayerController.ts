import { _decorator, Component, Vec3, EventMouse, input, Input } from "cc";
import { Animation } from "cc";
const { ccclass, property } = _decorator;

export const BLOCK_SIZE = 40;

@ccclass("PlayerController")
export class PlayerController extends Component {
  @property(Animation)
  BodyAnim: Animation = null;
  @property
  autoJumpDelay: number = 0.5;
  @property
  pitJumpTimeout: number = 1.5;
  @property({ tooltip: "跳跃位移时长（秒）" })
  jumpDuration: number = 0.15;
  @property({ tooltip: "动画播放倍速，越大越快" })
  animationSpeed: number = 2;
  private _startJump: boolean = false;
  private _jumpStep: number = 0;
  private _curJumpTime: number = 0;
  private _jumpTime: number = 0.15;
  private _curJumpSpeed: number = 0;
  private _curPos: Vec3 = new Vec3();
  private _deltaPos: Vec3 = new Vec3(0, 0, 0);
  private _targetPos: Vec3 = new Vec3();
  private _curMoveIndex: number = 0;
  private _pitJumpMode: boolean = false;

  start() {}

  setInputActive(active: boolean) {
    if (active) {
      input.on(Input.EventType.MOUSE_UP, this.onMouseUp, this);
    } else {
      input.off(Input.EventType.MOUSE_UP, this.onMouseUp, this);
      this.exitPitJumpMode();
    }
  }

  reset() {
    this._curMoveIndex = 0;
    this._pitJumpMode = false;
    this.unschedule(this.onPitTimeout);
    this.node.getPosition(this._curPos);
    this._targetPos.set(0, 0, 0);
  }

  getCurMoveIndex(): number {
    return this._curMoveIndex;
  }

  /** 进入坑前等待点击模式，超时未点击则掉入坑中 */
  enterPitJumpMode() {
    this._pitJumpMode = true;
    this.setInputActive(true);
    this.scheduleOnce(this.onPitTimeout, this.pitJumpTimeout);
  }

  exitPitJumpMode() {
    this._pitJumpMode = false;
    this.unschedule(this.onPitTimeout);
  }

  private onPitTimeout = () => {
    this.exitPitJumpMode();
    this.jumpByStep(1);
  };

  /** 执行一次自动跳（1格） */
  doAutoJump() {
    this.jumpByStep(1);
  }

  onMouseUp(event: EventMouse) {
    if (!this._pitJumpMode) return;
    this.exitPitJumpMode();
    this.jumpByStep(2);
  }

  jumpByStep(step: number) {
    if (this._startJump) {
      return;
    }
    this._startJump = true;
    this._jumpStep = step;
    this._curJumpTime = 0;
    this._jumpTime = this.jumpDuration;
    this._curJumpSpeed = (this._jumpStep * BLOCK_SIZE) / this._jumpTime;
    this.node.getPosition(this._curPos);
    Vec3.add(
      this._targetPos,
      this._curPos,
      new Vec3(this._jumpStep * BLOCK_SIZE, 0, 0)
    );

    if (this.BodyAnim) {
      const clipName = step === 1 ? "oneStep" : "twoStep";
      this.BodyAnim.play(clipName);
      const state = this.BodyAnim.getState(clipName);
      if (state) {
        state.speed = this.animationSpeed;
      }
    }

    this._curMoveIndex += step;
  }

  update(deltaTime: number) {
    if (this._startJump) {
      this._curJumpTime += deltaTime;
      if (this._curJumpTime > this._jumpTime) {
        // end
        this.node.setPosition(this._targetPos);
        this._startJump = false;
        this.onOnceJumpEnd();
      } else {
        // tween
        this.node.getPosition(this._curPos);
        this._deltaPos.x = this._curJumpSpeed * deltaTime;
        Vec3.add(this._curPos, this._curPos, this._deltaPos);
        this.node.setPosition(this._curPos);
      }
    }
  }
  onOnceJumpEnd() {
    this.node.emit("JumpEnd", this._curMoveIndex);
  }
}
