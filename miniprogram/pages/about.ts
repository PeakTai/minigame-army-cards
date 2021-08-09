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
  private intro: string = '这'

  protected init(): void {
    showLoading('加载中')
    Promise.resolve().then(async () => {
      const basis = Basis.getInstance();
      this.bgImg = await basis.loadImage('images/bg2.png')
      await this.render()
      hideLoading()
      // 让简介信息一点点显示出来
      const fullIntro = '一款充满童年回忆的军棋对战手牌游戏。手牌分为两类：人物和武器。人物按照职级上克下：司令 > 军长 > 师长'
        + ' > 旅长 > 团长 > 营长 > 连长 > 排长 > 班长 > 工兵 ，职级低的一方开牌后失去手牌，同级别同归于尽。' +
        '武器牌有两个：炸弹和地雷。炸弹克一切，遇到任何手牌都同归于尽。'
        + '地雷遇到工兵牌会被对方获得，遇到其它牌和炸弹一样。'
      for (let length = 1; length <= fullIntro.length; length++) {
        this.intro = fullIntro.substr(0, length)
        await this.render()
      }

    }).catch(showWarning)
      .finally(hideLoading)
  }

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
      width: this.getWidth() * 0.9,
      height: this.getHeight() * 0.1,
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
      height: this.getHeight() * 0.7,
      color: 'white',
      align: 'left',
      text: this.intro,
    }
    elements.push(intro)


    const back: ButtonElement = {
      type: 'button',
      top: this.getHeight() * 0.9,
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