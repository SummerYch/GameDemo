import { _decorator, Component, view, UITransform } from "cc";
const { ccclass, property } = _decorator;

/** 挂到 Bg 节点上，使背景等比缩放、完整显示不裁切（Contain），宽度可限制为屏幕比例 */
@ccclass("BgFitContain")
export class BgFitContain extends Component {
  @property({ tooltip: "背景最大宽度占屏幕宽度的比例，1 为撑满" })
  widthRatio: number = 0.7;

  start() {
    const visibleSize = view.getVisibleSize();
    const ui = this.node.getComponent(UITransform);
    if (!ui) return;
    const w = ui.contentSize.width;
    const h = ui.contentSize.height;
    if (w <= 0 || h <= 0) return;
    const maxWidth = visibleSize.width * this.widthRatio;
    const sx = maxWidth / w;
    const sy = visibleSize.height / h;
    const scale = Math.min(sx, sy);
    this.node.setScale(scale, scale, 1);
  }
}
