// 云函数入口文件
const cloud = require('wx-server-sdk')
const {getAllCards} = require("./card");

// 与小程序端一致，均需调用 init 方法初始化
cloud.init({
    // API 调用都保持和云函数当前所在环境一致
    env: cloud.DYNAMIC_CURRENT_ENV
})

// 可在入口函数外缓存 db 对象
const db = cloud.database({
    // 该参数从 wx-server-sdk 1.7.0 开始支持，默认为 true，指定 false 后可使得 doc.get 在找不到记录时不抛出异常
    throwOnNotFound: false,
})

// 数据库查询更新指令对象
const _ = db.command

// 返回数据 {ok:boolean,error?:Error,roundId?:string}
// pvp  在线对战，推送记录，完成运算，再返回给客户端
exports.main = async (event, context) => {
    const wxContext = cloud.getWXContext()
    const openid = wxContext.OPENID
    const record = event.record
    try {
        if (!record) {
            return {ok: false, error: 'record 参数缺失'}
        }
        const getRoundResult = await db.collection('round').where({'playerInfos.openId': openid}).get()
        const round = getRoundResult.data && getRoundResult.data.length ?
            getRoundResult.data[0] : undefined
        if (!round) {
            return {ok: false, error: '找不到正在进行的游戏'}
        }
        const ourSide = round.playerInfos.find(player => player.openId === openid)
        if (!ourSide) {
            throw '找不到当前玩家信息'
        }
        const otherSide = round.playerInfos.find(player => player.openId !== openid)
        if (!otherSide) {
            throw '找不到对战方玩家信息'
        }
        // 判定行为操作
        const _ = db.command
        // 出牌
        if (record.type === 'PLAY_CARD') {
            if (round.status !== 'underway') {
                throw '游戏不在进行中'
            }
            await playCard(openid, round, record, ourSide, otherSide)
            return {ok: true}
        }// 出牌结束
        // 投降
        if (record.type === 'SURRENDER') {
            if (round.status !== 'underway') {
                throw '游戏不在进行中'
            }
            await surrender(openid, round, record, ourSide, otherSide)
            return {ok: true}
        }
        if (record.type === 'URGE') {
            if (round.status !== 'underway') {
                throw '游戏不在进行中'
            }
            await urge(openid, round, record, ourSide, otherSide)
            return {ok: true}
        }
        // 请求再来一局
        if (record.type === 'REQUEST_ONCE_MORE') {
            if (round.status !== 'finished') {
                throw '游戏还未结束'
            }
            await requestOnceMore(openid, round, record, ourSide, otherSide)
            return {ok: true}
        }
        // 同意对方的请求
        if (record.type === 'AGREE') {
            if (round.status !== 'finished') {
                throw '游戏还未结束'
            }
            await aggree(openid, round, record, ourSide, otherSide)
            return {ok: true}
        }
        // 拒绝对方的请求
        if (record.type === 'REFUSE') {
            if (round.status !== 'finished') {
                throw '游戏还未结束'
            }
            await refuse(openid, round, record, ourSide, otherSide)
            return {ok: true}
        }
        // 退出仅适用于游戏已经结束了，要离开的情况
        // 游戏进行中要退出可以投降
        if (record.type === 'EXIT') {
            if (round.status !== 'finished') {
                throw '游戏还未结束'
            }
            await exitGame(openid, round)
            return {ok: true}
        }
        throw '无效的记录类型：' + record.type
    } catch (e) {
        console.error('处理推送记录发生错误', openid, record, e)
        return {ok: false, error: e}
    }
}

async function exitGame(openId, round) {
    const roundCollection = db.collection('round')
    await roundCollection.doc(round._id).update({
        data: {
            records: _.push([
                {type: 'EXIT', playerOpenId: openId, createAt: new Date()}
            ]),
            updateAt: new Date()
        }
    })
}

