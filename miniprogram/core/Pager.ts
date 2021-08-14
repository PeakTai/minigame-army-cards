import {boundingContain, ButtonElement, Element, ImageElement, TextElement, TiledBgElement} from "./element";
import Basis from "./basis";
import OnTouchStartCallbackResult = WechatMinigame.OnTouchStartCallbackResult;
import {renderButton, renderElement, renderImage, renderText, renderTiledBg} from "./render";

/**
 * 页面抽象类.
 */
export default abstract class Pager {

  private elements: Element[] = []

  private touchStartHandler: null | ((result: OnTouchStartCallbackResult) => void) = null

  private status: 'active' | 'inactive' = 'active'

  protected getStatus(): 'active' | 'inactive' {
    return this.status;
  }

  private setElements(elements: Element[]): void {
    this.elements = elements;
  }

  /**
   * 获取页面宽度.
   * @protected
   */
  protected getWidth(): number {
    return Basis.getInstance().getAvailableArea().width;
  }

  /**
   * 获取页面高度.
   * @protected
   */
  protected getHeight(): number {
    return Basis.getInstance().getAvailableArea().height;
  }

  /**
   * 渲染，只有调用了这个方法才会将内容重新渲染.
   * @protected
   */
  public render(): Promise<void> {
    if (this.status !== 'active') {
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        this.setElements(this.buildElements());
        // 渲染所有的元素
        for (let element of this.elements) {
          // 判定元素是什么类型，由于都是接口，判定就比较麻烦了，不能使用 instanceof
          const imageElement = element as ImageElement
          if ('image' === imageElement.type && imageElement.image) {
            renderImage(imageElement)
            continue
          }
          const textElement = element as TextElement
          if ('text' === textElement.type && textElement.text) {
            renderText(textElement)
            continue
          }
          const buttonElement = element as ButtonElement
          if ('button' === buttonElement.type && buttonElement.text) {
            renderButton(buttonElement)
            continue
          }
          const tiledBgElement = element as TiledBgElement
          if ('tiled-bg' === tiledBgElement.type && tiledBgElement.image) {
            renderTiledBg(tiledBgElement)
            continue
          }
          // 普通默认渲染
          renderElement(element)
        }
        resolve()
      })
    });
  }

  protected abstract buildElements(): Element[];

  /**
   * 处理渲染事件.
   * @param result
   * @private
   */
  private handleTouchStart(result: OnTouchStartCallbackResult): void {
    const touch = result.touches[0]
    // 判定所有元素的的边界
    for (let i = 0; i < this.elements.length; i++) {
      const element = this.elements[i]
      // 忽略掉背景元素
      const assumedTiledBgElement = element as TiledBgElement
      if ('tiled-bg' === assumedTiledBgElement.type && assumedTiledBgElement.image) {
        continue
      }
      if (!element.onclick) {
        continue
      }
      if (!boundingContain(element, touch.clientX, touch.clientY)) {
        continue
      }
      // 如果边界包含了，那后续的所有元素不包含才可以
      let containByFollow: boolean = false
      for (let j = i + 1; j < this.elements.length; j++) {
        const followEle = this.elements[j]
        if (boundingContain(followEle, touch.clientX, touch.clientY)) {
          containByFollow = true
          break
        }
      }
      // 如果后续的元素也包含这个点，那么不能触发事件，后面的元素覆盖上前面的上面，优先级更高
      if (containByFollow) {
        continue
      }
      // 触发事件
      element.onclick()
      break
    }
  }

  public abstract getId(): string;

  public preInit(query?: any): void {
    this.touchStartHandler = this.handleTouchStart.bind(this)
    wx.onTouchStart(this.touchStartHandler)
    this.status = 'active'
    this.init(query)
  }

  protected abstract init(query?: any): void;

  public preDestroy(): void {
    if (this.touchStartHandler) {
      wx.offTouchStart(this.touchStartHandler)
    }
    this.status = 'inactive'
    this.destroy()
  };

  protected abstract destroy(): void ;
}
