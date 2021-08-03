import Canvas = WechatMinigame.Canvas;

interface AvailableArea {
  width: number;
  height: number;
  /**
   * 可用区域相对于屏幕的宽和高.
   */
  left: number;
  top: number;
}

/**
 * 基础类，提供获画布，计算可用区域信息，坐标转换等.单例模式.
 */
export default class Basis {

  private static instance: Basis | null = null;

  private canvas: Canvas;
  private renderContext: CanvasRenderingContext2D;
  private availableArea: AvailableArea;

  /**
   * 获取实例，只能在 init 方法调用成功后获取到实例.
   */
  public static getInstance(): Basis {
    if (!this.instance) {
      throw new Error('Basis 尚未初始化');
    }
    return this.instance;
  }

  /**
   * 初始化，完成可用区域的计算，画布创建.
   */
  public static async init(): Promise<Basis> {
    if (this.instance) {
      throw 'Basis 已经初始化过了.'
    }
    this.instance = new Basis()
    return this.instance;
  }

  private constructor() {
    this.canvas = wx.createCanvas()
    this.renderContext = this.canvas.getContext('2d')
    // 区域位置
    // 由于有些屏幕比例比较特殊，像 ipad 就是 2:3 的，游戏仅支持 16:9 到 18:9的比例，其它的比例仅显示在中间位置.
    const {windowWidth, windowHeight, pixelRatio} = wx.getSystemInfoSync()
    const realWidth = windowWidth * pixelRatio
    const realHeight = windowHeight * pixelRatio
    this.canvas.width = realWidth
    this.canvas.height = realHeight

    // 屏幕太小也不行
    if (windowWidth < 320) {
      throw '屏幕太小无法正常显示'
    }
    if (windowHeight < 568) {
      throw '屏幕太小无法正常显示'
    }
    const ratio = realWidth / realHeight
    if (ratio >= (8 / 20) && ratio <= (9 / 16)) {
      this.availableArea = {
        width: realWidth,
        height: realHeight,
        left: 0,
        top: 0
      }
      return
    }
    // 计算可用区域位置
    // 屏幕细长的情况，比 16/8 还要长
    if (ratio < (8 / 20)) {
      const height = realWidth * (16 / 9)
      this.availableArea = {
        width: realWidth,
        height,
        left: 0,
        top: (realHeight - height) / 2
      }
      return;
    }
    // 剩下的情况是屏幕比较宽的情况
    const width = realHeight * (9 / 16)
    this.availableArea = {
      width,
      height: realHeight,
      top: 0,
      left: (realWidth - width) / 2
    }
  }

  public getCanvas() {
    return this.canvas;
  }

  public getRenderContext() {
    return this.renderContext;
  }

  public getAvailableArea(): AvailableArea {
    return this.availableArea;
  }

  public clearScreen() {
    const {windowWidth, windowHeight, pixelRatio} = wx.getSystemInfoSync()
    this.getRenderContext().clearRect(0, 0, windowWidth * pixelRatio, windowHeight * pixelRatio);
  }

  public convertPositionLeft(expectLeft: number): number {
    return this.availableArea.left + expectLeft;
  }

  public convertPositionRight(expectRight: number): number {
    return this.availableArea.left + expectRight;
  }

  /**
   * 把期望的相对右坐标转换成实际上的左坐标.
   * @param expectRight
   */
  public convertPositionRightToLeft(expectRight: number): number {
    return this.availableArea.left + this.availableArea.width - expectRight;
  }

  public convertPositionBottom(expectBottom: number): number {
    return this.availableArea.top + expectBottom;
  }

  public convertPositionBottomToTop(expectBottom: number): number {
    return this.availableArea.top + this.availableArea.height - expectBottom;
  }

  public convertPositionTop(expectTop: number): number {
    return this.availableArea.top + expectTop;
  }

  public convertPercentageWidth(width: number): number {
    this.validatePercentage(width)
    return this.availableArea.width * width
  }

  public convertPercentageHeight(height: number): number {
    this.validatePercentage(height)
    return this.availableArea.height * height
  }

  public convertPercentageLeft(left: number): number {
    this.validatePercentage(left)
    return this.availableArea.width * left + this.availableArea.left
  }

  private validatePercentage(percentageSize: number): void {
    if (percentageSize < 0 || percentageSize > 100) {
      throw '百分比不能小于0或者大于1'
    }
  }

  public convertPercentageRight(right: number): number {
    this.validatePercentage(right)
    return this.availableArea.left + this.availableArea.width - this.availableArea.width * right
  }

  public convertPercentageTop(top: number): number {
    this.validatePercentage(top)
    return this.availableArea.top + this.availableArea.height * top
  }

  public convertPercentageBottom(bottom: number): number {
    this.validatePercentage(bottom)
    return this.availableArea.top + this.availableArea.height - this.availableArea.height * bottom
  }

  /**
   * 将实际上的顶点位置转换成相对于可见区域的百分比，如果不在可见区域内，则返回0.
   * @param top
   */
  public convertTopToPercentage(top: number): number {
    if (top < this.availableArea.top) {
      return 0
    }
    return (top - this.availableArea.top) / this.availableArea.height
  }

  public convertLeftToPercentage(left: number): number {
    if (left < this.availableArea.left) {
      return 0
    }
    return (left - this.availableArea.left) / this.availableArea.width
  }


}