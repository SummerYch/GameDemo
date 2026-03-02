import {
  _decorator,
  Component,
  Prefab,
  CCInteger,
  instantiate,
  Node,
  Label,
  Vec3,
  sys,
  UITransform,
  view,
  Color,
  Widget,
} from "cc";
import { BLOCK_SIZE, PlayerController } from "./PlayerController";
import { StartMenuContentScale } from "./StartMenuContentScale";
const { ccclass, property } = _decorator;

const ENERGY_STORAGE_KEY = "game_energy";
const INITIAL_ENERGY = 999;

enum BlockType {
  BT_NONE,
  BT_STONE,
}
enum GameState {
  GS_INIT,
  GS_PLAYING,
  GS_END,
}

/** StartMenu 下 gettili、next 节点，初始隐藏，过关后显示 */
const START_MENU_END_BUTTON_NAMES = ["gettili", "next"];

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
  @property({ type: Label, tooltip: "可选，不绑定则运行时在左上角自动创建" })
  public energyLabel: Label | null = null; // 体力显示（左上角）

  private _curState: GameState = GameState.GS_INIT;
  private _energy: number = INITIAL_ENERGY;
  /** 本局是否到达终点过关（用于区分过关后弹菜单 vs 掉坑结束） */
  private _reachedFinish: boolean = false;

  onLoad() {
    // 尽早隐藏获得体力、下一关按钮，避免第一帧显示
    this.updateStartMenuEndButtons(false);
  }

  //   start() {
  //     this.generateRoad();
  //   }
  start() {
    this.loadEnergy();
    this.ensureEnergyLabel();
    this.refreshEnergyDisplay();
    this.setCurState(GameState.GS_INIT);
    this.playerCtrl?.node.on("JumpEnd", this.onPlayerJumpEnd, this);
    this.playerCtrl?.node.on("ManualJump", this.onManualJump, this);
  }

  private loadEnergy() {
    this._energy = INITIAL_ENERGY;
    if (sys.localStorage) {
      const saved = sys.localStorage.getItem(ENERGY_STORAGE_KEY);
      if (saved != null && saved !== "") {
        const n = parseInt(saved, 10);
        if (!isNaN(n) && n >= 0) this._energy = n;
      }
      // this._energy = Math.max(this._energy, INITIAL_ENERGY);
      // sys.localStorage.setItem(ENERGY_STORAGE_KEY, String(this._energy));
    }
  }

  private saveEnergy() {
    if (sys.localStorage) {
      sys.localStorage.setItem(ENERGY_STORAGE_KEY, String(this._energy));
    }
  }

  private ensureEnergyLabel() {
    if (this.energyLabel) return;
    const parent = this.node.scene.getChildByName("UICanvas");
    if (!parent) return;
    const energyNode = new Node("Energy");
    energyNode.layer = parent.layer;
    parent.addChild(energyNode);
    const ut = energyNode.addComponent(UITransform);
    ut.setAnchorPoint(0, 1);
    ut.setContentSize(160, 50);
    const widget = energyNode.addComponent(Widget);
    widget.isAlignTop = true;
    widget.isAlignLeft = true;
    widget.top = 30;
    widget.left = 30;
    widget.updateAlignment();
    this.energyLabel = energyNode.addComponent(Label);
    this.energyLabel.string = "";
    this.energyLabel.fontSize = 28;
    this.energyLabel.color = new Color(255, 255, 255, 255);
  }

  private refreshEnergyDisplay() {
    if (this.energyLabel) {
      this.energyLabel.string = `x ${this._energy}`;
    }
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
      this.updateStartMenuEndButtons(false); // 初始隐藏获得体力、下一关
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
    if (this._energy <= 0) return;
    if (this._curState === GameState.GS_END) {
      this.init();
    }
    this._energy--;
    this.saveEnergy();
    this.refreshEnergyDisplay();
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
          this.playerCtrl.setInputActive(false);
          this.scheduleOnce(() => {
            this.playerCtrl!.setInputActive(true);
            this.scheduleOnce(this._doAutoJump, this.playerCtrl!.autoJumpDelay);
          }, 0);
        }
        break;
      case GameState.GS_END:
        this.unschedule(this._doAutoJump);
        if (this.playerCtrl) {
          this.playerCtrl.setInputActive(false);
        }
        this.refreshEnergyDisplay();
        if (this.startMenu) {
          this.startMenu.active = true;
          this.scheduleOnce(() => {
            this.updateStartMenuEndButtons(this._reachedFinish); // 过关则显示 gettili、next（延后一帧确保菜单已激活）
            this.startMenu?.getComponent(StartMenuContentScale)?.applyScale();
          }, 0.05);
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
    // 仅仍在游戏中且未掉坑时安排下一次自动跳；过关后不再跳
    if (
      this.playerCtrl &&
      this._curState === GameState.GS_PLAYING &&
      moveIndex < this.roadLength &&
      this._road[moveIndex] !== BlockType.BT_NONE
    ) {
      this.scheduleOnce(this._doAutoJump, this.playerCtrl.autoJumpDelay);
    }
  }
  checkResult(moveIndex: number) {
    const lastIndex = this.roadLength - 1;
    if (moveIndex <= lastIndex) {
      if (this._road[moveIndex] == BlockType.BT_NONE) {
        this._reachedFinish = false; // 掉坑
        this.setCurState(GameState.GS_END);
      } else if (moveIndex === lastIndex) {
        // 落在最后一格，视为到达终点过关
        this._reachedFinish = true;
        this.setCurState(GameState.GS_END);
      }
    } else {
      // 跳过了最后一格（moveIndex >= roadLength），也视为过关
      this._reachedFinish = true;
      this.setCurState(GameState.GS_END);
    }
  }

  /** 显示/隐藏 StartMenu 下的「获得体力」「下一关」等按钮（递归查找子节点） */
  private updateStartMenuEndButtons(show: boolean) {
    if (!this.startMenu) return;
    for (const name of START_MENU_END_BUTTON_NAMES) {
      const btn = this.findChildByName(this.startMenu, name);
      if (btn) btn.active = show;
    }
  }

  /** 在节点及其子孙中按名称查找（getChildByName 只查直接子节点） */
  private findChildByName(root: Node, name: string): Node | null {
    if (root.name === name) return root;
    for (let i = 0; i < root.children.length; i++) {
      const found = this.findChildByName(root.children[i], name);
      if (found) return found;
    }
    return null;
  }
}
