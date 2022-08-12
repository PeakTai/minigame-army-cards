import Pager from "../../core/Pager";
import {ButtonElement, Element, ImageElement, TextElement} from "../../core/element";
import {hideLoading, showLoading, showWarning} from "../../utils/message";
import {findRoundById, findRoundByPlayerOpenId, PlayerInfo, pushRecord, Round, watchRound} from "../../service/round";
import PagerManager from "../../core/PagerManager";
import {getAuthInfo} from "../../service/auth";
import {Card} from "../../card/card";
import {GameSetting, getGameSetting} from "../../service/game-setting";
import Basis from "../../core/basis";
import {playAudio} from "../../utils/audio";
import {sleep} from "../../utils/sleep";
import {EndingResult, JudgeResult, Record, RecordType} from "../../service/record";
import InnerAudioContext = WechatMinigame.InnerAudioContext;
import Image = WechatMinigame.Image;
import RealtimeListener = DB.RealtimeListener;

interface CardInfo extends Card {
  image: any;
  selected: boolean;
}

interface PromptButton {
  text: string;
  callback?: () => void
}

interface PromptInfo {
  buttons: PromptButton[];
  image: any;
  imageWidth: number;
  imageHeight: number;
}

/**
 * 局.
 */
export default class PvpRound extends Pager {

  private round: Round | null = null;
  private gameSetting: GameSetting = getGameSetting()
  private ourSideCards: CardInfo[] = []
  private bgmAudio: InnerAudioContext | null = null
  private bgImage: any = null;
  private ourSideCardBackImg: any = null;
  private otherSideCardBackImg: any = null;
  private otherSideThinkingImg: any = null;
  private pleasePlayCardImg: any = null;
  private explosions: any[] = []
  private explosionImg: any = null;
  // 通用提示信息，由标题，图片，确认和取消按钮组成
  private prompt: PromptInfo | null = null
  // 判定信息，显示在牌的上方位置
  private judgeInfo: string = ''
  private playerAvatarMap: Map<string, Image> = new Map<string, Image>()
  private roundListener: RealtimeListener | null = null;
  /**
   * 判定区的元素信息，由判定方法完成管理.
   * @private
   */
  private judgeElements: Element[] = []

  private pageStatus: 'preparing' | 'wait_for_play_card' | 'prompt'
    | 'victory' | 'draw' | 'defeat' | 'loading' | 'error'
    | 'wait_for_judge' | 'showdown' = 'preparing'
  private ourSideInfo: PlayerInfo | undefined = undefined;
  private otherSideInfo: PlayerInfo | undefined = undefined;

  protected destroy(): void {
    if (this.bgmAudio) {
      this.bgmAudio.pause()
    }
    if (this.roundListener) {
      this.roundListener.close().catch(showWarning)
    }
  }

  private async promptedEnterGameFailed(reason: string) {
    await wx.showModal({
      title: '无法进入游戏',
      content: reason,
      showCancel: false,
      confirmText: '返回菜单'
    })
    PagerManager.getInstance().switchToPager('index')
  }


