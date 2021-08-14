import Pager from "../../core/Pager";
import {ButtonElement, Element, getRealBoundingOfElement, ImageElement, TextElement} from "../../core/element";
import {hideLoading, showLoading, showWarning} from "../../utils/message";
import UserInfo = WechatMinigame.UserInfo;
import {AuthInfo, getAuthInfo} from "../../service/auth";
import {
  createRoundByWaitingPlayer,
  createWaitingPlayer, deleteWaitingPlayer,
  findWaitingPlayerByOpenId,
  WaitingPlayer, watchCurrentPlayer,
  watchPlayerList
} from "../../service/waiting-player";
import PagerManager from "../../core/PagerManager";
import ISnapshot = DB.ISnapshot;
import {findRoundByPlayerOpenId} from "../../service/round";
import Image = WechatMinigame.Image;
import Basis from "../../core/basis";

export default class PvpAutoMatching extends Pager {

  private pvpStatus: 'ready' | 'confirmUserInfo' = 'ready'
  private userInfoCallback: ((userInfo?: UserInfo) => void) | null = null
  private player: WaitingPlayer | null = null;
  private auth: AuthInfo | null = null;
  private listWatch: DB.RealtimeListener | null = null;
  private playerWatch: DB.RealtimeListener | null = null;
  private avatar: Image | null = null

