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
        const userInfo = event.userInfo
        const code = event.code
        if (!userInfo) {
            return {ok: false, error: '用户信息缺失'}
        }
        if (!code) {
            return {ok: false, error: 'code 参数缺失'}
        }
        const getInvitationResult = await db.collection('invitation').where({code}).get()
        const invitation = getInvitationResult.data && getInvitationResult.data.length
            ? getInvitationResult.data[0] : undefined
        if (!invitation) {
            return {ok: false, error: '无效的邀请码'}
        }
        // 判断玩家是否已经参与了别的游戏
        const getRoundResult = await db.collection('round').where({'players.openId': openid}).get()
        const round = getRoundResult.data && getRoundResult.data.length ?
            getRoundResult.data[0] : undefined
        if (round) {
            return {ok: false, error: '您已经参与了游戏'}
        }
        // 开始创建信息：事务中 删除邀请再创建对局
        const roundId = await db.runTransaction(async transaction => {
            const result = await transaction.collection('round').add({
                data: {
                    players: [
                        Object.assign({}, invitation.userInfo, {openId: invitation._openid}),
                        Object.assign({}, userInfo, {openId: openid})
                    ],
                    _openid: invitation._openid,
                    createAt: new Date()
                }
            })
            await transaction.collection('invitation').doc(invitation._id).remove()
            await transaction.collection('invitation').where({_openid: openid}).remove()
            return result._id
        })
        return {ok: true, roundId}
    } catch (e) {
        return {ok: false, error: e}
    }
}
