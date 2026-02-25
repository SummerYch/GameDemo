import { _decorator, Component, view, UITransform, Node, Vec3 } from "cc";
const { ccclass, property } = _decorator;

/**
 * 挂到 GameBg 节点上，按设备实际屏幕（frame）全屏适配。竖屏 + 设计分辨率 1280×720 时按设计分辨率换算铺满。
 * - Cover：填满整块屏幕无黑边（可能裁切）
 * - Contain：完整显示在屏幕内（可能留黑边）
 * - 将「跟随相机」指向 Player 下的 Camera，每帧把背景位置同步到相机，不随玩家跳跃移动，且仍留在 Canvas 下不会被 Body 挡住。
 */
@ccclass("GameBgFit")
export class GameBgFit extends Component {
  @property({
    tooltip: "Cover=填满屏幕无黑边（可能裁切）；Contain=完整显示（可能留黑边）",
  })
  mode: "cover" | "contain" = "cover";

  @property({ tooltip: "设计分辨率宽（竖屏时与引擎一致即可，如 1280）" })
  designWidth: number = 1280;

  @property({ tooltip: "设计分辨率高（竖屏时与引擎一致即可，如 720）" })
  designHeight: number = 720;

  @property({
    type: Node,
    tooltip: "指定 Camera 节点后，每帧将背景位置同步到相机，背景不随玩家移动；GameBg 保持在 Canvas 下且排在首位即可在 Body 后面",
  })
  followCamera: Node | null = null;

  private _camPos = new Vec3();

  start() {
    // 保持在 Canvas 下且排在首位，这样会先于 Player/Body 渲染，不会被挡住
    if (this.node.parent && this.node.getSiblingIndex() !== 0) {
      this.node.setSiblingIndex(0);
    }
    this.scheduleOnce(() => this.applyFit(), 0);
  }

  lateUpdate(dt: number) {
    if (!this.followCamera) return;
    this.followCamera.getWorldPosition(this._camPos);
    this.node.setWorldPosition(this._camPos);
  }

  /** 按 frame 与设计分辨率（含竖屏 1280×720）换算，使背景铺满整块屏幕 */
  public applyFit() {
    const frameSize = view.getFrameSize();
    const ui = this.node.getComponent(UITransform);
    if (!ui) return;
    const w = ui.contentSize.width;
    const h = ui.contentSize.height;
    if (w <= 0 || h <= 0) return;

    let needW: number;
    let needH: number;
    const scaleX = view.getScaleX();
    const scaleY = view.getScaleY();
    if (scaleX > 0 && scaleY > 0) {
      needW = frameSize.width / scaleX;
      needH = frameSize.height / scaleY;
    } else {
      // 备用：用设计分辨率算（竖屏 1280×720 时 frame 为 宽×高 如 720×1280）
      const designW = this.designWidth;
      const designH = this.designHeight;
      const canvasScale = Math.min(
        frameSize.width / designW,
        frameSize.height / designH
      );
      if (canvasScale <= 0) return;
      needW = frameSize.width / canvasScale;
      needH = frameSize.height / canvasScale;
    }

    const sx = needW / w;
    const sy = needH / h;
    const scale = this.mode === "cover" ? Math.max(sx, sy) : Math.min(sx, sy);
    this.node.setScale(scale, scale, 1);
  }
}
