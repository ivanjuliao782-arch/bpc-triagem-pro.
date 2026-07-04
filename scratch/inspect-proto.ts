import { proto } from '@whiskeysockets/baileys';

console.log('Keys of proto.Message:');
const messageKeys = Object.keys(proto.Message.prototype || {});
console.log(messageKeys.filter(k => k.toLowerCase().includes('forward')));

// Let's also check if there's any other way forwarded messages are typed
const allProtoKeys = Object.keys(proto);
console.log('Proto keys containing "forward" or "Forward":');
console.log(allProtoKeys.filter(k => k.toLowerCase().includes('forward')));
