import {
  _decorator,
  Component,
  Prefab,
  CCInteger,
  instantiate,
  Node,
  Label,
  Vec3,
} from "cc";
import { BLOCK_SIZE, PlayerController } from "./PlayerController";
const { ccclass, property } = _decorator;

enum BlockType {
  BT_NONE,
  BT_STONE,
}
enum GameState {
  GS_INIT,
  GS_PLAYING,
  GS_END,
}
@ccclass("GameManager")
export class GameManager extends Component {
  @property({ type: Prefab })
  public boxPrefab: Prefab | null = null;
  @property({ type: CCInteger })
  public roadLength: number = 50;
  private _road: BlockType[] = [];
  @property({ type: Node })
  public startMenu: Node | null = null; // 开始的 UI
  @property({ type: PlayerController })
  public playerCtrl: PlayerController | null = null; // 角色控制器
  @property({ type: Label })
  public stepsLabel: Label | null = null; // 计步器

  private _curState: GameState = GameState.GS_INIT;

  //   start() {
  //     this.generateRoad();
  //   }
  start() {
    this.setCurState(GameState.GS_INIT);
    this.playerCtrl?.node.on("JumpEnd", this.onPlayerJumpEnd, this);
    this.playerCtrl?.node.on("ManualJump", this.onManualJump, this);
  }

  private _doAutoJump = () => {
    this.playerCtrl?.doAutoJump();
  };

  onManualJump() {
    this.unschedule(this._doAutoJump);
  }
  init() {
    if (this.startMenu) {
      this.startMenu.active = true;
    }

    this.generateRoad();

    if (this.playerCtrl) {
      this.playerCtrl.setInputActive(false);
      this.playerCtrl.node.setPosition(Vec3.ZERO);
      this.playerCtrl.reset();
    }
  }
  generateRoad() {
    this.node.removeAllChildren();

    this._road = [];
    // startPos
    this._road.push(BlockType.BT_STONE);

    for (let i = 1; i < this.roadLength; i++) {
      if (i < 5) {
        this._road.push(BlockType.BT_STONE);
      } else if (this._road[i - 1] === BlockType.BT_NONE) {
        this._road.push(BlockType.BT_STONE);
      } else {
        this._road.push(Math.floor(Math.random() * 2));
      }
    }

    for (let j = 0; j < this._road.length; j++) {
      let block: Node | null = this.spawnBlockByType(this._road[j]);
      if (block) {
        this.node.addChild(block);
        block.setPosition(j * BLOCK_SIZE, 0, 0);
      }
    }
  }
  spawnBlockByType(type: BlockType) {
    if (!this.boxPrefab) {
      return null;
    }

    let block: Node | null = null;
    switch (type) {
      case BlockType.BT_STONE:
        block = instantiate(this.boxPrefab);
        break;
    }

    return block;
  }
  onStartButtonClicked() {
    if (this._curState === GameState.GS_END) {
      this.init();
    }
    this.setCurState(GameState.GS_PLAYING);
  }
  setCurState(value: GameState) {
    this._curState = value;
    switch (value) {
      case GameState.GS_INIT:
        this.init();
        break;
      case GameState.GS_PLAYING:
        if (this.startMenu) {
          this.startMenu.active = false;
        }

        if (this.stepsLabel) {
          this.stepsLabel.string = "0";
        }

        if (this.playerCtrl) {
          this.playerCtrl.setInputActive(true);
          this.scheduleOnce(this._doAutoJump, 0.2);
        }
        break;
      case GameState.GS_END:
        this.unschedule(this._doAutoJump);
        if (this.playerCtrl) {
          this.playerCtrl.setInputActive(false);
        }
        if (this.startMenu) {
          this.startMenu.active = true;
        }
        break;
    }
  }
  onPlayerJumpEnd(moveIndex: number) {
    if (this.stepsLabel) {
      this.stepsLabel.string =
        "" + (moveIndex >= this.roadLength ? this.roadLength : moveIndex);
    }
    this.checkResult(moveIndex);
    if (
      this.playerCtrl &&
      moveIndex < this.roadLength &&
      this._road[moveIndex] !== BlockType.BT_NONE
    ) {
      const nextBlock = this._road[moveIndex + 1];
      if (nextBlock === BlockType.BT_NONE) {
        this.playerCtrl.enterPitJumpMode();
      } else {
        this.scheduleOnce(this._doAutoJump, this.playerCtrl.autoJumpDelay);
      }
    }
  }
  checkResult(moveIndex: number) {
    if (moveIndex < this.roadLength) {
      if (this._road[moveIndex] == BlockType.BT_NONE) {
        this.setCurState(GameState.GS_END);
      }
    } else {
      this.setCurState(GameState.GS_INIT);
    }
  }
}