async function refuse(openId, round, record, ourSide, otherSide) {
    const lastRecord = round.records[round.records.length - 1]
    if (!lastRecord) {
        throw '对方没有发起再战一局的请求'
    }
    if (lastRecord.type !== 'REQUEST_ONCE_MORE' || lastRecord.playerOpenId !== otherSide.openId) {
        throw '对方没有发起再战一局的请求'
    }
    const roundCollection = db.collection('round')
    await roundCollection.doc(round._id).update({
        data: {
            records: _.push([
                {type: 'REFUSE', playerOpenId: openId, createAt: new Date()}
            ]),
            updateAt: new Date()
        }
    })
}

/**
 * 同意对方请求
 * @param openId
 * @param round
 * @param record
 * @param ourSide
 * @param otherSide
 * @returns {Promise<void>}
 */
async function aggree(openId, round, record, ourSide, otherSide) {
    const lastRecord = round.records[round.records.length - 1]
    if (!lastRecord) {
        throw '对方没有发起再战一局的请求'
    }
    if (lastRecord.type !== 'REQUEST_ONCE_MORE' || lastRecord.playerOpenId !== otherSide.openId) {
        throw '对方没有发起再战一局的请求'
    }
    // 创建记录
    const roundCollection = db.collection('round')
    await roundCollection.doc(round._id).update({
        data: {
            records: _.push([
                {type: 'AGREE', playerOpenId: openId, createAt: new Date()}
            ]),
            updateAt: new Date()
        }
    })
    // 同意之后开始创建新的游戏
    await roundCollection.doc(round._id).remove()
    await roundCollection.add({
        data: {
            playerInfos: [
                Object.assign({}, ourSide.userInfo, {
                    openId: ourSide.openId,
                    keepCards: getAllCards(),
                    playOutCards: null
                }),
                Object.assign({}, otherSide.userInfo, {
                    openId: otherSide.openId,
                    keepCards: getAllCards(),
                    playOutCards: null
                })
            ],
            records: [],
            _openid: otherSide.openId,
            status: 'underway',
            createAt: new Date(),
            updateAt: new Date()
        }
    })
}


async function requestOnceMore(openId, round, record, ourSide, otherSide) {
    const roundCollection = db.collection('round')
    // 保存投降信息
    await roundCollection.doc(round._id).update({
        data: {
            records: _.push([
                {type: 'REQUEST_ONCE_MORE', playerOpenId: openId, createAt: new Date()}
            ]),
            updateAt: new Date()
        }
    })
}

/**
 * 催促，插入一条记录
 * @param openId
 * @param round
 * @param record
 * @param ourSide
 * @param otherSide
 * @returns {Promise<void>}
 */
async function urge(openId, round, record, ourSide, otherSide) {
    // 要求必须是我方已经出牌，对方没有出牌，时间已经过去有一分钟
    if (!ourSide.playOutCard) {
        throw '我方没有出牌'
    }
    if (otherSide.playOutCard) {
        throw '对方已经出牌'
    }
    const lastRecord = round.records[round.records.length - 1]
    if (!lastRecord) {
        throw '现在不能发起提醒'
    }
    if (lastRecord.createAt.getTime() + 60000 > new Date().getTime()) {
        throw '现在还不能发起提醒'
    }

    const roundCollection = db.collection('round')
    // 保存投降信息
    await roundCollection.doc(round._id).update({
        data: {
            records: _.push([
                {type: 'URGE', playerOpenId: openId, createAt: new Date()}
            ]),
            updateAt: new Date()
        }
    })
}

async function surrender(openId, round, record, ourSide, otherSide) {
    await db.runTransaction(async transaction => {
        const _ = db.command
        const roundCollection = transaction.collection('round')
        // 保存投降信息
        await roundCollection.doc(round._id).update({
            data: {
                playerInfos: [ourSide, otherSide],
                records: _.push([
                    {type: 'SURRENDER', playerOpenId: openId, createAt: new Date()}
                ]),
                updateAt: new Date()
            }
        })
        // 输赢信息
        await roundCollection.doc(round._id).update({
            data: {
                records: _.push([
                    {
                        type: 'ENDING', createAt: new Date(), endingResults: [
                            {playerOpenId: ourSide.openId, result: 'defeat'},
                            {playerOpenId: otherSide.openId, result: 'victory'}
                        ]
                    }
                ]),
                status: 'finished',
                updateAt: new Date()
            }
        })
    })
}


