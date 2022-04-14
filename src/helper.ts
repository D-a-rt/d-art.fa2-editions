import * as fs from 'fs';
const bs58check = require('bs58check');
const sodium = require('libsodium-wrappers');

export async function loadFile(filePath: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    if (!fs.existsSync(filePath)) reject(`file ${filePath} does not exist`);
    else
      fs.readFile(filePath, (err, buff) =>
        err ? reject(err) : resolve(buff.toString())
      );
  });
}


export const bs58Encode = (payload: any, prefix: any) => {
  let n = new Uint8Array(prefix.length + payload.length);
  n.set(prefix);
  n.set(payload, prefix.length);
  return bs58check.encode(Buffer.from(n)).toString('hex');
}

function bs58decode(enc: any, prefix: any) {
  let n = bs58check.decode(enc);
  n = n.slice(prefix.length);
  return n;
}

export async function generateKeyPair(seed: string): Promise<void> {

  await new Promise(async (resolve, reject) => {
    try {
      await sodium.ready

      const pair = sodium.crypto_sign_seed_keypair(sodium.crypto_generichash(32, sodium.from_string(seed)))

      const sk = bs58Encode(pair.privateKey, new Uint8Array([43, 246, 78, 7]))
      const pk = bs58Encode(pair.publicKey, new Uint8Array([13, 15, 37, 217]))
      const pkh = bs58Encode(sodium.crypto_generichash(20, pair.publicKey), new Uint8Array([6, 161, 159]))

      console.log('secretkey: ', sk)
      console.log('publickey: ', pk)
      console.log('publickeyhash: ', pkh)

      const res = {
        secretKey: sk,
        publicKey: pk,
        publicKeyHash: pkh
      }

      resolve(res);
    } catch (error: any) {
      console.log(JSON.stringify(error))
      reject()
    }
  })
}

export const encodePayload = async (payload: string): Promise<void> => {
  console.log(payload)
  await new Promise(async (resolve, reject) => {
    try {
      await sodium.ready
      const hexPayload = Buffer.from(payload).toString('hex')

      const signature = sodium.crypto_sign_detached(sodium.crypto_generichash(32, Buffer.from(payload)), bs58decode(process.env.SINGER_PRIVATE_KEY, new Uint8Array([43, 246, 78, 7])), 'uint8array')
      const edsignature = bs58Encode(signature, new Uint8Array([9, 245, 205, 134, 18]))

      console.log('Payload: ', Buffer.from(payload).toString('hex'))
      console.log('Signed payload: ', edsignature)

      const result = {
        message: hexPayload,
        signature: edsignature
      }
      resolve(result);
    } catch (error: any) {
      console.log(JSON.stringify(error))
      reject();
    }
  })
}