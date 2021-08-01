import Pager from "../core/Pager";
import {showSuccess, showWarning} from "../utils/message";
import Basis from "../core/basis";
import {RectBounding} from "../core/RectBounding";
import OnTouchStartCallbackResult = WechatMinigame.OnTouchStartCallbackResult;

let touchStartHandler: any = null

/**
 * 首页.
 */
export default class Index extends Pager {

  private buttons: string[] = ['人机对战', '蓝牙对战', '在线对战']

  destroy(): void {
    if (touchStartHandler) {
      wx.offTouchStart(this.handleTouch)
    }
  }

  init(): void {
    Promise.resolve().then(async () => {
      await this.renderBgImg('images/bg1.jpg')
      for (let i = 0; i < this.buttons.length; i++) {
        this.renderButton(i)
      }
      touchStartHandler = (e: OnTouchStartCallbackResult) => {
        this.handleTouch(e)
      }
      wx.onTouchStart(touchStartHandler)
    }).catch(showWarning)
  }

  private renderButton(index: number): void {
    const buttonText = this.buttons[index]
    const bounding = this.getButtonBounding(index)
    const basis = Basis.getInstance();
    const renderContext = basis.getRenderContext();
    renderContext.fillStyle = '#fff'
    renderContext.font = `${bounding.height}px Arial`
    renderContext.textBaseline = 'top'
    renderContext.fillText(
      buttonText,
      // 给右边留10像素间隔
      bounding.left,
      bounding.top
    );
    renderContext.stroke()
  }

  /**
   * 获取按钮的边界信息.
   * @param index
   * @private
   */
  private getButtonBounding(index: number): RectBounding {
    const basis = Basis.getInstance();
    // 按钮的文字大小定为宽度的百分之8
    const fontSize = basis.convertPercentageWidth(0.08)
    const renderContext = basis.getRenderContext();
    renderContext.font = `${fontSize}px Arial`
    const buttonText = this.buttons[index]
    const buttonWidth = renderContext.measureText(buttonText).width
    const left = basis.convertPositionRightToLeft(buttonWidth) - 10
    const lineHeight = basis.convertPercentageWidth(0.15)
    const top = basis.convertPercentageTop(0.3) + (index * lineHeight)
    return {left, top, width: buttonWidth, height: fontSize}
  }

  //  (result: OnTouchStartCallbackResult) => void
  private handleTouch(result: OnTouchStartCallbackResult): void {
    if (!result.touches || !result.touches.length) {
      return
    }
    const touch = result.touches[0]
    // 判断是点击了哪个按钮
    let touchButtonIndex: number = -1
    for (let i = 0; i < this.buttons.length; i++) {
      const bounding = this.getButtonBounding(i);
      if (touch.clientX >= bounding.left
        && touch.clientX <= bounding.width + bounding.left
        && touch.clientY >= bounding.top
        && touch.clientY <= bounding.top + bounding.height) {
        touchButtonIndex = i
        break
      }
    }
    if (touchButtonIndex === -1) {
      return;
    }
    showSuccess(this.buttons[touchButtonIndex])
  }
}