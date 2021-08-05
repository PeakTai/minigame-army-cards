import {Element, getRealBoundingOfElement, ImageElement, TextElement} from "./element";
import Basis from "./basis";

// 渲染器，负责渲染各种元素

/**
 * 渲染普通的元素.
 * @param element
 */
export function renderElement(element: Element) {
  const renderContext = Basis.getInstance().getRenderContext();
  // 如果普通的元素没有背景也没有边框，给错误提示
  if (!element.backgroundColor && !element.border) {
    console.error('元素既无背景也无边框，无法渲染', element)
    throw '元素既无背景也无边框，无法渲染'
  }
  const bounding = getRealBoundingOfElement(element)
  if (element.border) {
    renderContext.strokeStyle = element.border.color
    renderContext.lineWidth = element.border.width
    renderContext.strokeRect(bounding.left, bounding.top, bounding.width, bounding.height)
  }
  if (element.backgroundColor) {
    renderContext.fillStyle = element.backgroundColor
    renderContext.fillRect(bounding.left, bounding.top, bounding.width, bounding.height)
  }
}

/**
 * 渲染图片.
 * @param element
 */
export function renderImage(element: ImageElement) {
  const renderContext = Basis.getInstance().getRenderContext();
  const bounding = getRealBoundingOfElement(element)
  renderContext.drawImage(element.image as any, bounding.left, bounding.top, bounding.width, bounding.height)
}

export function renderText(element: TextElement) {
  const renderContext = Basis.getInstance().getRenderContext();
  const bounding = getRealBoundingOfElement(element)
  if (element.fontSize > element.lineHeight) {
    console.error('文字的大小大于行高，无法渲染', element)
    throw '文字的大小大于行高，无法渲染'
  }
  if (!element.text) {
    return
  }
  renderContext.fillStyle = element.color
  renderContext.textBaseline = 'top'
  renderContext.font = `${element.fontSize}px Arial`
  // 文本较为复杂，需要估计长度，然后判定渲染
  // 先拆分成行
  const lines: string[] = []
  let tempLine = ''
  for (let i = 0; i < element.text.length; i++) {
    tempLine += element.text.charAt(i)
    const textWidth = renderContext.measureText(tempLine).width
    if (textWidth >= bounding.width) {
      lines.push(tempLine)
      tempLine = ''
    }
  }
  if (tempLine) {
    lines.push(tempLine)
  }
  // 逐行渲染
  for (let i = 0; i < lines.length; i++) {
    const text = lines[i]
    let top = bounding.top + i * element.lineHeight
    // 超出范围则隐藏
    if (top + element.lineHeight > bounding.top + bounding.height) {
      console.warn('文本超出范围，部分文字被隐藏', element)
      break
    }
    // 让文字在中间，算出真正的行高
    top = top + (element.lineHeight - element.fontSize) / 2
    if (element.align === 'right') {
      const textWidth = renderContext.measureText(text).width
      const left = bounding.left + bounding.width - textWidth
      renderContext.fillText(text, left, top)
    } else if (element.align === 'center') {
      const textWidth = renderContext.measureText(text).width
      const left = (bounding.left + bounding.width - textWidth) / 2
      renderContext.fillText(text, left, top)
    } else {// 默认left
      renderContext.fillText(text, bounding.left, top)
    }
  }
}


