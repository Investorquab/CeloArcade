require('dotenv').config();

const key = process.env.OWNER_PRIVATE_KEY;

if (!key) {
  console.log('❌ OWNER_PRIVATE_KEY is not set in .env at all.');
} else {
  console.log('Length:', key.length, '(should be 66)');
  console.log('Starts with:', key.slice(0, 4), '(should be 0x + 2 hex chars)');
  console.log('Has quotes:', key.includes('"') || key.includes("'"));
  console.log('Has whitespace:', /\s/.test(key));

  const hexBody = key.slice(2);
  const validHexRegex = /^[0-9a-fA-F]+$/;
  console.log('Hex body length:', hexBody.length, '(should be 64)');
  console.log('Is valid hex:', validHexRegex.test(hexBody));

  if (!validHexRegex.test(hexBody)) {
    for (let i = 0; i < hexBody.length; i++) {
      if (!/[0-9a-fA-F]/.test(hexBody[i])) {
        console.log(`❌ Invalid character found at hex position ${i} (char code ${hexBody.charCodeAt(i)})`);
        break;
      }
    }
  }

  console.log('Contains non-ASCII chars:', /[^\x00-\x7F]/.test(key));
}