  protected buildElements(): Element[] {
    const elements: Element[] = []
    const bg: Element = {
      backgroundColor: '#996699',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0
    }
    elements.push(bg)
    if (this.pvpStatus === "confirmUserInfo") {
      // 一层蒙版，上面是提示信息和确认取消按钮
      const mask: Element = {
        backgroundColor: '#996699',
        top: 0,
        left: 0,
        bottom: 0,
        right: 0
      }
      elements.push(mask)
      const promptText: TextElement = {
        type: "text",
        text: '程序需要读取您的昵称和头像信息才能进行自动匹配，点击确认继续完成操作。',
        fontSize: this.getWidth() * 0.05,
        left: this.getWidth() * 0.05,
        top: this.getWidth() * 0.3,
        lineHeight: this.getWidth() * 0.12,
        height: this.getWidth() * 0.4,
        width: this.getWidth() * 0.9,
        color: 'white',
        align: 'left',
      }
      elements.push(promptText)
      // 两个按钮，一个按钮必须是微信的
      // 微信的用户信息授权按钮
      // 使用系统中的库来确定最终位置
      const virtualElement: Element = {
        top: this.getWidth() * 0.7,
        right: this.getWidth() * 0.05,
        height: this.getWidth() * 0.1,
        width: this.getWidth() * 0.4,
      }
      const bounding = getRealBoundingOfElement(virtualElement)
      const ratio = wx.getSystemInfoSync().pixelRatio
      // 微信给的按钮还没有这么简单，需要再转换下比例，微信强制使用按钮真的恶心
      let userInfoButton = wx.createUserInfoButton({
        type: 'text',
        text: '确认',
        withCredentials: true,
        style: {
          left: bounding.left / ratio,
          top: bounding.top / ratio,
          width: bounding.width / ratio,
          height: bounding.height / ratio,
          lineHeight: (this.getWidth() * 0.1) / ratio,
          backgroundColor: '#339966',
          color: '#ffffff',
          textAlign: 'center',
          fontSize: (this.getWidth() * 0.05) / ratio,
          borderRadius: (bounding.height / ratio / 5),
          borderColor: '#339966',
          borderWidth: 1
        }
      })
      userInfoButton.onTap((res) => {
        console.log('userInfo', res)
        Promise.resolve().then(async () => {
          this.pvpStatus = 'ready'
          userInfoButton.destroy()
          await this.render()
          if (this.userInfoCallback) {
            this.userInfoCallback(res ? res.userInfo : undefined)
            this.userInfoCallback = null
          }
        }).catch(showWarning)
      })
      const cancelButton: ButtonElement = {
        type: "button",
        text: '算了',
        top: this.getWidth() * 0.7,
        left: this.getWidth() * 0.05,
        height: this.getWidth() * 0.1,
        width: this.getWidth() * 0.4,
        fontSize: this.getWidth() * 0.05,
        onclick: () => {
          this.pvpStatus = "ready"
          this.userInfoCallback = null
          userInfoButton.destroy()
          this.render().catch(showWarning)
        }
      }
      elements.push(cancelButton)
    }
    if (this.pvpStatus === 'ready' && this.player) {
      // 头像昵称显示
      if (this.avatar) {
        const avatar: ImageElement = {
          type: 'image',
          image: this.avatar,
          left: this.getWidth() * 0.05,
          top: this.getWidth() * 0.25,
          height: this.getWidth() * 0.08,
          width: this.getWidth() * 0.08,
        }
        elements.push(avatar)
      }
      const nickname: TextElement = {
        type: 'text',
        text: this.player.userInfo.nickName,
        left: this.getWidth() * 0.18,
        top: this.getWidth() * 0.25,
        height: this.getWidth() * 0.1,
        width: this.getWidth() * 0.72,
        fontSize: this.getWidth() * 0.05,
        lineHeight: this.getWidth() * 0.1,
        align: 'left',
        color: 'white'
      }
      elements.push(nickname)
      const prompt: TextElement = {
        type: "text",
        text: "正在匹配中，请耐心等待...",
        fontSize: this.getWidth() * 0.05,
        left: this.getWidth() * 0.05,
        top: this.getWidth() * 0.6,
        lineHeight: this.getWidth() * 0.07,
        height: this.getWidth() * 0.2,
        width: this.getWidth() * 0.9,
        color: 'white',
        align: 'left',
      }
      elements.push(prompt)
      // 操作按钮，回到首页和取消邀请
      const backButton: ButtonElement = {
        type: "button",
        text: '回到菜单',
        top: this.getWidth() * 1.1,
        right: this.getWidth() * 0.05,
        height: this.getWidth() * 0.1,
        width: this.getWidth() * 0.4,
        fontSize: this.getWidth() * 0.05,
        onclick: () => this.backToIndex()
      }
      elements.push(backButton)
      const cancelButton: ButtonElement = {
        type: 'button',
        text: '取消匹配',
        top: this.getWidth() * 1.1,
        left: this.getWidth() * 0.05,
        height: this.getWidth() * 0.1,
        width: this.getWidth() * 0.4,
        fontSize: this.getWidth() * 0.05,
        onclick: () => this.cancelMatch()
      }
      elements.push(cancelButton)
    }
    return elements;
  }

  protected destroy(): void {
    if (this.listWatch) {
      this.listWatch.close().catch(showWarning)
    }
    if (this.playerWatch) {
      this.playerWatch.close().catch(showWarning)
    }
  }

  private cancelMatch() {
    Promise.resolve().then(async () => {
      if (!this.player) {
        return
      }
      const result = await wx.showModal({
        title: '取消匹配',
        content: '取消邀请将会删除您授权的所有信息，是否继续？',
      })
      if (!result.confirm) {
        return
      }
      await deleteWaitingPlayer(this.player._id)
      PagerManager.getInstance().switchToPager('index')
    }).catch(showWarning)
      .finally(hideLoading)
  }

  private backToIndex() {
    Promise.resolve().then(async () => {
      const result = await wx.showModal({
        title: '回到首页',
        content: '回到首页后，匹配信息不会丢失，还可以重新进入继续匹配，是否要回到首页？',
      })
      if (!result.confirm) {
        return
      }
      PagerManager.getInstance().switchToPager('index')
    }).catch(showWarning)
  }

  getId(): string {
    return "pvpAutoMatching";
  }

