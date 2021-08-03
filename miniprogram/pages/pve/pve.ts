import Pager from "../../core/Pager";
import Basis from "../../core/basis";
import {Card, getAllCards} from "../../card/card";
import {RectBounding} from "../../core/RectBounding";
import {hideLoading, showLoading, showWarning} from "../../utils/message";
import InnerAudioContext = WechatMinigame.InnerAudioContext;

interface CardInfo extends Card {
  image: any
}

export default class Pve extends Pager {

  private ourSideCards: CardInfo[] = []
  private otherSideCards: Card[] = []
  private intervalId: number = 0
  private bgmAudio: InnerAudioContext | null = null

  destroy(): void {
    if (this.bgmAudio) {
      this.bgmAudio.pause()
    }
    if (this.intervalId) {
      clearInterval(this.intervalId)
    }
  }

  init(): void {
    showLoading('载入中...')
    Promise.resolve().then(async () => {
      const originCards = getAllCards()
      const cards: CardInfo[] = []
      for (let originCard of originCards) {
        const image = await this.loadImage(originCard.imageUrl)
        cards.push(Object.assign({}, originCard, {image}))
      }
      // 背景音乐
      this.bgmAudio = wx.createInnerAudioContext();
      this.bgmAudio.src = 'audio/bgm.mp3'
      this.bgmAudio.loop = true
      this.bgmAudio.play()
      this.ourSideCards = [...cards]
      this.otherSideCards = getAllCards()
      await this.render()
    }).catch((e) => {
      console.log(e)
      showWarning(e)
      clearInterval(this.intervalId)
    }).finally(hideLoading)
  }

  // public startContinuousRender() {
  //   this.intervalId = setInterval(() => {
  //     this.render().catch((e) => {
  //       showWarning(e)
  //       clearInterval(this.intervalId)
  //     })
  //   }, 16)
  // }


  async render(): Promise<void> {
    await this.renderBgImg('images/bg2.png')
    const basis = Basis.getInstance();
    const renderContext = basis.getRenderContext();
    renderContext.strokeStyle = '#000'
    renderContext.lineWidth = 2
    renderContext.shadowColor = 'grey'
    for (let index = 0; index < this.ourSideCards.length; index++) {
      const card = this.ourSideCards[index]
      const bounding = this.getOutsideCardRectBounding(index)
      renderContext.shadowOffsetX = -5
      renderContext.shadowOffsetY = -5
      renderContext.shadowBlur = 5
      renderContext.drawImage(card.image, bounding.left, bounding.top, bounding.width, bounding.height)
      renderContext.shadowOffsetX = 0
      renderContext.shadowOffsetY = 0
      renderContext.shadowBlur = 0
      renderContext.strokeRect(bounding.left, bounding.top, bounding.width, bounding.height)
    }
    // 我方手牌数量
    const tipTop = basis.convertPositionBottomToTop(
      this.getCardSize().height * 1.5 + basis.convertPercentageWidth(0.1)
    )
    renderContext.fillStyle = 'green'
    renderContext.font = `${basis.convertPercentageWidth(0.08)}px Arial`
    renderContext.fillText(
      `我方手牌剩余：${this.ourSideCards.length}`,
      basis.convertPercentageLeft(0.3),
      tipTop
    );

  }

  getCardSize(): { width: number, height: number } {
    const basis = Basis.getInstance();
    // 按照一行显示7张，来看每张牌的显示宽度
    // 每张牌被下一张牌盖住只显示四分之一宽度
    // 一张牌的宽度应该是 6*(1/4)+1 = 2.5
    const width = basis.convertPercentageWidth(1 / 2.5)
    const height = width * (4 / 3)
    return {width, height}
  }

  getOutsideCardRectBounding(index: number): RectBounding {
    const basis = Basis.getInstance();
    // 按照一行显示7张，来看每张牌的显示宽度
    // 每张牌被下一张牌盖住只显示四分之一宽度
    // 一张牌的宽度应该是 6*(1/4)+1 = 2.5
    const cardSize = this.getCardSize()
    const cardWidth = cardSize.width
    const cardHeight = cardSize.height
    const firstLineTop = basis.convertPositionBottomToTop(cardHeight * 1.5)
    const secondLineTop = basis.convertPositionBottomToTop(cardHeight)
    // 一行7张，下标小于7在第一行
    if (index < 7) {
      return new RectBounding(index * cardWidth * 0.25, firstLineTop, cardWidth, cardHeight);
    } else {
      return new RectBounding((index - 7) * cardWidth * 0.25, secondLineTop, cardWidth, cardHeight);
    }
  }

  getId(): string {
    return "pve";
  }
}