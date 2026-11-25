const forge = require('node-forge');
const fs = require('fs');
const path = require('path');

const targetPath = path.resolve(__dirname, '../android/app/hayat-release.p12');
if (fs.existsSync(targetPath)) {
  console.log('Keystore already exists at:', targetPath);
  process.exit(0);
}

console.log('Generating 2048-bit RSA key pair for Hayat AI release signing...');
const keys = forge.pki.rsa.generateKeyPair(2048);

const cert = forge.pki.createCertificate();
cert.publicKey = keys.publicKey;
cert.serialNumber = '01' + forge.util.bytesToHex(forge.random.getBytesSync(15));
cert.validity.notBefore = new Date();
cert.validity.notAfter = new Date();
cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 27);

const attrs = [
  { name: 'commonName', value: 'Hayat AI' },
  { name: 'countryName', value: 'EG' },
  { shortName: 'ST', value: 'Cairo' },
  { name: 'localityName', value: 'Cairo' },
  { name: 'organizationName', value: 'Hayat AI' },
  { shortName: 'OU', value: 'Hayat AI Mobile' }
];
cert.setSubject(attrs);
cert.setIssuer(attrs);

cert.sign(keys.privateKey, forge.md.sha256.create());

const password = 'hayat2026';
const p12Asn1 = forge.pkcs12.toPkcs12Asn1(
  keys.privateKey,
  [cert],
  password,
  {
    generateLocalKeyId: true,
    friendlyName: 'hayat',
    algorithm: '3des'
  }
);

const p12Der = forge.asn1.toDer(p12Asn1).getBytes();
fs.writeFileSync(targetPath, Buffer.from(p12Der, 'binary'));
console.log('Successfully generated PKCS12 keystore at:', targetPath, `(${p12Der.length} bytes)`);