  protected init(): void {
    showLoading()
    Promise.resolve().then(async () => {
      // 获取当前用户的一玩家信息
      this.auth = await getAuthInfo()
      const player = await findWaitingPlayerByOpenId(this.auth.openid)
      if (player) {
        this.pvpStatus = 'ready'
        this.player = player
        if (this.player.userInfo.avatarUrl) {
          this.avatar = await Basis.getInstance().loadImage(this.player.userInfo.avatarUrl)
        }
        await this.render()
        this.listWatch = watchPlayerList(this.handlePlayerListChange.bind(this), this.handleWatchError.bind(this))
        this.playerWatch = watchCurrentPlayer(this.auth.openid, this.handlePlayerInfoChange.bind(this), this.handleWatchError.bind(this))
        return
      }
      // 获取用户信息来创建玩家信息
      this.pvpStatus = 'confirmUserInfo'
      this.userInfoCallback = userInfo => this.handleCreatePlayerInfo(userInfo)
      await this.render()
    }).catch(showWarning)
      .finally(hideLoading)
  }

  /**
   * 处理息的信息变化，自己的信息不存在了，就是游戏开始了，自己已经不在等待列表中了
   * @param snapshot
   * @private
   */
  private handlePlayerInfoChange(snapshot: ISnapshot) {
    if (snapshot.type === 'init') {
      return
    }
    // 如果自己的信息不存在，那么就是游戏被创建了
    if (!snapshot.docChanges) {
      return;
    }
    Promise.resolve().then(async () => {
      if (!this.player) {
        return
      }
      for (let docChange of snapshot.docChanges) {
        if (docChange.dataType === 'remove') {
          // 开始游戏
          const round = await findRoundByPlayerOpenId(this.player._openid)
          if (round) {
            PagerManager.getInstance().switchToPager('pvpRound', {roundId: round._id})
            return
          }
        }
      }
    }).catch(showWarning)
  }

  /**
   * 处理玩家列表中的数据变化
   * @param snapshot
   * @private
   */
  private handlePlayerListChange(snapshot: ISnapshot) {
    console.log('handlePlayerListChange', snapshot)
    if (!snapshot.docChanges) {
      return
    }
    Promise.resolve().then(async () => {
      if (!this.player) {
        return;
      }
      const matchPlayer = snapshot.docChanges.find(item => this.player && item.doc._id !== this.player._id)
      if (matchPlayer) {
        // 发送请求进行玩家的匹配
        const roundId = await createRoundByWaitingPlayer()
        PagerManager.getInstance().switchToPager('pvpRound', {roundId})
      }
    }).catch(showWarning)

  }

  private handleWatchError(err: any) {
    Promise.resolve().then(async () => {
      console.error(err)
      await wx.showModal({
        title: '异常中断',
        content: '失去连接，程序已经掉线，请返回菜单后重新进入',
        showCancel: false,
        confirmText: '返回菜单'
      })
      PagerManager.getInstance().switchToPager('pvpMenu')
    }).catch(showWarning)
  }

  private handleCreatePlayerInfo(userInfo?: UserInfo) {
    Promise.resolve().then(async () => {
      if (!userInfo) {
        await wx.showModal({
          title: '匹配失败',
          content: '无法获取玩家信息，无法进行匹配',
          showCancel: false,
          confirmText: '返回菜单'
        })
        PagerManager.getInstance().switchToPager('pvpMenu')
        return
      }
      // 开始创建玩家信息
      this.player = await createWaitingPlayer(userInfo)
      if (this.player.userInfo.avatarUrl) {
        this.avatar = await Basis.getInstance().loadImage(this.player.userInfo.avatarUrl)
      }
      this.listWatch = watchPlayerList(this.handlePlayerListChange.bind(this), this.handleWatchError.bind(this))
      this.playerWatch = watchCurrentPlayer(this.player._openid, this.handlePlayerInfoChange.bind(this), this.handleWatchError.bind(this))
      this.pvpStatus = 'ready'
      this.userInfoCallback = null
      await this.render()
    }).catch(showWarning)
  }

}
