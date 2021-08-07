import {ButtonElement, Element, getRealBoundingOfElement, ImageElement, TextElement} from "./element";
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

export function renderButton(element: ButtonElement) {
  const renderContext = Basis.getInstance().getRenderContext();
  const bounding = getRealBoundingOfElement(element)
  // 实现圆角, 画的顺序是（左上角）上（在上角）右（右下角）下（左下角）左
  const radius: number = bounding.height / 5
  // renderContext.arc(0,0,radius,)
  renderContext.lineWidth = 1
  renderContext.strokeStyle = element.bgColor ? element.bgColor : 'white'
  renderContext.beginPath()
  // 左上角
  renderContext.arc(bounding.left + radius, bounding.top + radius, radius, Math.PI, 1.5 * Math.PI)
  // 上
  renderContext.lineTo(bounding.left + bounding.width - radius, bounding.top)
  //右上角
  renderContext.arc(bounding.left + bounding.width - radius, bounding.top + radius, radius, 1.5 * Math.PI, 0)
  // 右
  renderContext.lineTo(bounding.left + bounding.width, bounding.top + bounding.height - radius)
  // 右下角
  renderContext.arc(bounding.left + bounding.width - radius, bounding.top + bounding.height - radius, radius, 0, 0.5 * Math.PI)
  // 下
  renderContext.lineTo(bounding.left + radius, bounding.top + bounding.height)
  // 左下角
  renderContext.arc(bounding.left + radius, bounding.top + bounding.height - radius, radius, 0.5 * Math.PI, Math.PI)
  // 左
  renderContext.lineTo(bounding.left, bounding.top + radius)
  renderContext.closePath()
  renderContext.fillStyle = element.bgColor ? element.bgColor : 'rgba(255,255,255,0.6)'
  // renderContext.shadowBlur = 10
  // renderContext.shadowColor = element.bgColor ? element.bgColor : 'white'
  // renderContext.shadowOffsetY = 0
  // renderContext.shadowOffsetX = 0
  renderContext.fill()

  renderContext.fillStyle = element.color ? element.color : 'black'
  renderContext.shadowBlur = 0
  renderContext.shadowColor = ''

  const fontSize = element.fontSize && element.fontSize < bounding.height
    ? Math.floor(element.fontSize) : Math.floor(bounding.height)
  renderContext.font = `${fontSize}px Arial`
  renderContext.textBaseline = 'top'
  const top = bounding.top + (bounding.height - fontSize) / 2
  const textWidth = renderContext.measureText(element.text).width
  const left = textWidth > bounding.width ? bounding.left : bounding.left + (bounding.width - textWidth) / 2
  renderContext.fillText(element.text, left, top, bounding.width)
}

function resetShadow() {
  const renderContext = Basis.getInstance().getRenderContext();
  renderContext.shadowColor = ''
  renderContext.shadowBlur = 0
  renderContext.shadowOffsetX = 0
  renderContext.shadowOffsetY = 0
}

/**
 * 渲染图片.
 * @param element
 */
export function renderImage(element: ImageElement) {
  const renderContext = Basis.getInstance().getRenderContext();
  const bounding = getRealBoundingOfElement(element)
  if (element.shadow) {
    renderContext.shadowColor = element.shadow.color
    renderContext.shadowBlur = element.shadow.blur
    renderContext.shadowOffsetX = element.shadow.x
    renderContext.shadowOffsetY = element.shadow.y
  } else {
    resetShadow()
  }
  renderContext.drawImage(element.image as any, bounding.left, bounding.top, bounding.width, bounding.height)
  if (element.border) {
    renderContext.lineWidth = element.border.width
    renderContext.strokeStyle = element.border.color
    renderContext.strokeRect(bounding.left, bounding.top, bounding.width, bounding.height)
  }
  if (element.shadow) {
    resetShadow()
  }
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
  let estimateLineLength: number = Math.floor(bounding.width / element.fontSize);
  let idx: number = 0;
  while (true) {
    if (idx >= element.text.length) {
      break
    }
    let length = estimateLineLength;
    if (idx + length > element.text.length) {
      // 0 1 2 3
      length = element.text.length - idx;
    }
    let textWidth = renderContext.measureText(element.text.substr(idx, length)).width
    if (textWidth === bounding.width) {
      lines.push(element.text.substr(idx, length))
      idx = idx + length
      continue
    }
    if (textWidth > bounding.width) {
      // 超出了就要不断的减少
      while (true) {
        length--
        let width = renderContext.measureText(element.text.substr(idx, length)).width
        if (width <= bounding.width) {
          lines.push(element.text.substr(idx, length))
          idx = idx + length
          break
        }
      }
      continue
    }
    // 否则不断的增加
    while (true) {
      if (idx + length >= element.text.length) {
        lines.push(element.text.substr(idx, length))
        idx = idx + length
        break
      }
      length++
      let width = renderContext.measureText(element.text.substr(idx, length)).width
      if (width > bounding.width) {
        lines.push(element.text.substr(idx, length - 1))
        idx = idx + length - 1
        break
      }
    }
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
      const left = bounding.left + (bounding.width - textWidth) / 2
      renderContext.fillText(text, left, top)
    } else {// 默认left
      renderContext.fillText(text, bounding.left, top)
    }
  }
}


