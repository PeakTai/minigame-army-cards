import Pager from "../core/Pager";
import {showWarning} from "../utils/message";
import {GameSetting, getGameSetting, setGameSetting} from "../service/game-setting";
import {Element, ImageElement, TextElement} from "../core/element";
import Basis from "../core/basis";
import PagerManager from "../core/PagerManager";
import {playAudio} from "../utils/audio";


export default class Setting extends Pager {

  private gameSetting: GameSetting = getGameSetting()

  protected buildElements(): Element[] {
    const elements: Element[] = []
    if (this.bgImg) {
      const bg: ImageElement = {
        type: "image",
        image: this.bgImg,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0
      }
      elements.push(bg)
    }
    // 标题
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
      text: '游戏设置',
    }
    elements.push(title)

    // 两个设置项，加一个回到主菜单的
    const bgmOption: TextElement = {
      type: 'text',
      top: this.getHeight() * 0.2,
      left: this.getWidth() * 0.05,
      width: this.getWidth() * 0.9,
      fontSize: this.getWidth() * 0.05,
      lineHeight: this.getWidth() * 0.1,
      height: this.getWidth() * 0.12,
      color: 'white',
      align: 'left',
      text: this.gameSetting.bgmEnabled ? '[ v ] 开启背景音乐' : '[ x ] 关闭背景音乐',
      onclick: () => this.toggleBgm()
    }
    elements.push(bgmOption)

    const soundEffectOption: TextElement = {
      type: 'text',
      top: this.getHeight() * 0.2 + this.getWidth() * 0.12,
      left: this.getWidth() * 0.05,
      width: this.getWidth() * 0.9,
      fontSize: this.getWidth() * 0.05,
      lineHeight: this.getWidth() * 0.1,
      height: this.getWidth() * 0.12,
      color: 'white',
      align: 'left',
      text: this.gameSetting.soundEffectEnabled ? '[ v ] 开启游戏音效' : '[ x ] 关闭游戏音效',
      onclick: () => this.toggleSoundEffect()
    }
    elements.push(soundEffectOption)

    const backOption: TextElement = {
      type: 'text',
      top: this.getHeight() * 0.2 + this.getWidth() * 0.24,
      left: this.getWidth() * 0.05,
      width: this.getWidth() * 0.9,
      fontSize: this.getWidth() * 0.05,
      lineHeight: this.getWidth() * 0.1,
      height: this.getWidth() * 0.12,
      color: 'white',
      align: 'left',
      text: '回到主菜单',
      onclick: () => PagerManager.getInstance().switchToPager('index')
    }
    elements.push(backOption)

    return elements;
  }

  protected destroy(): void {
  }

  private toggleBgm() {
    this.gameSetting.bgmEnabled = !this.gameSetting.bgmEnabled
    if (this.gameSetting.bgmEnabled) {
      playAudio('audio/打开音效.wav')
    }
    setGameSetting(this.gameSetting)
    this.render().catch(showWarning)
  }

  private toggleSoundEffect() {
    this.gameSetting.soundEffectEnabled = !this.gameSetting.soundEffectEnabled
    if (this.gameSetting.soundEffectEnabled) {
      playAudio('audio/打开音效.wav')
    }
    setGameSetting(this.gameSetting)
    this.render().catch(showWarning)
  }

  getId(): string {
    return "setting";
  }

  private bgImg: any = null;

  protected init(): void {
    Promise.resolve().then(async () => {
      const basis = Basis.getInstance();
      this.bgImg = await basis.loadImage('images/bg2.png')
      this.gameSetting = getGameSetting()
      this.render().catch(showWarning)
    }).catch(showWarning)
  }

}