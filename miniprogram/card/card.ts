export interface Card {
  readonly name: string;
  readonly level: number;
  readonly type: 'figure' | 'weapon';
  readonly imageUrl: string;
}

export function getAllCards(): Card[] {
  return [
    {name: '工兵', type: 'figure', level: 1, imageUrl: 'images/card/司令.png'},
    {name: '排长', type: 'figure', level: 2, imageUrl: 'images/card/司令.png'},
    {name: '连长', type: 'figure', level: 3, imageUrl: 'images/card/司令.png'},
    {name: '营长', type: 'figure', level: 4, imageUrl: 'images/card/司令.png'},
    {name: '团长', type: 'figure', level: 5, imageUrl: 'images/card/司令.png'},
    {name: '师长', type: 'figure', level: 6, imageUrl: 'images/card/司令.png'},
    {name: '军长', type: 'figure', level: 7, imageUrl: 'images/card/司令.png'},
    {name: '司令', type: 'figure', level: 8, imageUrl: 'images/card/司令.png'},
    {name: '地雷', type: 'weapon', level: 0, imageUrl: 'images/card/司令.png'},
    {name: '炸弹', type: 'weapon', level: 0, imageUrl: 'images/card/司令.png'},
  ]
}

/**
 * 判定结果.
 */
export interface Judgement {
  /**
   * 我方.
   */
  ourSide: 'discard' | 'keep' | 'acquire';
  /**
   * 对方.
   */
  otherSide: 'discard' | 'keep' | 'acquire';
}

/**
 * 判定牌.
 * @param ourSide 我方的牌
 * @param otherSide 对方的牌
 */
export function judge(ourSide: Card, otherSide: Card): Judgement {
  if (ourSide.type === 'figure') {
    if (otherSide.type === 'figure') {
      return {
        ourSide: ourSide.level > otherSide.level ? 'keep' : 'discard',
        otherSide: otherSide.level > ourSide.level ? 'keep' : 'discard'
      }
    }
    if (otherSide.type === 'weapon') {
      if (otherSide.name === '地雷') {
        if (ourSide.name === '工兵') {
          return {
            ourSide: 'acquire',
            otherSide: 'discard'
          }
        }
        return {
          ourSide: 'discard',
          otherSide: 'discard'
        }
      } else {
        return {
          ourSide: 'discard',
          otherSide: 'discard'
        }
      }
    }
    throw `未知手牌类型：${otherSide.type}`;
  }
  if (ourSide.type === 'weapon') {
    if (otherSide.type === 'weapon') {
      return {
        ourSide: 'discard',
        otherSide: 'discard'
      }
    }
    if (otherSide.type === 'figure') {
      if (ourSide.name === '地雷' && otherSide.name === '工兵') {
        return {
          ourSide: 'discard',
          otherSide: "acquire"
        }
      } else {
        return {
          ourSide: 'discard',
          otherSide: 'discard'
        }
      }
    }
    throw `未知手牌类型：${otherSide.type}`;
  }
  throw `未知手牌类型：${ourSide.type}`;
}