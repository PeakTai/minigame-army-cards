import {Card} from "../card/card";

/**
 * 记录类型：出牌、判定、投降等竺.
 */
export enum RecordType {
  /**
   * 玩家出牌.
   */
  PLAY_CARD = "PLAY_CARD",
  /**
   * 出牌判定.
   */
  JUDGE = 'JUDGE',
  /**
   * 玩家投降.
   */
  SURRENDER = 'SURRENDER',
  /**
   * 结束.有一方输了，或是平手.
   */
  ENDING = 'ENDING',
  /**
   * 请求再来一局.
   */
  REQUEST_ONCE_MORE = 'REQUEST_ONCE_MORE',
  /**
   * 同意.
   */
  AGREE = 'AGREE',
  /**
   * 拒绝.
   */
  REFUSE = 'REFUSE',
  /**
   * 催促.对方超过一定的时间没有出牌，可以催促.
   */
  URGE = 'URGE',
  /**
   * 退出，仅在玩家离开时记录一下，提醒别的玩家
   */
  EXIT = 'EXIT'
}

/**
 * 判定结果.
 */
export interface JudgeResult {
  playerOpenId: string;
  result: 'discard' | 'keep' | 'acquire';
}

export interface EndingResult {
  playerOpenId: string;
  result: 'victory' | 'defeat' | 'draw';
}

/**
 * 游戏对战中的记录，出牌。判定，投降，结束等.
 */
export interface Record {
  /**
   * 记录类型.
   */
  type: RecordType,
  /**
   * 玩家id，如果是玩家的操作则会有值.
   */
  playerOpenId?: string;
  /**
   * 牌，如果是出牌则会有值.
   */
  card?: Card;
  /**
   * 判定结果.
   */
  judgeResults?: JudgeResult[];
  /**
   * 结局.
   */
  endingResults?: EndingResult[];
  /**
   * 创建时间.
   */
  createAt: Date
}