async function playCard(openId, round, record, ourSide, otherSide) {
    await db.runTransaction(async transaction => {
        const _ = db.command
        const roundCollection = transaction.collection('round')
        if (!record.card) {
            throw '缺少出牌信息'
        }
        if (ourSide.playOutCard) {
            throw '您已经出过牌了'
        }
        const cardIdx = ourSide.keepCards.findIndex(card => card.name === record.card.name)
        if (cardIdx === -1) {
            throw '找不到要出的牌'
        }
        ourSide.keepCards.splice(cardIdx, 1)
        ourSide.playOutCard = record.card
        // 先保存出牌记录
        await roundCollection.doc(round._id).update({
            data: {
                playerInfos: [ourSide, otherSide],
                records: _.push([
                    {type: 'PLAY_CARD', playerOpenId: openId, card: record.card, createAt: new Date()}
                ]),
                updateAt: new Date()
            }
        })
        // 有了出牌信息就要做出判定
        // 判定对方是否也出牌了
        if (!otherSide.playOutCard) {
            // 对方没有出版则不判定
            return
        }
        // 判定
        const result = judge(ourSide.playOutCard, otherSide.playOutCard)
        // 我方结果
        if (result.ourSide === 'keep') {
            ourSide.keepCards.push(ourSide.playOutCard)
        } else if (result.ourSide === 'acquire') {
            ourSide.keepCards.push(ourSide.playOutCard)
            ourSide.keepCards.push(otherSide.playOutCard)
        }
        // 对方结果
        if (result.otherSide === 'keep') {
            otherSide.keepCards.push(otherSide.playOutCard)
        } else if (result.otherSide === 'acquire') {
            otherSide.keepCards.push(ourSide.playOutCard)
            otherSide.keepCards.push(otherSide.playOutCard)
        }
        ourSide.playOutCard = null
        otherSide.playOutCard = null
        // 判定记录保存
        await roundCollection.doc(round._id).update({
            data: {
                playerInfos: [ourSide, otherSide],
                records: _.push([
                    {
                        type: 'JUDGE', createAt: new Date(), judgeResults: [
                            {playerOpenId: ourSide.openId, result: result.ourSide},
                            {playerOpenId: otherSide.openId, result: result.otherSide},
                        ]
                    }
                ]),
                updateAt: new Date()
            }
        })
        // 最后判定是否已经出胜负
        if (!ourSide.keepCards.length && !otherSide.keepCards.length) {
            // 平局
            await roundCollection.doc(round._id).update({
                data: {
                    records: _.push([
                        {
                            type: 'ENDING', createAt: new Date(), endingResults: [
                                {playerOpenId: ourSide.openId, result: 'draw'},
                                {playerOpenId: otherSide.openId, result: 'draw'}
                            ]
                        }
                    ]),
                    status: 'finished',
                    updateAt: new Date()
                }
            })
        } else if (!ourSide.keepCards.length) {
            // 输
            await roundCollection.doc(round._id).update({
                data: {
                    records: _.push([
                        {
                            type: 'ENDING', createAt: new Date(), endingResults: [
                                {playerOpenId: ourSide.openId, result: 'defeat'},
                                {playerOpenId: otherSide.openId, result: 'victory'}
                            ]
                        }
                    ]),
                    status: 'finished',
                    updateAt: new Date()
                }
            })
        } else if (!otherSide.keepCards.length) {
            // 赢
            await roundCollection.doc(round._id).update({
                data: {
                    records: _.push([
                        {
                            type: 'ENDING', createAt: new Date(), endingResults: [
                                {playerOpenId: ourSide.openId, result: 'victory'},
                                {playerOpenId: otherSide.openId, result: 'defeat'}
                            ]
                        }
                    ]),
                    status: 'finished',
                    updateAt: new Date()
                }
            })
        }
    })
}

function judge(ourSide, otherSide) {
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
