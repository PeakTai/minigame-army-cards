import Pager from "../core/Pager";
import Basis from "../core/basis";
import {Card, getAllCards, judge} from "../card/card";
import {hideLoading, showLoading, showWarning} from "../utils/message";
import {ButtonElement, Element, ImageElement, TextElement} from "../core/element";
import InnerAudioContext = WechatMinigame.InnerAudioContext;
import {sleep} from "../utils/sleep";
import PagerManager from "../core/PagerManager";

interface CardInfo extends Card {
  image: any;
  selected: boolean;
}

interface PromptButton {
  text: string;
  callback: () => void
}

interface PromptInfo {
  buttons: PromptButton[];
  image: any;
  imageWidth: number;
  imageHeight: number;
}

export default class Pve extends Pager {

  private ourSideCards: CardInfo[] = []
  private otherSideCards: CardInfo[] = []
  private bgmAudio: InnerAudioContext | null = null
  private bgImage: any = null;
  private ourSideCardBackImg: any = null;
  private otherSideCardBackImg: any = null;
  // 我方出的牌
  private ourSidePlayCard: CardInfo | null = null
  // 对方出的牌
  private otherSidePlayCard: CardInfo | null = null
  private explosions: any[] = []
  private explosionImg: any = null;
  private explosionAudio: InnerAudioContext | null = null
  // 通用提示信息，由标题，图片，确认和取消按钮组成
  private prompt: PromptInfo | null = null

  private pageStatus: 'preparing' | 'wait_for_our_play' | 'wait_for_other_play' | 'prompt'
    | 'victory' | 'draw' | 'defeat' | 'loading' | 'error'
    | 'wait_for_judge' | 'showdown' = 'wait_for_our_play'

  getId(): string {
    return "pve";
  }

  protected destroy(): void {
  }

  protected init(): void {
    showLoading('准备中')
    Promise.resolve().then(async () => {
      this.pageStatus = 'preparing'
      const basis = Basis.getInstance();
      // 背景音乐
      if (!this.bgmAudio) {
        this.bgmAudio = wx.createInnerAudioContext();
        this.bgmAudio.src = 'audio/bgm.mp3'
        this.bgmAudio.loop = true
        this.bgmAudio.play()
      } else {
        this.bgmAudio.play()
      }
      // 爆炸特效音
      this.explosionAudio = wx.createInnerAudioContext()
      this.explosionAudio.src = 'audio/boom.mp3'
      // 图片资源
      this.bgImage = await basis.loadImage('images/bg2.png')
      this.ourSideCardBackImg = await basis.loadImage('images/our-side-card-back.png')
      this.otherSideCardBackImg = await basis.loadImage('images/other-side-card-back.png')
      // 爆炸特效图片加载
      this.explosions = []
      for (let i = 1; i < 19; i++) {
        this.explosions.push(await basis.loadImage(`images/explosion${i}.png`))
      }
      // 手牌素材加载
      const originCards = getAllCards()
      this.ourSideCards = []
      this.otherSideCards = []
      for (let originCard of originCards) {
        const image = await basis.loadImage(originCard.imageUrl)
        this.ourSideCards.push(Object.assign({}, originCard, {image, selected: false}))
        this.otherSideCards.push(Object.assign({}, originCard, {image, selected: false}))
        await sleep(30)
        this.render()
      }
      this.pageStatus = 'wait_for_other_play'
      this.render()
      // 让机器人先出牌
      this.otherSidePlayCardOut()
    }).catch((e) => {
      this.pageStatus = 'error'
      showWarning(e)
    })
      .finally(hideLoading)
  }

  public handleCardSelect(card: CardInfo) {
    // 不是我方出牌，则不处理事件
    if (this.pageStatus !== 'wait_for_our_play') {
      showWarning('现在还没到我方出牌')
      return
    }
    card.selected = !card.selected
    if (card.selected) {
      console.log(`选中手牌${card.name}`)
    } else {
      console.log(`取消选中手牌${card.name}`)
    }
    for (let ourSideCard of this.ourSideCards) {
      if (ourSideCard !== card) {
        ourSideCard.selected = false
      }
    }
    this.render()
  }