  protected init(query?: any): void {
    const roundId = query ? query.roundId : undefined
    showLoading('准备中')
    Promise.resolve().then(async () => {
      const auth = await getAuthInfo()
      const round = await findRoundById(roundId)
      if (!round) {
        await this.promptedEnterGameFailed('无法查找到游戏信息')
        return
      }
      if (round.status !== 'underway') {
        await this.promptedEnterGameFailed('游戏已经不在进行中了，无法进入')
        return
      }
      this.ourSideInfo = round.playerInfos.find(p => p.openId === auth.openid)
      this.otherSideInfo = round.playerInfos.find(p => p.openId !== auth.openid)
      if (!this.ourSideInfo || !this.otherSideInfo) {
        await this.promptedEnterGameFailed('获取不到玩家有效信息')
        return
      }

      // 现在正式开始
      this.round = round
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
      // 选手头像
      for (let playerInfo of round.playerInfos) {
        try {
          const avatar = await basis.loadImage(playerInfo.avatarUrl)
          this.playerAvatarMap.set(playerInfo.openId, avatar)
        } catch (e) {
          // 忽略选手图片加载不成功的情况
        }
      }
      // 爆炸特效图片加载
      this.explosions = []
      for (let i = 1; i < 19; i++) {
        this.explosions.push(await basis.loadImage(`images/explosion${i}.png`))
      }
      // 清理掉提示信息
      this.prompt = null
      // 手牌素材加载
      this.ourSideCards = []
      for (let keepCard of this.ourSideInfo.keepCards) {
        const image = await basis.loadImage(keepCard.imageUrl)
        this.ourSideCards.push(Object.assign({}, keepCard, {image, selected: false}))
        await this.render()
      }
      // 监听
      this.roundListener = watchRound(this.round._id, this.handleRoundChange.bind(this), (error) => this.handleWatchError(error));
      this.pageStatus = 'wait_for_play_card'
      await this.render()
      // 让机器人先出牌
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
    if (!this.round) {
      return elements
    }
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
      onclick: () => this.exitRound()
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
      if (this.ourSideInfo) {
        const ourPlayCardImg: ImageElement = {
          type: 'image',
          image: this.ourSideInfo.playOutCard ? this.ourSideCardBackImg : this.pleasePlayCardImg,
          bottom: cardHeight * 1.8,
          left: this.getWidth() * 0.5 + 30,
          height: cardHeight * 0.8,
          width: cardWidth * 0.8
        }
        elements.push(ourPlayCardImg)
      }
      if (this.otherSideInfo) {
        // 对方出牌提示
        const otherSidePlayCardImg: ImageElement = {
          type: 'image',
          image: this.otherSideInfo.playOutCard ? this.otherSideCardBackImg : this.otherSideThinkingImg,
          bottom: cardHeight * 1.8,
          right: this.getWidth() * 0.5 + 30,
          height: cardHeight * 0.8,
          width: cardWidth * 0.8
        }
        elements.push(otherSidePlayCardImg)
      }
    }

    // 对方信息
    if (this.otherSideInfo) {
      const avatarImg = this.playerAvatarMap.get(this.otherSideInfo.openId)
      if (avatarImg) {
        const avatar: ImageElement = {
          type: 'image',
          image: avatarImg,
          top: this.getWidth() * 0.2,
          width: this.getWidth() * 0.1,
          left: this.getWidth() * 0.05,
          height: this.getWidth() * 0.1,
        }
        elements.push(avatar)
      }

      const otherSideCardCount: TextElement = {
        type: 'text',
        text: `${this.otherSideInfo.nickName} [${this.otherSideInfo.keepCards.length}]`,
        top: this.getWidth() * 0.2,
        width: this.getWidth() * 0.65,
        left: this.getWidth() * 0.2,
        height: this.getWidth() * 0.1,
        lineHeight: this.getWidth() * 0.1,
        fontSize: this.getWidth() * 0.05,
        color: 'white',
        align: 'left'
      }
      elements.push(otherSideCardCount)
    }


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
      // 遮罩
      const mask: Element = {
        backgroundColor: 'rgba(255,255,255,.7)',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0
      }
      elements.push(mask)
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
          onclick: btn.callback
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
          onclick: btn.callback,
        }
        elements.push(btnEl)
      }
    }

    return elements;
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
    card.selected = false
    showLoading()
    Promise.resolve().then(async () => {
      await pushRecord({type: RecordType.PLAY_CARD, card, createAt: new Date()})
      this.ourSideCards.splice(idx, 1)
      playAudio('audio/出牌.wav')
      this.pageStatus = 'wait_for_judge'
    }).catch(showWarning)
      .finally(hideLoading)
  }

  cancelSelect() {
    for (let card of this.ourSideCards) {
      card.selected = false
    }
    playAudio('audio/取消出牌.wav')
    this.render().catch(showWarning)
  }

  getId(): string {
    return "pvpRound";
  }

  private handleRoundChange(snapshot: DB.ISnapshot) {
    Promise.resolve().then(async () => {
      if (!this.round) {
        return
      }
      if (!this.ourSideInfo) {
        return
      }
      // 没有文档了，查询是不是牌局已经不存在了
      if (!snapshot.docs.length) {
        const round = await findRoundById(this.round._id)
        if (round == null) {
          const newRound = await findRoundByPlayerOpenId(this.ourSideInfo.openId)
          if (newRound) {
            await wx.showModal({
              title: '新牌局已经开始',
              content: '新的一局游戏已经开始了',
              showCancel: false,
              confirmText: '进入游戏'
            })
            PagerManager.getInstance().switchToPager('pvpRound', {roundId: newRound._id})
            return
          }
          await wx.showModal({
            title: '无法继续游戏',
            content: '牌局已经不存在，有可能是其它玩家已经退出',
            showCancel: false,
            confirmText: '返回菜单'
          })
          PagerManager.getInstance().switchToPager('index')
        }
        return
      }
      const newRound = snapshot.docs[0] as Round
      // 比较新旧的牌局，处理新的记录，没有新记录需要处理的，则不管
      const newRecords = newRound.records
      const currentRecords = this.round.records
      if (currentRecords.length >= newRecords.length) {
        return
      }
      const diffPart = newRecords.slice(currentRecords.length)
      for (let record of diffPart) {
        await this.processRecord(record)
      }
      this.round = newRound
      const openId = this.ourSideInfo ? this.ourSideInfo.openId : ''
      this.ourSideInfo = newRound.playerInfos.find(p => p.openId === openId)
      // 刷新手牌信息
      if (this.ourSideInfo) {
        const basis = Basis.getInstance();
        this.ourSideCards = []
        for (let keepCard of this.ourSideInfo.keepCards) {
          const image = await basis.loadImage(keepCard.imageUrl)
          this.ourSideCards.push(Object.assign({}, keepCard, {image, selected: false}))
        }
      }
      this.otherSideInfo = newRound.playerInfos.find(p => p.openId !== openId)
      await this.render()
    }).catch(showWarning)
  }

  private async processRecord(record: Record) {
    // 出牌
    if (record.type === RecordType.PLAY_CARD) {
      if (this.ourSideInfo && record.playerOpenId === this.ourSideInfo.openId) {
        this.ourSideInfo.playOutCard = record.card
      }
      if (this.otherSideInfo && record.playerOpenId === this.otherSideInfo.openId) {
        this.otherSideInfo.playOutCard = record.card
      }
      await this.render()
      return
    }
    // 判定结果
    if (record.type === RecordType.JUDGE) {
      if (record.judgeResults) {
        await this.showJudgeResult(record.judgeResults)
      }
      return
    }
    // 投降
    if (record.type == RecordType.SURRENDER) {
      if (this.ourSideInfo && record.playerOpenId === this.ourSideInfo.openId) {
        showWarning('您已经投降')
      }
      if (this.otherSideInfo && record.playerOpenId === this.otherSideInfo.openId) {
        showWarning('对方已经投降')
      }
      return
    }
    // 结束
    if (record.type === RecordType.ENDING) {
      if (record.endingResults) {
        await this.showEndingResult(record.endingResults)
      }
      return
    }
    // 处理请求再来一次
    if (record.type === RecordType.REQUEST_ONCE_MORE) {
      // 判定对方发起的，我方发起的忽略掉
      if (this.otherSideInfo && record.playerOpenId === this.otherSideInfo.openId) {
        // 弹出提示，对方发起邀请，拒绝还是通过
        const result = await wx.showModal({
          title: '处理邀请',
          content: '对方邀请您再来一局，是否同意？',
          confirmText: '同意',
          cancelText: '拒绝'
        })
        showLoading()
        try {
          if (result.confirm) {
            await pushRecord({type: RecordType.AGREE, createAt: new Date()})
          } else {
            await pushRecord({type: RecordType.REFUSE, createAt: new Date()})
            PagerManager.getInstance().switchToPager('index')
          }
        } finally {
          hideLoading()
        }
      }
      return
    }
    if (record.type === RecordType.AGREE) {
      if (this.otherSideInfo && record.playerOpenId === this.otherSideInfo.openId) {
        hideLoading()
        showWarning("对方同意了您的请求，请等待进入新的游戏")
      }
      return
    }
    if (record.type === RecordType.REFUSE) {
      if (this.otherSideInfo && record.playerOpenId === this.otherSideInfo.openId) {
        hideLoading()
        await wx.showModal({
          title: '邀请被拒绝',
          content: '对方拒绝了您的请求',
          showCancel: false,
          confirmText: '返回菜单'
        })
        PagerManager.getInstance().switchToPager('index')
      }
      return
    }
    if (record.type === RecordType.URGE) {
      if (this.otherSideInfo && record.playerOpenId === this.otherSideInfo.openId) {
        await wx.showModal({
          title: '催促',
          content: '您出牌太慢了，对方催你快点出牌',
          showCancel: false,
          confirmText: '好的'
        })
      }
      return
    }
    if (record.type === RecordType.EXIT) {
      if (this.otherSideInfo && record.playerOpenId === this.otherSideInfo.openId) {
        await wx.showModal({
          title: '对方已退出',
          content: '对方已经退出了游戏，无法再继续游戏',
          showCancel: false,
          confirmText: '退出游戏'
        })
        PagerManager.getInstance().switchToPager('index')
      }
      return
    }
    showWarning(`无法处理的记录类型：${record.type}`)
  }

  private async showJudgeResult(judgeResults: JudgeResult[]) {
    const basis = Basis.getInstance()
    this.pageStatus = 'wait_for_judge'
    // 亮牌
    this.pageStatus = 'showdown'
    if (!this.ourSideInfo || !this.otherSideInfo
      || !this.ourSideInfo.playOutCard || !this.otherSideInfo.playOutCard) {
      showWarning('出牌信息异常')
      this.pageStatus = 'wait_for_play_card'
      return
    }
    const {cardWidth, cardHeight} = this.getCardSize()
    this.judgeElements = []
    const ourSidePlayCardImg: ImageElement = {
      type: 'image',
      image: await basis.loadImage(this.ourSideInfo.playOutCard.imageUrl),
      bottom: cardHeight * 1.8,
      left: this.getWidth() * 0.5 + 30,
      height: cardHeight * 0.8,
      width: cardWidth * 0.8
    }
    this.judgeElements.push(ourSidePlayCardImg)
    const otherSidePlayImg: ImageElement = {
      type: 'image',
      image: await basis.loadImage(this.otherSideInfo.playOutCard.imageUrl),
      bottom: cardHeight * 1.8,
      right: this.getWidth() * 0.5 + 30,
      height: cardHeight * 0.8,
      width: cardWidth * 0.8
    }
    this.judgeElements.push(otherSidePlayImg)
    await this.render()
    const ourResult = judgeResults.filter(r => this.ourSideInfo && r.playerOpenId === this.ourSideInfo.openId)
      .map(r => r.result)[0]
    const otherResult = judgeResults.filter(r => this.otherSideInfo && r.playerOpenId === this.otherSideInfo.openId)
      .map(r => r.result)[0]
    // 判定是否要播放炸弹特效
    let showBoom: boolean = false
    if (this.ourSideInfo.playOutCard.name === '炸弹'
      || this.otherSideInfo.playOutCard.name === '炸弹') {
      showBoom = true;
    } else if (this.ourSideInfo.playOutCard.name === '地雷') {
      if (otherResult !== 'acquire') {
        showBoom = true
      }
    } else if (this.otherSideInfo.playOutCard.name === '地雷') {
      if (ourResult !== 'acquire') {
        showBoom = true;
      }
    }
    if (showBoom) {
      // 播放爆炸特效
      if (this.gameSetting.soundEffectEnabled) {
        playAudio('audio/boom.mp3')
      }
      wx.vibrateLong({type: 'heavy', fail: showWarning})
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
    if (ourResult === 'discard') {
      msg = `我方失去手牌${this.ourSideInfo.playOutCard.name}`
      if (this.gameSetting.soundEffectEnabled && !showBoom) {
        playAudio('audio/失败.wav')
      }
    } else if (ourResult === 'acquire') {
      msg = `我方获得对方手牌${this.otherSideInfo.playOutCard.name}`
      if (this.gameSetting.soundEffectEnabled && !showBoom) {
        playAudio('audio/成功.wav')
      }
    } else if (ourResult === 'keep') {
      if (this.gameSetting.soundEffectEnabled && !showBoom) {
        playAudio('audio/成功.wav')
      }
      msg = `我方收回手牌${this.ourSideInfo.playOutCard.name}`
    }
    if (otherResult === 'discard') {
      msg += `，对方失去手牌${this.otherSideInfo.playOutCard.name}`
    } else if (otherResult === 'acquire') {
      msg += `对方获得手牌${this.otherSideInfo.playOutCard.name}`
    } else if (otherResult === 'keep') {
      msg += `对方收回手牌${this.otherSideInfo.playOutCard.name}`
    }
    this.judgeInfo = msg
    // 清空手牌前，有对应的动画
    const frameCount = 30;
    for (let i = 0; i < frameCount; i++) {
      // 两种情况，要么弃牌，要么收回
      if (ourResult === 'discard') {
        // 如果对方获取我们的牌，那么需要向上移动
        if (otherResult === 'acquire') {
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
      if (otherResult == 'discard') {
        // 对方弃牌，如果是我方获取牌则向下移动，否则向左移动
        if (ourResult === 'acquire') {
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
    this.judgeInfo = ''
    this.judgeElements = []
    await this.render()
    this.pageStatus = 'wait_for_play_card'
  }

  private handleWatchError(error: any) {
    console.error(error)
    Promise.resolve().then(async () => {
      await wx.showModal({
        title: '异常中断',
        content: '失去连接，程序已经掉线，请返回菜单后重新进入',
        showCancel: false,
        confirmText: '返回菜单'
      })
      PagerManager.getInstance().switchToPager('index')
    })
  }

  private async showEndingResult(endingResults: EndingResult[]) {
    const basis = Basis.getInstance();
    const result = endingResults.find(
      r => this.ourSideInfo && r.playerOpenId === this.ourSideInfo.openId)
    if (!result) {
      showWarning('我方结束信息异常')
      return
    }
    let promptImg: any = null;
    if (result.result === 'victory') {
      this.pageStatus = 'victory'
      promptImg = await basis.loadImage('images/胜利.png')
    } else if (result.result === 'defeat') {
      this.pageStatus = 'defeat'
      promptImg = await basis.loadImage('images/战败.png')
    } else if (result.result === 'draw') {
      this.pageStatus = 'draw'
      promptImg = await basis.loadImage('images/平局.png')
    } else {
      showWarning('未知的结束类型')
      return
    }
    this.prompt = {
      image: promptImg,
      imageHeight: 0,
      imageWidth: 0,
      buttons: [
        {
          text: '回到菜单', callback: () => {
            showLoading()
            Promise.resolve().then(async () => {
              await pushRecord({type: RecordType.EXIT, createAt: new Date()})
              PagerManager.getInstance().switchToPager('index')
            }).catch(showWarning)
              .finally(hideLoading)
          }
        },
        {
          text: '再来一局', callback: () => this.requestOnceMore()
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

  private requestOnceMore() {
    showLoading('处理中')
    Promise.resolve().then(async () => {
      await pushRecord({type: RecordType.REQUEST_ONCE_MORE, createAt: new Date()})
      showWarning('等待对方确认')
      if (this.prompt) {
        this.prompt.buttons[1] = {
          text: '对方确认中...',
        };
        await this.render()
      }
    }).catch(showWarning)
  }

  private exitRound() {
    Promise.resolve().then(async () => {
      const result = await wx.showModal({
        title: '退出游戏',
        content: '退出游戏'
      })
      if (!result.confirm) {
        return
      }
      if (this.pageStatus === 'wait_for_play_card' || this.pageStatus === 'wait_for_judge') {
        // 如果游戏没有结束，那么推送信息
        await pushRecord({type: RecordType.SURRENDER, createAt: new Date()})
      }
      PagerManager.getInstance().switchToPager('index')
    }).catch(showWarning)
  }
}
