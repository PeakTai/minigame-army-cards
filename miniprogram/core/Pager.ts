/**
 * 页面抽象类.
 */
import Basis from "./basis";

export default abstract class Pager {

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

}