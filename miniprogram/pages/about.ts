import Pager from "../core/Pager";
import {ButtonElement, Element, ImageElement, TextElement} from "../core/element";
import {hideLoading, showLoading, showWarning} from "../utils/message";
import Basis from "../core/basis";
import PagerManager from "../core/PagerManager";

export default class About extends Pager {

  protected destroy(): void {

  }

  getId(): string {
    return "about";
  }

  private bgImg: any = null;
  private intro: string = '这是一款很好玩的游戏，你玩过了就知道了，这是一款很好玩的游戏，你玩过了就知道了，这是一款很好玩的游戏，你玩过了就知道了，这是一款很好玩的游戏，你玩过了就知道了，这是一款很好玩的游戏，你玩过了就知道了，这是一款很好玩的游戏，你玩过了就知道了，'

  protected init(): void {
    showLoading('加载中')
    Promise.resolve().then(async () => {
      const basis = Basis.getInstance();
      this.bgImg = await basis.loadImage('images/bg2.png')
      this.render()
    }).catch(showWarning)
      .finally(hideLoading)
  }

  // 手机上很卡，放弃了
  // showIntroGradually() {
  //   Promise.resolve().then(async () => {
  //     const introEl = this.getElementById('intro')
  //     if (!introEl) {
  //       return
  //     }
  //     const textEl = introEl as TextElement
  //     while (true) {
  //       if (textEl.text.length >= this.intro.length) {
  //         return
  //       }
  //       await sleep(100)
  //       const length = textEl.text.length + 1
  //       textEl.text = this.intro.substr(0, length)
  //       this.render()
  //     }
  //   }).catch(showWarning)
  // }

  backToIndex() {
    PagerManager.getInstance().switchToPager('index')
  }

  protected buildElements(): Element[] {
    const elements: Element[] = []
    const bg: ImageElement = {
      type: "image",
      image: this.bgImg,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0
    }
    elements.push(bg)
    const title: TextElement = {
      type: "text",
      top: this.getHeight() * 0.1,
      left: this.getWidth() * 0.05,
      width: this.getWidth() * 0.8,
      height: this.getWidth() * 0.1,
      fontSize: this.getWidth() * 0.08,
      lineHeight: this.getWidth() * 0.1,
      color: 'white',
      align: 'left',
      text: '军棋对战牌',
    }
    elements.push(title)
    const intro: TextElement = {
      type: 'text',
      top: this.getHeight() * 0.2,
      left: this.getWidth() * 0.05,
      width: this.getWidth() * 0.9,
      fontSize: this.getWidth() * 0.05,
      lineHeight: this.getWidth() * 0.1,
      height: this.getHeight() * 0.6,
      color: 'white',
      align: 'left',
      text: this.intro,
    }

    elements.push(intro)

    const back: ButtonElement = {
      type: 'button',
      bottom: this.getHeight() * 0.2,
      left: this.getWidth() * 0.05,
      width: this.getWidth() * 0.9,
      fontSize: this.getWidth() * 0.05,
      height: this.getWidth() * 0.12,
      text: '返回菜单',
      color: 'white',
      bgColor: 'rgba(0 ,0 ,0, 0.7)',
      onclick: this.backToIndex
    }
    elements.push(back)
    return elements;
  }

}