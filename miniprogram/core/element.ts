/**
 * 通用元素.
 */
import Basis from "./basis";
import Image = WechatMinigame.Image;

export interface Element {
  top?: number;
  left?: number;
  right?: number;
  bottom?: number;
  width?: number;
  height?: number;
  onclick?: () => void;
  shadow?: Shadow;
  border?: Border;
  backgroundColor?: string;
}

/**
 * 阴影.
 */
export interface Shadow {
  x: number;
  y: number;
  blur: number;
  color: string;
}

export interface Border {
  width: number;
  color: string;
}

/**
 * 文本元素.
 */
export interface TextElement extends Element {
  type: 'text';
  /**
   * 文本内容.
   */
  text: string;
  fontSize: number;
  lineHeight: number;
  color: string;
  align: 'left' | 'right' | 'center'
}

/**
 * 图片元素.
 */
export interface ImageElement extends Element {
  type: 'image';
  image: Image;
}

export interface ButtonElement extends Element {
  type: 'button',
  text: string,
  fontSize?: number,
  bgColor?: string,
  color?: string
}

/**
 * 元素边界信息.
 */
interface Bounding {
  readonly left: number;
  readonly top: number;
  readonly height: number;
  readonly width: number;
}

/**
 * 获取元素真正的边界信息.
 * @param element
 */
export function getRealBoundingOfElement(element: Element): Bounding {
  const basis = Basis.getInstance();
  const availableArea = basis.getAvailableArea();
  // 先处理横向的，再处理纵向的
  let left: number;
  let width: number;
  if (element.left !== undefined) {
    left = availableArea.left + element.left
    if (element.right !== undefined) {
      width = availableArea.width - element.right - element.left
      if (width < 0) {
        console.error('元素宽度小于0', element)
        throw `元素宽度小于0，left：${element.left} ，right： ${element.right}`
      }
    } else {
      if (element.width === undefined) {
        console.log(element)
        throw '无法获取元素的宽度信息'
      }
      width = element.width
    }
  } else {
    if (element.right === undefined) {
      console.error('获取不到准确的位置，left 和 right 至少有一个', element)
      throw '获取不到准确的位置，left 和 right 至少有一个'
    }
    //通过 right 转换，没有left，那必须要有 right 和 width
    if (element.width === undefined) {
      console.log('无法获取元素的宽度信息', element)
      throw '无法获取元素的宽度信息'
    }
    width = element.width
    left = availableArea.left + availableArea.width - element.right - width;
  }
  // 纵向信息
  let height: number, top: number;
  if (element.top !== undefined) {
    top = availableArea.top + element.top;
    if (element.bottom !== undefined) {
      height = availableArea.height - element.bottom - element.top
      if (height < 0) {
        console.error('元素的高度不能小于0', element)
        throw '元素的高度不能小于0'
      }
    } else {
      if (element.height == undefined) {
        console.log('无法获取元素的高度', element)
        throw '无法获取元素的高度'
      }
      height = element.height
    }
  } else {
    if (element.bottom === undefined || element.height === undefined) {
      console.log('无法获取元素的位置和高度', element)
      throw '无法获取元素的位置和高度'
    }
    height = element.height;
    top = availableArea.top + availableArea.height - element.height - element.bottom
  }
  return {left: Math.round(left), top: Math.round(top), width: Math.round(width), height: Math.round(height)}
}

export function boundingContain(element: Element, x: number, y: number): boolean {
  const bounding = getRealBoundingOfElement(element);
  const {pixelRatio} = wx.getSystemInfoSync()
  const realX = x * pixelRatio;
  const realY = y * pixelRatio;
  return realX >= bounding.left
    && realX <= bounding.width + bounding.left
    && realY >= bounding.top
    && realY <= bounding.top + bounding.height
}