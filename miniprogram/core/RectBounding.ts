/**
 * 获取矩形的边界信息.
 */
export class RectBounding {
  readonly left: number;
  readonly top: number;
  readonly height: number;
  readonly width: number;


  constructor(left: number, top: number,  width: number,height: number) {
    this.left = left;
    this.top = top;
    this.height = height;
    this.width = width;
  }

  /**
   * 判定是否包含一个点
   * @param x
   * @param y
   */
  public contain(x: number, y: number): boolean {
    const {pixelRatio} = wx.getSystemInfoSync()
    const realX = x * pixelRatio;
    const realY = y * pixelRatio;
    return realX >= this.left
      && realX <= this.width + this.left
      && realY >= this.top
      && realY <= this.top + this.height
  }
}