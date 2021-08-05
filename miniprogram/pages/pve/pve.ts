import Pager from "../../core/Pager";
import Basis from "../../core/basis";
import {Card, getAllCards} from "../../card/card";
import {RectBounding} from "../../core/RectBounding";
import {hideLoading, showLoading, showWarning} from "../../utils/message";
import InnerAudioContext = WechatMinigame.InnerAudioContext;
import OnTouchStartCallbackResult = WechatMinigame.OnTouchStartCallbackResult;
import {sleep} from "../../utils/sleep";
import {execTimer} from "../../utils/timer";
import {buildAudio, playAudio, playAudioInBackground} from "../../utils/audio";

let touchStartHandler: any = null

interface CardInfo extends Card {
  image: any
}

export default class Pve extends Pager {

  // private ourSideCards: CardInfo[] = []
  // private otherSideCards: Card[] = []
  // private intervalId: number = 0
  // private bgmAudio: InnerAudioContext | null = null
  // // 爆炸特效的几帧动画图片
  // private explosionFrames: any[] = []
  // // 爆炸帧，有值表示要显示
  // private explosionFrame: any = null;
  // private explosionAudio = buildAudio('audio/boom.mp3')
  // // 状态：等待我方出牌，等待对方出牌，出提示，胜利，结束，异常，加载中
  // private status: 'wait_for_our_play' | 'wait_for_other_play' | 'prompt' | 'victory' | 'defeat' | 'loading' | 'error'
  //   = 'wait_for_our_play'
  // private loadingText: string = '加载中...'
  //
  // destroy(): void {
  //   this.stopContinuousRender()
  //   if (this.bgmAudio) {
  //     this.bgmAudio.pause()
  //   }
  //   if (this.intervalId) {
  //     clearInterval(this.intervalId)
  //   }
  // }
  //
  // showLoading() {
  //   this.status = 'loading'
  //   // 为了有动态效果，不停的变幻
  //   execTimer(async () => {
  //     await sleep(100)
  //     this.loadingText = '资源加载中.'
  //     await sleep(100)
  //     this.loadingText = '资源加载中..'
  //     await sleep(100)
  //     this.loadingText = '资源加载中...'
  //     await sleep(100)
  //     this.loadingText = '资源加载中....'
  //   }, () => this.status == 'loading', 400)
  // }
  //
  // /**
  //  * 显示爆炸.
  //  */
  // showBoom() {
  //   execTimer(async () => {
  //     this.explosionAudio.play()
  //     for (let explosionFrame of this.explosionFrames) {
  //       this.explosionFrame = explosionFrame
  //       await sleep(50)
  //     }
  //     await sleep(50)
  //     this.explosionFrame = null
  //   }, () => !!this.explosionFrame, 1100)
  // }
  //
  // init(): void {
  //   Promise.resolve().then(async () => {
  //     const basis = Basis.getInstance();
  //     this.showLoading()
  //     this.startContinuousRender()
  //     // 手牌素材加载
  //     const originCards = getAllCards()
  //     const cards: CardInfo[] = []
  //     for (let originCard of originCards) {
  //       const image = await basis.loadImage(originCard.imageUrl)
  //       cards.push(Object.assign({}, originCard, {image}))
  //     }
  //     this.ourSideCards = [...cards]
  //     this.otherSideCards = getAllCards()
  //     // 背景音乐
  //     if (!this.bgmAudio) {
  //       this.bgmAudio = wx.createInnerAudioContext();
  //       this.bgmAudio.src = 'audio/bgm.mp3'
  //       this.bgmAudio.loop = true
  //       this.bgmAudio.play()
  //     }
  //     // 爆炸素材
  //     this.explosionFrames = []
  //     for (let i = 0; i < 19; i++) {
  //       const img = await basis.loadImage(`images/explosion${(i + 1)}.png`)
  //       this.explosionFrames.push(img)
  //     }
  //     // 都准务完成了，等待我方出牌
  //     this.status = 'wait_for_our_play'
  //     // 触控事件处理
  //     touchStartHandler = (e: OnTouchStartCallbackResult) => {
  //       this.handleTouch(e)
  //     }
  //     wx.onTouchStart(touchStartHandler)
  //   }).catch((e) => {
  //     console.log(e)
  //     showWarning(e)
  //     clearInterval(this.intervalId)
  //   })
  // }
  //
  // public startContinuousRender() {
  //   this.intervalId = setInterval(() => {
  //     this.render().catch((e) => {
  //       showWarning(e)
  //       clearInterval(this.intervalId)
  //     })
  //   }, 16)
  // }
  //
  //
  // stopContinuousRender(): void {
  //   if (this.intervalId) {
  //     clearInterval(this.intervalId)
  //   }
  // }
  //
  // async render(): Promise<void> {
  //   const basis = Basis.getInstance();
  //   // 显示 loading 状态
  //   if (this.status === "loading") {
  //     basis.renderBgColor('white')
  //     // 在屏幕中央显示一个加载中的文字
  //     basis.fillTextInCenter(this.loadingText, basis.convertPercentageWidth(0.1), 'black')
  //     return
  //   }
  //
  //   await basis.renderBgImg('images/bg2.png')
  //   const renderContext = basis.getRenderContext();
  //   renderContext.strokeStyle = '#000'
  //   renderContext.lineWidth = 2
  //   renderContext.shadowColor = 'grey'
  //   for (let index = 0; index < this.ourSideCards.length; index++) {
  //     const card = this.ourSideCards[index]
  //     const bounding = this.getOutsideCardRectBounding(index)
  //     renderContext.shadowOffsetX = -5
  //     renderContext.shadowOffsetY = -5
  //     renderContext.shadowBlur = 5
  //     renderContext.drawImage(card.image, bounding.left, bounding.top, bounding.width, bounding.height)
  //     renderContext.shadowOffsetX = 0
  //     renderContext.shadowOffsetY = 0
  //     renderContext.shadowBlur = 0
  //     renderContext.strokeRect(bounding.left, bounding.top, bounding.width, bounding.height)
  //   }
  //   // 我方手牌数量
  //   const tipTop = basis.convertPositionBottomToTop(
  //     this.getCardSize().height * 1.5 + basis.convertPercentageWidth(0.1)
  //   )
  //   renderContext.fillStyle = 'green'
  //   renderContext.font = `${basis.convertPercentageWidth(0.08)}px Arial`
  //   renderContext.fillText(
  //     `我方手牌剩余：${this.ourSideCards.length}`,
  //     basis.convertPercentageLeft(0.3),
  //     tipTop
  //   );
  //   // 爆炸
  //   if (this.explosionFrame) {
  //     // 最后显示的针式宽高是 1/3 宽
  //     const explosionWidth = basis.convertPercentageWidth(0.333)
  //     renderContext.drawImage(
  //       this.explosionFrame,
  //       basis.convertPercentageLeft(0.333),
  //       basis.convertPositionTop(basis.convertPercentageHeight(0.5) - explosionWidth / 2),
  //       explosionWidth,
  //       explosionWidth,
  //     )
  //   }
  //
  // }
  //
  // getCardSize(): { width: number, height: number } {
  //   const basis = Basis.getInstance();
  //   // 按照一行显示7张，来看每张牌的显示宽度
  //   // 每张牌被下一张牌盖住只显示四分之一宽度
  //   // 一张牌的宽度应该是 6*(1/4)+1 = 2.5
  //   const width = basis.convertPercentageWidth(1 / 2.5)
  //   const height = width * (4 / 3)
  //   return {width, height}
  // }
  //
  // getOutsideCardRectBounding(index: number): RectBounding {
  //   const basis = Basis.getInstance();
  //   // 按照一行显示7张，来看每张牌的显示宽度
  //   // 每张牌被下一张牌盖住只显示四分之一宽度
  //   // 一张牌的宽度应该是 6*(1/4)+1 = 2.5
  //   const cardSize = this.getCardSize()
  //   const cardWidth = cardSize.width
  //   const cardHeight = cardSize.height
  //   const firstLineTop = basis.convertPositionBottomToTop(cardHeight * 1.5)
  //   const secondLineTop = basis.convertPositionBottomToTop(cardHeight)
  //   // 一行7张，下标小于7在第一行
  //   if (index < 7) {
  //     return new RectBounding(index * cardWidth * 0.25, firstLineTop, cardWidth, cardHeight);
  //   } else {
  //     return new RectBounding((index - 7) * cardWidth * 0.25, secondLineTop, cardWidth, cardHeight);
  //   }
  // }
  //
  // /**
  //  * 处理触控事件
  //  * @param result
  //  * @private
  //  */
  // private handleTouch(result: OnTouchStartCallbackResult): void {
  //   if (this.status !== 'wait_for_our_play') {
  //     return
  //   }
  //   console.log('handleTouch')
  //   // 根据当前的状态来处理不同的情况
  //   // 等待我方出牌、等待对方出牌、提示、胜利、战败
  //   // 1. 有遮挡层的情况，处理任何事件
  //   const status = this.status
  //   this.status = 'prompt'
  //   this.showBoom()
  //   setTimeout(() => this.status = status, 999)
  // }

  getId(): string {
    return "pve";
  }
}