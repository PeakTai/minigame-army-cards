/**
 * 页面抽象类.
 */
import Basis from "./basis";

export default abstract class Pager {

  public abstract getId(): string;

  public abstract init(): void;

  public abstract destroy(): void;

  /**
   * 渲染背景图
   * @param bgUrl 背景图的地址
   * @param corp 是否要裁剪
   */
  public renderBgImg(bgUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      wx.createImage()
      var image = wx.createImage()
      image.onload = function () {
        try {
          const basis = Basis.getInstance()
          const renderContext = basis.getRenderContext();
          renderContext.drawImage(
            image as any,
            basis.convertPositionLeft(0),
            basis.convertPositionTop(0),
            basis.getAvailableArea().width,
            basis.getAvailableArea().height
          );
          resolve()
        } catch (e) {
          reject(e)
        }
      };
      image.onerror = (e) => {
        reject(e)
      };
      image.src = bgUrl
    })
  }

  /***
   * 加载图片，返回图片对象
   */
  public loadImage(url: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const image = wx.createImage()
      image.onload = () => {
        resolve(image)
      };
      image.onerror = (e) => {
        reject(e)
      };
      image.src = url
    })
  }

  public renderBgColor(color: string): void {
    const basis = Basis.getInstance()
    const availableArea = basis.getAvailableArea();
    const renderContext = basis.getRenderContext();
    renderContext.fillStyle = color
    renderContext.fillRect(0, 0, availableArea.width, availableArea.height)
  }

}