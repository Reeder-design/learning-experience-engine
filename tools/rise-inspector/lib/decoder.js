function decodeRuntimeData(source) {
  if (typeof source !== 'string' || !source.trim()) {
    throw new Error('runtime-data.js is empty.');
  }

  const match = source
    .trim()
    .match(/^__jsonp\(["']runtime-data\.js["'],["']([A-Za-z0-9+/=]+)["']\);?$/);

  if (!match) {
    throw new Error('Unsupported runtime-data.js wrapper format.');
  }

  const binary = globalThis.atob(match[1]);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  const jsonText = new TextDecoder('utf-8').decode(bytes);

  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch (error) {
    throw new Error(`Decoded runtime data is not valid JSON: ${error.message}`);
  }

  if (!parsed || typeof parsed !== 'object' || !parsed.course) {
    throw new Error('Decoded runtime data does not contain a course object.');
  }

  return parsed;
}

module.exports = { decodeRuntimeData };