  protected buildElements(): Element[] {
    // 将所有资源转换成元素
    const elements: Element[] = []
    // 背景元素
    const bgEl: ImageElement = {
      type: 'image',
      left: 0,
      right: 0,
      bottom: 0,
      top: 0,
      image: this.bgImage
    }
    elements.push(bgEl)
    // 按照一行显示7张，来看每张牌的显示宽度
    // 每张牌被下一张牌盖住只显示四分之一宽度
    // 一张牌的宽度应该是 6*(1/4)+1 = 2.5
    const cardWidth = this.getWidth() / 2.5
    const cardHeight = cardWidth * (4 / 3)
    let selectedCard: CardInfo | null = null;
    for (let i = 0; i < this.ourSideCards.length; i++) {
      const card = this.ourSideCards[i]
      const left = i < 7 ? (i * cardWidth / 4) : (i - 7) * cardWidth / 4
      const bottom = i < 7 ? cardHeight * 0.5 : 0
      const imageEl: ImageElement = {
        type: 'image',
        left,
        bottom: card.selected ? bottom + (cardHeight / 4) : bottom,
        width: cardWidth,
        height: cardHeight,
        image: card.image,
        shadow: card.selected ? {
          x: 0, y: 0, blur: 10, color: 'red'
        } : {
          x: 0, y: 0, blur: 10, color: 'black'
        },
        border: card.selected ? {width: 3, color: 'red'} : {width: 1, color: 'black'},
        onclick: () => this.handleCardSelect(card)
      }
      elements.push(imageEl)
      if (card.selected) {
        selectedCard = card
      }
    }
    if (selectedCard) {
      const card: CardInfo = selectedCard
      // 展示请出牌按钮
      const confirmButton: ButtonElement = {
        type: 'button',
        text: '出牌',
        bottom: this.getHeight() * 0.05,
        right: this.getWidth() * 0.05,
        height: this.getWidth() * 0.1,
        width: this.getWidth() * 0.2,
        fontSize: this.getWidth() * 0.05,
        bgColor: 'green',
        color: 'white',
        onclick: () => this.playCardOut(card)
      }
      elements.push(confirmButton)
      const cancelButton: ButtonElement = {
        type: 'button',
        text: '取消',
        bottom: this.getHeight() * 0.05,
        right: this.getWidth() * 0.3,
        height: this.getWidth() * 0.1,
        width: this.getWidth() * 0.2,
        fontSize: this.getWidth() * 0.05,
        bgColor: 'red',
        color: 'white',
        onclick: () => this.cancelSelect()
      }
      elements.push(cancelButton)
    }

    // 我方出牌后的展示
    if (this.ourSidePlayCard) {
      // 我方展示手牌的区域占用了1.5倍的牌高，有选中的情况下，占用是 1.5+0.25 = 1.75
      // 在 1.8 倍牌高的地方展示已经出去的手牌，这个区域展示的手牌小一点，只有手牌的0.8倍
      const ourPlayCardImg: ImageElement = {
        type: 'image',
        image: this.pageStatus === 'showdown' ? this.ourSidePlayCard.image : this.ourSideCardBackImg,
        bottom: cardHeight * 1.8,
        left: this.getWidth() * 0.5 + 30,
        height: cardHeight * 0.8,
        width: cardWidth * 0.8
      }
      elements.push(ourPlayCardImg)
    }
    // 对方出牌后的提示,牌的位置信息参考上面
    if (this.otherSidePlayCard) {
      const ourPlayCardImg: ImageElement = {
        type: 'image',
        image: this.pageStatus === 'showdown' ? this.otherSidePlayCard.image : this.otherSideCardBackImg,
        bottom: cardHeight * 1.8,
        right: this.getWidth() * 0.5 + 30,
        height: cardHeight * 0.8,
        width: cardWidth * 0.8
      }
      elements.push(ourPlayCardImg)
    }

    // 请出牌提示
    if (!this.ourSidePlayCard && this.pageStatus === 'wait_for_our_play') {
      const text = ['牌', '出', '请']
      const fontSize = this.getWidth() * 0.06
      const lineHeight = this.getWidth() * 0.1
      const bottom = cardHeight * 1.8 + (cardHeight * 0.8 - lineHeight * text.length) / 2
      const left = this.getWidth() * 0.5 + 30
      for (let i = 0; i < text.length; i++) {
        const textEl: TextElement = {
          type: "text",
          text: text[i],
          bottom: bottom + i * lineHeight,
          height: lineHeight,
          left,
          lineHeight,
          fontSize,
          width: fontSize * 1.5,
          color: 'red',
          align: 'left'
        }
        elements.push(textEl)
      }
    }

    // 对方出牌提示
    if (this.pageStatus === 'wait_for_other_play' && !this.otherSidePlayCard) {
      const text = ['中', '牌', '出', '方', '对']
      const fontSize = this.getWidth() * 0.06
      const lineHeight = this.getWidth() * 0.1
      const bottom = cardHeight * 1.8 + (cardHeight * 0.8 - lineHeight * text.length) / 2
      const right = this.getWidth() * 0.5 + 30
      for (let i = 0; i < text.length; i++) {
        const textEl: TextElement = {
          type: "text",
          text: text[i],
          bottom: bottom + i * lineHeight,
          height: lineHeight,
          right,
          lineHeight,
          fontSize,
          width: fontSize * 1.5,
          color: 'red',
          align: 'left'
        }
        elements.push(textEl)
      }
    }

    // 对方手牌数量展示
    const otherSideCardCount: TextElement = {
      type: 'text',
      text: `对方剩余手牌：${this.otherSideCards.length}`,
      top: this.getHeight() * 0.05,
      width: this.getWidth() * 0.9,
      left: this.getWidth() * 0.05,
      height: this.getWidth() * 0.1,
      lineHeight: this.getWidth() * 0.1,
      fontSize: this.getWidth() * 0.06,
      color: 'green',
      align: 'left'
    }
    elements.push(otherSideCardCount)

    // 爆炸图片，图片显示为宽的80%
    if (this.explosionImg) {
      const img: ImageElement = {
        type: 'image',
        image: this.explosionImg,
        width: this.getWidth() * 0.8,
        height: this.getWidth() * 0.8,
        left: this.getWidth() * 0.1,
        top: (this.getHeight() - this.getWidth() * 0.8) / 2
      }
      elements.push(img)
    }

    // 提示信息
    if (this.prompt) {
      const img: ImageElement = {
        type: 'image',
        image: this.prompt.image,
        width: this.prompt.imageWidth,
        height: this.prompt.imageHeight,
        left: (this.getWidth() - this.prompt.imageWidth) / 2,
        top: (this.getHeight() - this.prompt.imageHeight) / 2
      }
      elements.push(img)
      // 按钮
      if (this.prompt.buttons.length >= 1) {
        const btn = this.prompt.buttons[0]
        const btnEl: ButtonElement = {
          type: 'button',
          text: btn.text,
          fontSize: this.getWidth() * 0.06,
          left: this.getWidth() * 0.1,
          top: (this.getHeight() - this.getWidth() * 0.8) / 2 + this.getWidth() * 0.9,
          width: this.getWidth() * 0.35,
          height: this.getWidth() * 0.1,
          onclick: () => btn.callback()
        }
        elements.push(btnEl)
      }
      if (this.prompt.buttons.length >= 2) {
        const btn = this.prompt.buttons[1]
        const btnEl: ButtonElement = {
          type: 'button',
          text: btn.text,
          fontSize: this.getWidth() * 0.06,
          right: this.getWidth() * 0.1,
          top: (this.getHeight() - this.getWidth() * 0.8) / 2 + this.getWidth() * 0.9,
          width: this.getWidth() * 0.35,
          height: this.getWidth() * 0.1,
          onclick: () => btn.callback(),
        }
        elements.push(btnEl)
      }
    }

    return elements;
  }

