import Pager from "../core/Pager";
import Basis from "../core/basis";
import {Card, getAllCards, judge} from "../card/card";
import {hideLoading, showLoading, showWarning} from "../utils/message";
import {ButtonElement, Element, ImageElement, TextElement} from "../core/element";
import InnerAudioContext = WechatMinigame.InnerAudioContext;
import {sleep} from "../utils/sleep";
import PagerManager from "../core/PagerManager";
import {playAudio} from "../utils/audio";
import {GameSetting, getGameSetting} from "../service/game-setting";

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

  private gameSetting: GameSetting = getGameSetting()
  private ourSideCards: CardInfo[] = []
  private otherSideCards: CardInfo[] = []
  private bgmAudio: InnerAudioContext | null = null
  private bgImage: any = null;
  private ourSideCardBackImg: any = null;
  private otherSideCardBackImg: any = null;
  private otherSideThinkingImg: any = null;
  private pleasePlayCardImg: any = null;
  // 我方出的牌
  private ourSidePlayCard: CardInfo | null = null
  // 对方出的牌
  private otherSidePlayCard: CardInfo | null = null
  private explosions: any[] = []
  private explosionImg: any = null;
  // 通用提示信息，由标题，图片，确认和取消按钮组成
  private prompt: PromptInfo | null = null
  // 判定信息，显示在牌的上方位置
  private judgeInfo: string = ''
  /**
   * 判定区的元素信息，由判定方法完成管理.
   * @private
   */
  private judgeElements: Element[] = []

  private pageStatus: 'preparing' | 'wait_for_play_card' | 'prompt'
    | 'victory' | 'draw' | 'defeat' | 'loading' | 'error'
    | 'wait_for_judge' | 'showdown' = 'preparing'

  getId(): string {
    return "pve";
  }

  protected destroy(): void {
    if (this.bgmAudio) {
      this.bgmAudio.pause()
    }
  }

  protected init(): void {
    showLoading('准备中')
    Promise.resolve().then(async () => {
      this.pageStatus = 'preparing'
      const basis = Basis.getInstance();
      this.gameSetting = getGameSetting()
      // 背景音乐
      if (this.gameSetting.bgmEnabled) {
        if (!this.bgmAudio) {
          this.bgmAudio = wx.createInnerAudioContext();
          this.bgmAudio.src = 'audio/bgm.mp3'
          this.bgmAudio.loop = true
          this.bgmAudio.play()
        } else {
          this.bgmAudio.play()
        }
      }
      // 图片资源
      this.bgImage = await basis.loadImage('images/bg2.png')
      this.ourSideCardBackImg = await basis.loadImage('images/our-side-card-back.png')
      this.otherSideCardBackImg = await basis.loadImage('images/other-side-card-back.png')
      this.otherSideThinkingImg = await basis.loadImage('images/对方思考中.png')
      this.pleasePlayCardImg = await basis.loadImage('images/请出牌.png')
      // 爆炸特效图片加载
      this.explosions = []
      for (let i = 1; i < 19; i++) {
        this.explosions.push(await basis.loadImage(`images/explosion${i}.png`))
      }
      // 清理掉提示信息
      this.prompt = null
      // 手牌素材加载
      const originCards = getAllCards()
      this.ourSideCards = []
      this.otherSideCards = []
      for (let originCard of originCards) {
        const image = await basis.loadImage(originCard.imageUrl)
        this.ourSideCards.push(Object.assign({}, originCard, {image, selected: false}))
        this.otherSideCards.push(Object.assign({}, originCard, {image, selected: false}))
        await this.render()
      }
      this.otherSideCards.sort(() => Math.random() > 0.5 ? -1 : 1)
      this.pageStatus = 'wait_for_play_card'
      await this.render()
      // 让机器人先出牌
      this.otherSidePlayCardOut()
    }).catch((e) => {
      this.pageStatus = 'error'
      showWarning(e)
    }).finally(hideLoading)
  }

  public handleCardSelect(card: CardInfo) {
    // 不是出牌阶段，不处理
    if (this.pageStatus !== 'wait_for_play_card') {
      return
    }
    card.selected = !card.selected
    if (card.selected) {
      playAudio('audio/选牌.wav')
    } else {
      playAudio('audio/取消出牌.wav')
    }

    for (let ourSideCard of this.ourSideCards) {
      if (ourSideCard !== card) {
        ourSideCard.selected = false
      }
    }
    this.render().catch(showWarning)
  }

  private getCardSize(): { cardWidth: number, cardHeight: number } {
    const cardWidth = this.getWidth() / 2.5
    const cardHeight = cardWidth * (4 / 3)
    return {cardWidth, cardHeight}
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

    //回到菜单信息显示
    const backBtn: TextElement = {
      type: 'text',
      text: 'x 退出本局',
      top: this.getWidth() * 0.1,
      left: this.getWidth() * 0.05,
      fontSize: this.getWidth() * 0.05,
      lineHeight: this.getWidth() * 0.08,
      width: this.getWidth() * 0.9,
      height: this.getWidth() * 0.1,
      align: 'left',
      color: 'white',
      onclick: () => {
        wx.showModal({
          title: '退出本局游戏',
          content: '确认要退出本局游戏吗？'
        }).then((result) => {
          if (result.confirm) {
            PagerManager.getInstance().switchToPager('index')
          }
        }).catch(showWarning)
      }
    }
    elements.push(backBtn)

    const {cardWidth, cardHeight} = this.getCardSize()

    // 判定信息，这个显示优先级要低于手牌
    if (this.judgeInfo) {
      const info: TextElement = {
        type: 'text',
        text: this.judgeInfo,
        width: this.getWidth() * 0.9,
        bottom: cardHeight * 1.5 + this.getWidth() * 0.01,
        fontSize: this.getWidth() * 0.04,
        lineHeight: this.getWidth() * 0.05,
        height: this.getWidth() * 0.06,
        left: this.getWidth() * 0.05,
        color: 'white',
        align: 'left'
      }
      elements.push(info)
    }
    if (this.judgeElements && this.judgeElements.length) {
      elements.push(...this.judgeElements)
    }

    // 按照一行显示7张，来看每张牌的显示宽度
    // 每张牌被下一张牌盖住只显示四分之一宽度
    // 一张牌的宽度应该是 6*(1/4)+1 = 2.5
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

    // 请出牌提示
    if (this.pageStatus === 'wait_for_play_card') {
      const ourPlayCardImg: ImageElement = {
        type: 'image',
        image: this.ourSidePlayCard ? this.ourSideCardBackImg : this.pleasePlayCardImg,
        bottom: cardHeight * 1.8,
        left: this.getWidth() * 0.5 + 30,
        height: cardHeight * 0.8,
        width: cardWidth * 0.8
      }
      elements.push(ourPlayCardImg)
      // 对方出牌提示
      const otherSidePlayCardImg: ImageElement = {
        type: 'image',
        image: this.otherSidePlayCard ? this.otherSideCardBackImg : this.otherSideThinkingImg,
        bottom: cardHeight * 1.8,
        right: this.getWidth() * 0.5 + 30,
        height: cardHeight * 0.8,
        width: cardWidth * 0.8
      }
      elements.push(otherSidePlayCardImg)
    }


    // 对方手牌数量展示
    const otherSideCardCount: TextElement = {
      type: 'text',
      text: `对方剩余手牌：${this.otherSideCards.length}`,
      top: this.getWidth() * 0.2,
      width: this.getWidth() * 0.9,
      left: this.getWidth() * 0.05,
      height: this.getWidth() * 0.1,
      lineHeight: this.getWidth() * 0.08,
      fontSize: this.getWidth() * 0.05,
      color: this.otherSideCards.length > 6 ? 'green' : 'red',
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
      if (this.pageStatus !== 'wait_for_play_card') {
        return
      }
      await sleep(3000)
      let randomIdx = Math.round(Math.random() * this.otherSideCards.length)
      if (randomIdx > this.otherSideCards.length - 1) {
        randomIdx = this.otherSideCards.length - 1
      }
      this.otherSidePlayCard = this.otherSideCards[randomIdx]
      this.otherSideCards.splice(randomIdx, 1)
      this.processJudge()
      await this.render()
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
    playAudio('audio/出牌.wav')
    this.render().catch(showWarning)
    this.processJudge()
  }

  processJudge() {
    Promise.resolve().then(async () => {
      if (!this.ourSidePlayCard || !this.otherSidePlayCard) {
        return
      }
      this.pageStatus = 'wait_for_judge'
      console.log(`我方出牌：${this.ourSidePlayCard.name}，对方出牌：${this.otherSidePlayCard.name} `)
      // 亮牌
      this.pageStatus = 'showdown'
      this.judgeElements = []
      const {cardWidth, cardHeight} = this.getCardSize()
      const ourSidePlayCardImg: ImageElement = {
        type: 'image',
        image: this.ourSidePlayCard.image,
        bottom: cardHeight * 1.8,
        left: this.getWidth() * 0.5 + 30,
        height: cardHeight * 0.8,
        width: cardWidth * 0.8
      }
      this.judgeElements.push(ourSidePlayCardImg)
      const otherSidePlayImg: ImageElement = {
        type: 'image',
        image: this.otherSidePlayCard.image,
        bottom: cardHeight * 1.8,
        right: this.getWidth() * 0.5 + 30,
        height: cardHeight * 0.8,
        width: cardWidth * 0.8
      }
      this.judgeElements.push(otherSidePlayImg)

      await this.render()
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
        if (this.gameSetting.soundEffectEnabled) {
          playAudio('audio/boom.mp3')
        }
        for (let i = 0; i < this.explosions.length; i++) {
          this.explosionImg = this.explosions[i]
          await this.render()
        }
        this.explosionImg = null
        await this.render()
      }
      // 亮牌后等待一秒左右再处理手牌，否则看不到牌就没了
      await sleep(1000)
      // 处理手牌
      let msg = ''
      if (result.ourSide === 'discard') {
        msg = `我方失去手牌${this.ourSidePlayCard.name}`
        if (this.gameSetting.soundEffectEnabled && !showBoom) {
          playAudio('audio/失败.wav')
        }
      } else if (result.ourSide === 'acquire') {
        msg = `我方获得对方手牌${this.otherSidePlayCard.name}`
        if (this.gameSetting.soundEffectEnabled && !showBoom) {
          playAudio('audio/成功.wav')
        }
        this.ourSideCards.push(this.ourSidePlayCard)
        this.ourSideCards.push(this.otherSidePlayCard)
      } else if (result.ourSide === 'keep') {
        if (this.gameSetting.soundEffectEnabled && !showBoom) {
          playAudio('audio/成功.wav')
        }
        msg = `我方收回手牌${this.ourSidePlayCard.name}`
        this.ourSideCards.push(this.ourSidePlayCard)
      }
      if (result.otherSide === 'discard') {
        msg += `，对方失去手牌${this.otherSidePlayCard.name}`
      } else if (result.otherSide === 'acquire') {
        msg += `对方获得手牌${this.otherSidePlayCard.name}`
        this.otherSideCards.push(this.ourSidePlayCard)
        this.otherSideCards.push(this.otherSidePlayCard)
      } else if (result.otherSide === 'keep') {
        msg += `对方收回手牌${this.otherSidePlayCard.name}`
        this.otherSideCards.push(this.otherSidePlayCard)
      }
      // 清空手牌前，有对应的动画
      const frameCount = 30;
      for (let i = 0; i < frameCount; i++) {
        // 两种情况，要么弃牌，要么收回
        if (result.ourSide === 'discard') {
          // 如果对方获取我们的牌，那么需要向上移动
          if (result.otherSide === 'acquire') {
            // bottom最终要变成页面的height
            ourSidePlayCardImg.bottom = cardHeight * 1.8 + (this.getHeight() - cardHeight * 1.8) / frameCount * (i + 1)
          } else {
            // 向右移，最终 left 要变成页面的 width
            ourSidePlayCardImg.left = (this.getWidth() * 0.5 + 30)
              + (this.getWidth() - this.getWidth() * 0.5 + 30) / frameCount * (i + 1)
          }
        } else {
          // 我方获取牌和保持牌将牌向下移动，bottom最终要变成 0.5 cardHeight
          ourSidePlayCardImg.bottom = cardHeight * 1.8 - (cardHeight * 1.8 - cardHeight * 0.5) / frameCount * (i + 1)
        }
        if (result.otherSide == 'discard') {
          // 对方弃牌，如果是我方获取牌则向下移动，否则向左移动
          if (result.ourSide === 'acquire') {
            // 向下，bottom最终要变成 0.5 cardHeight
            otherSidePlayImg.bottom = cardHeight * 1.8 - (cardHeight * 1.8 - cardHeight * 0.5) / frameCount * (i + 1)
          } else {// 向左移动，最终right 要变成页面宽度
            otherSidePlayImg.right = (this.getWidth() - this.getWidth() * 0.5 + 30) / frameCount * (i + 1)
              + (this.getWidth() * 0.5 + 30)
          }
        } else {
          // 向上 bottom最终要变成页面的height
          otherSidePlayImg.bottom = (this.getHeight() - cardHeight * 1.8) / frameCount * (i + 1)
            + cardHeight * 1.8
        }
        await this.render()
      }
      this.judgeElements = []
      this.ourSidePlayCard = null
      this.otherSidePlayCard = null
      this.judgeInfo = msg
      await this.render()
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
        this.pageStatus = 'wait_for_play_card'
        await this.render()
        this.otherSidePlayCardOut()
      }
      if (promptImg) {
        this.ourSideCards = []
        this.judgeInfo = ''
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
          await this.render()
        }
      }
    }).catch(showWarning)
  }

  cancelSelect() {
    for (let card of this.ourSideCards) {
      card.selected = false
    }
    playAudio('audio/取消出牌.wav')
    this.render().catch(showWarning)
  }

}