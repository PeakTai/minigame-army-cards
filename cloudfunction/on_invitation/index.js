// 云函数入口文件
import {Card} from "../../miniprogram/card/card";

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
        const getRoundResult = await db.collection('round').where({'playerInfos.openId': openid}).get()
        const round = getRoundResult.data && getRoundResult.data.length ?
            getRoundResult.data[0] : undefined
        if (round) {
            if (round.status === 'underway') {
                return {ok: false, error: '您已经参与了游戏'}
            } else {
                await db.collection('round').doc(round._id).remove()
            }
        }
        // 开始创建信息：事务中 删除邀请再创建对局
        const roundId = await db.runTransaction(async transaction => {
            const result = await transaction.collection('round').add({
                data: {
                    playerInfos: [
                        Object.assign({}, invitation.userInfo, {
                            openId: invitation._openid,
                            keepCards: getAllCards(),
                            playOutCards: null
                        }),
                        Object.assign({}, userInfo, {
                            openId: openid,
                            keepCards: getAllCards(),
                            playOutCards: null
                        })
                    ],
                    records: [],
                    _openid: invitation._openid,
                    status: 'underway',
                    createAt: new Date(),
                    updateAt: new Date()
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

function getAllCards() {
    return [
        {name: '工兵', type: 'figure', level: 1, imageUrl: 'images/card/工兵.png'},
        {name: '工兵', type: 'figure', level: 1, imageUrl: 'images/card/工兵.png'},
        {name: '班长', type: 'figure', level: 2, imageUrl: 'images/card/班长.png'},
        {name: '排长', type: 'figure', level: 3, imageUrl: 'images/card/排长.png'},
        {name: '连长', type: 'figure', level: 4, imageUrl: 'images/card/连长.png'},
        {name: '营长', type: 'figure', level: 5, imageUrl: 'images/card/营长.png'},
        {name: '团长', type: 'figure', level: 6, imageUrl: 'images/card/团长.png'},
        {name: '旅长', type: 'figure', level: 7, imageUrl: 'images/card/旅长.png'},
        {name: '师长', type: 'figure', level: 8, imageUrl: 'images/card/师长.png'},
        {name: '军长', type: 'figure', level: 9, imageUrl: 'images/card/军长.png'},
        {name: '司令', type: 'figure', level: 10, imageUrl: 'images/card/司令.png'},
        {name: '地雷', type: 'weapon', level: 0, imageUrl: 'images/card/地雷.png'},
        {name: '地雷', type: 'weapon', level: 0, imageUrl: 'images/card/地雷.png'},
        {name: '炸弹', type: 'weapon', level: 0, imageUrl: 'images/card/炸弹.png'},
    ]
}