  /**
   * 对方机器人出牌.
   */
  otherSidePlayCardOut() {
    Promise.resolve().then(async () => {
      await sleep(1000)
      let randomIdx = Math.round(Math.random() * this.otherSideCards.length)
      if (randomIdx > this.otherSideCards.length - 1) {
        randomIdx = this.otherSideCards.length - 1
      }
      this.otherSidePlayCard = this.otherSideCards[randomIdx]
      this.otherSideCards.splice(randomIdx, 1)
      this.pageStatus = 'wait_for_our_play'
      this.render()
    }).catch(showWarning)
  }

  /**
   * 出牌
   */
  playCardOut(card: CardInfo) {
    // 同时将这个牌清除掉
    let idx = this.ourSideCards.findIndex(c => c === card)
    if (idx === -1) {
      return
    }
    this.ourSideCards.splice(idx, 1)
    card.selected = false
    this.ourSidePlayCard = card
    this.pageStatus = 'wait_for_judge'
    this.render()
    this.processJudge()
  }

  processJudge() {
    Promise.resolve().then(async () => {
      if (!this.ourSidePlayCard || !this.otherSidePlayCard) {
        return
      }
      console.log(`我方出牌：${this.ourSidePlayCard.name}，对方出牌：${this.otherSidePlayCard.name} `)
      // 亮牌
      this.pageStatus = 'showdown'
      this.render()
      const result = judge(this.ourSidePlayCard, this.otherSidePlayCard)
      // 判定是否要播放炸弹特效
      let showBoom: boolean = false
      if (this.ourSidePlayCard.name === '炸弹' || this.otherSidePlayCard.name === '炸弹') {
        showBoom = true;
      } else if (this.ourSidePlayCard.name === '地雷') {
        if (result.otherSide !== 'acquire') {
          showBoom = true
        }
      } else if (this.otherSidePlayCard.name === '地雷') {
        if (result.ourSide !== 'acquire') {
          showBoom = true;
        }
      }
      if (showBoom) {
        // 播放爆炸特效
        if (this.explosionAudio) {
          this.explosionAudio.play()
        }
        for (let i = 0; i < this.explosions.length; i++) {
          this.explosionImg = this.explosions[i]
          await sleep(20)
          this.render()
        }
        this.explosionImg = null
        this.render()
      }
      // 亮牌后等待一秒左右再处理手牌，否则看不到牌就没了
      await sleep(1000)
      // 处理手牌
      let msg = ''
      if (result.ourSide === 'discard') {
        msg = '我方失去手牌'
      } else if (result.ourSide === 'acquire') {
        msg = '我方获得对方手牌'
        this.ourSideCards.push(this.ourSidePlayCard)
        this.ourSideCards.push(this.otherSidePlayCard)
      } else if (result.ourSide === 'keep') {
        msg = '我方收回手牌'
        this.ourSideCards.push(this.ourSidePlayCard)
      }
      if (result.otherSide === 'discard') {
        msg += '，对方失去手牌'
      } else if (result.otherSide === 'acquire') {
        msg += '对方获得手牌'
        this.otherSideCards.push(this.ourSidePlayCard)
        this.otherSideCards.push(this.otherSidePlayCard)
      } else if (result.otherSide === 'keep') {
        msg += '对方收回手牌'
        this.otherSideCards.push(this.otherSidePlayCard)
      }
      this.ourSidePlayCard = null
      this.otherSidePlayCard = null
      showWarning(msg)
      this.render()
      const basis = Basis.getInstance();
      // 判定输赢
      let promptImg: any = null;
      if (!this.ourSideCards.length && !this.otherSideCards.length) {
        // 平局
        // todo 平局音效
        this.pageStatus = 'draw'
        promptImg = await basis.loadImage('images/平局.png')
      } else if (!this.ourSideCards.length) {
        // 输了
        // todo 输了的音效
        this.pageStatus = 'defeat'
        promptImg = await basis.loadImage('images/战败.png')
      } else if (!this.otherSideCards.length) {
        // 赢了
        this.pageStatus = 'victory'
        // todo 赢了的音效
        promptImg = await basis.loadImage('images/胜利.png')
      } else {
        // 如果双方都还有牌，继续让对方出牌
        this.pageStatus = 'wait_for_other_play'
        this.render()
        this.otherSidePlayCardOut()
      }
      if (promptImg) {
        this.ourSideCards = []
        this.prompt = {
          image: promptImg,
          imageHeight: 0,
          imageWidth: 0,
          buttons: [
            {
              text: '回到菜单', callback: () => PagerManager.getInstance().switchToPager('index')
            },
            {
              text: '再来一局', callback: () => this.init()
            }
          ]
        }
        // 最终要显示图片是 80% 的宽度
        let step = (this.getWidth() * 0.8) / 60
        for (let i = 0; i < 60; i++) {
          if (!this.prompt) {
            break
          }
          this.prompt.imageWidth = (i + 1) * step
          this.prompt.imageHeight = (i + 1) * step
          await sleep(16)
          this.render()
        }
      }
    }).catch(showWarning)
  }

  cancelSelect() {
    for (let card of this.ourSideCards) {
      card.selected = false
    }
    this.render()
  }

}