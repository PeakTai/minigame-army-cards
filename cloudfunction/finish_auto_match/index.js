// 云函数入口文件
const cloud = require('wx-server-sdk')

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
// 云函数入口函数
exports.main = async (event, context) => {
    try {
        const wxContext = cloud.getWXContext()
        const openid = wxContext.OPENID
        // 判断玩家是不是已经在游戏了
        const getRoundResult = await db.collection('round').where({'players.openId': openid}).get()
        const round = getRoundResult.data && getRoundResult.data.length ?
            getRoundResult.data[0] : undefined
        if (round) {
            return {ok: true, roundId: round._id}
        }
        const getPlayerResult = await db.collection('waiting-player').where({_openid: openid}).get()
        const player = getPlayerResult.data && getPlayerResult.data.length ? getPlayerResult.data[0] : undefined
        if (!player) {
            return {ok: false, error: '找不到要匹配的玩家信息'}
        }
        // 寻找可以匹配的玩家
        const getPlayerListResult = await db.collection('waiting-player').where({})
            .orderBy('createAt', 'desc').limit(10).get()
        const playerList = getPlayerListResult.data && getPlayerListResult.data.length ?
            getPlayerListResult.data : []
        const matchPlayer = playerList.find(item => item._id !== player._id)
        if (!matchPlayer) {
            return {ok: false, error: '找不到可以匹配的玩家'}
        }
        // 开始创建信息：事务中 删除邀请再创建对局
        const roundId = await db.runTransaction(async transaction => {
            const result = await transaction.collection('round').add({
                data: {
                    players: [
                        Object.assign({}, player.userInfo, {openId: player._openid}),
                        Object.assign({}, matchPlayer.userInfo, {openId: matchPlayer._openid})
                    ],
                    _openid: player._openid,
                    createAt: new Date()
                }
            })
            // 删除玩家信息
            await db.collection('waiting-player').doc(player._id).remove()
            await db.collection('waiting-player').doc(matchPlayer._id).remove()
            await transaction.collection('invitation').doc(player._id).remove()
            await transaction.collection('invitation').where({_openid: openid}).remove()
            return result._id
        })
        return {ok: true, roundId}
    } catch (e) {
        return {ok: false, error: e}
    }
}
