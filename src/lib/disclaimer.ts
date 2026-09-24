/**
 * 全局固定免责声明 —— **冻结文案，不可修改**。
 *
 * 来源：PRD §8.4，逐字照抄。PRD 要求它在「前端页面底部、关于页面、AI 报告尾部永久显示」。
 *
 * 这里同时冻结了文案的 sha256。`disclaimer.test.ts` 会重新计算并断言一致，
 * 所以**改动文案（哪怕一个标点）会让测试失败** —— 这就是「不可删除」的执行手段。
 *
 * 另有一份同源常量在 Rust 侧（AI 报告的免责声明由后端追加，不由模型生成），
 * 两侧的 hash 必须相同。见设计文档 §9.1。
 */

export const DISCLAIMER_TEXT =
  "本工具仅用于区块链公开数据查询、解析与学术研究参考，不构成任何投资、金融、法律建议。链上数据存在延迟与误差，AI分析内容存在幻觉，仅供个人学习参考。本软件无钱包、无签名、无转账、无资产托管功能，不参与任何链上交易行为。用户所有使用行为由用户本人自行承担全部责任。严禁用于隐私追踪、非法取证、洗钱分析等违规违法场景。";

/**
 * `DISCLAIMER_TEXT` 的 sha256（UTF-8，不含尾随换行）。
 *
 * 计算方式：
 *   node -e "const c=require('crypto');console.log(c.createHash('sha256')
 *     .update(DISCLAIMER_TEXT,'utf8').digest('hex'))"
 */
export const DISCLAIMER_SHA256 =
  "e3f28adfbc8a421d4f101639637349df3b86659f7605d1542470ed1f45c5d817";

/** AI 输出附带的短提示（不是免责声明本身，两者都在 AI 报告里出现）。 */
export const AI_NOTICE = "AI 输出存在幻觉，仅供学习参考，不构成任何投资建议。";
