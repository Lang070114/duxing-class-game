import type {Payload} from './game';
// A small local safety net, not a claim of comprehensive moderation. Preserve originals.
export function reviewReason(payload:Payload){
 const text=[payload.text,payload.shop,payload.dish].filter(Boolean).join('\n');
 if(/(?:^|\D)1[3-9]\d{9}(?!\d)|[\w.+-]+@[\w.-]+\.[a-z]{2,}|(?:^|\D)\d{17}[\dXx](?!\w)|(?:微信|微[信訊]|QQ|手机号|电话)\s*[:：号是为]?\s*[a-zA-Z0-9_-]{5,}/i.test(text))return '可能含联系方式或身份信息';
 if(/傻[逼屄]|[操艹]你[妈嗎]|去死|人肉搜索/.test(text))return '可能含攻击性内容';
 return '';
}
