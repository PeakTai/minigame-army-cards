import Pager from "../core/Pager";
import {showSuccess, showWarning} from "../utils/message";
import Basis from "../core/basis";
import PagerManager from "../core/PagerManager";
import {Element, ImageElement, TextElement} from "../core/element";
import {playAudio} from "../utils/audio";
import {sleep} from "../utils/sleep";

/**
 * 首页.
 */
export default class Index extends Pager {

  private buttons: string[] = ['人机对战', '蓝牙对战', '在线对战', '游戏设置', '关于游戏']
  private bgImg: any = null

  destroy(): void {

  }

  init(): void {
    Promise.resolve().then(async () => {
      const basis = Basis.getInstance();
      this.bgImg = await basis.loadImage('images/bg1.jpg')
      await this.render()
    }).catch(showWarning)
  }

  private handleTouchButton(btnIdx: number): void {
    const button = this.buttons[btnIdx]
    if (!button) {
      return
    }
    if (button === '关于游戏') {
      PagerManager.getInstance().switchToPager('about')
      return;
    }
    if (button === '人机对战') {
      Promise.resolve().then(async () => {
        playAudio('audio/开始游戏.mp3')
        await sleep(800)
        PagerManager.getInstance().switchToPager('pve')
      }).catch(showWarning)
      return;
    }
    if (button === '游戏设置') {
      PagerManager.getInstance().switchToPager('setting')
      return;
    }
    showSuccess(button)
  }

  getId(): string {
    return 'index'
  }

  protected buildElements(): Element[] {
    const elements: Element[] = []
    // 背景
    const bg: ImageElement = {
      type: 'image',
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      image: this.bgImg
    }
    elements.push(bg)
    for (let i = 0; i < this.buttons.length; i++) {
      const lineHeight = this.getWidth() * 0.12
      const fontSize = this.getWidth() * 0.08
      const textElement: TextElement = {
        type: 'text',
        color: 'white',
        text: this.buttons[i],
        fontSize,
        lineHeight,
        right: this.getWidth() * 0.05,
        align: 'right',
        top: this.getHeight() * 0.3 + i * lineHeight,
        height: lineHeight,
        width: fontSize * this.buttons[i].length + 10,// 多预留一点空间，防止不够，有时候不会刚刚好的
        onclick: () => this.handleTouchButton(i)
      }
      elements.push(textElement)
    }
    return elements;
  }
}