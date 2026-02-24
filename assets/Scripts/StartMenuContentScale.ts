import { _decorator, Component, view, Node, Label } from "cc";
const { ccclass, property } = _decorator;

/**
 * 挂到 startMenu 节点上，使除 Bg 外的子节点（Button、Title、Step 等）按屏幕等比缩放，在移动端显示合适
 * 同时按比例放大所有 Label 的 fontSize
 */
@ccclass("StartMenuContentScale")
export class StartMenuContentScale extends Component {
  @property({ tooltip: "设计分辨率宽" })
  designWidth: number = 1280;

  @property({ tooltip: "设计分辨率高" })
  designHeight: number = 720;

  /** 设为 >0 时，用「屏幕高度/此值」算 scale，竖屏下菜单会明显放大。例如 720 时 2371 屏 scale≈3.3，再受 maxScale 限制 */
  @property({ tooltip: "内容参考高度，>0 时 scale=屏幕高/此值，竖屏下易放大（如填 720）" })
  contentReferenceHeight: number = 0;

  @property({ tooltip: "scale 上限，0=不限制；补偿 Canvas 时约 2.9，可设 3 或 0" })
  maxScale: number = 0;

  @property({
    tooltip: "缩放不小于此值，避免移动端变小（1=不缩小）",
  })
  minScale: number = 1;

  @property({ tooltip: "补偿 Canvas 缩放：scale=visibleSize/frameSize，让菜单在真机上显示正常大小" })
  compensateCanvasScale: boolean = true;

  @property({ tooltip: "最终缩放系数，<1 会变小，如 0.75 可缓解字体过大、被裁切" })
  scaleFactor: number = 0.8;

  @property({ tooltip: "不参与缩放的子节点名称（如 Bg）" })
  excludeNames: string[] = ["Bg"];

  @property({ tooltip: "真机调试时可勾选，控制台会打印 scale 与尺寸" })
  debugLog: boolean = false;

  private _originalFontSizes: Map<string, number> = new Map();

  onEnable() {
    this.scheduleOnce(() => this.applyScale(), 0.05);
  }

  start() {
    this.scheduleOnce(() => this.applyScale(), 0.1);
  }

  /** 供 GameManager 在显示 startMenu 时调用，确保真机生效 */
  public applyScale() {
    const visibleSize = view.getVisibleSize();
    const frameSize = view.getFrameSize();
    let scale: number;
    if (this.compensateCanvasScale && frameSize.width > 0 && frameSize.height > 0) {
      const scaleByW = visibleSize.width / frameSize.width;
      const scaleByH = visibleSize.height / frameSize.height;
      scale = Math.min(scaleByW, scaleByH);
    } else {
      const refH = this.contentReferenceHeight > 0 ? this.contentReferenceHeight : this.designHeight;
      const byHeight = visibleSize.height / refH;
      const byWidth = visibleSize.width / this.designWidth;
      scale = Math.min(byHeight, byWidth);
    }
    scale = Math.max(this.minScale, scale);
    if (this.maxScale > 0 && scale > this.maxScale) scale = this.maxScale;
    scale *= this.scaleFactor;

    if (this.debugLog) {
      console.log("[StartMenuContentScale] frameSize:", frameSize, "visibleSize:", visibleSize, "scale:", scale);
    }

    for (let i = 0; i < this.node.children.length; i++) {
      const child = this.node.children[i];
      if (this.excludeNames.indexOf(child.name) >= 0) continue;
      child.setScale(scale, scale, 1);
    }

    this.scaleLabelsInChildren(scale);
  }

  private scaleLabelsInChildren(scale: number) {
    for (let i = 0; i < this.node.children.length; i++) {
      const child = this.node.children[i];
      if (this.excludeNames.indexOf(child.name) >= 0) continue;
      this.scaleLabelsUnderNode(child, scale);
    }
  }

  private scaleLabelsUnderNode(node: Node, scale: number) {
    const label = node.getComponent(Label);
    if (label) {
      const key = node.uuid;
      if (!this._originalFontSizes.has(key)) {
        this._originalFontSizes.set(key, label.fontSize);
      }
      const original = this._originalFontSizes.get(key)!;
      label.fontSize = Math.round(original * scale);
    }
    for (let i = 0; i < node.children.length; i++) {
      this.scaleLabelsUnderNode(node.children[i], scale);
    }
  }
}
