// Browser-side evidence forensics: perceptual hash + EXIF extraction.
// Runs before upload so the server can reason about integrity.

export type Exif = {
  timestamp: string | null;
  lat: number | null;
  lng: number | null;
};

async function loadBitmap(file: File): Promise<ImageBitmap> {
  return await createImageBitmap(file);
}

/** 8x8 average hash rendered as 16 hex chars. */
export async function perceptualHash(file: File): Promise<string> {
  const bmp = await loadBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = 8;
  canvas.height = 8;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  ctx.drawImage(bmp, 0, 0, 8, 8);
  const { data } = ctx.getImageData(0, 0, 8, 8);
  const grays: number[] = [];
  for (let i = 0; i < data.length; i += 4) {
    grays.push(0.299 * data[i]! + 0.587 * data[i + 1]! + 0.114 * data[i + 2]!);
  }
  const avg = grays.reduce((a, b) => a + b, 0) / grays.length;
  let hex = "";
  for (let i = 0; i < 64; i += 4) {
    let nibble = 0;
    for (let j = 0; j < 4; j++) nibble = (nibble << 1) | (grays[i + j]! >= avg ? 1 : 0);
    hex += nibble.toString(16);
  }
  return hex;
}

/** Downscale to keep uploads and vision payloads small. */
export async function compressImage(file: File, max = 1280): Promise<Blob> {
  const bmp = await loadBitmap(file);
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  return await new Promise<Blob>((resolve) =>
    canvas.toBlob((blob) => resolve(blob ?? file), "image/jpeg", 0.82),
  );
}

function toDecimal(parts: number[], ref: string): number {
  const [d = 0, m = 0, s = 0] = parts;
  const value = d + m / 60 + s / 3600;
  return ref === "S" || ref === "W" ? -value : value;
}

/** Minimal JPEG EXIF reader for DateTimeOriginal + GPS. */
export async function readExif(file: File): Promise<Exif> {
  const empty: Exif = { timestamp: null, lat: null, lng: null };
  try {
    const buf = await file.arrayBuffer();
    const view = new DataView(buf);
    if (view.getUint16(0) !== 0xffd8) return empty;
    let offset = 2;
    let tiff = -1;
    while (offset < view.byteLength - 4) {
      if (view.getUint16(offset) === 0xffe1) {
        tiff = offset + 10;
        break;
      }
      offset += 2 + view.getUint16(offset + 2);
    }
    if (tiff < 0) return empty;
    const little = view.getUint16(tiff) === 0x4949;
    const u16 = (o: number) => view.getUint16(o, little);
    const u32 = (o: number) => view.getUint32(o, little);

    const readDir = (dirStart: number, wanted: Record<number, string>) => {
      const out: Record<string, { type: number; count: number; valueOffset: number }> = {};
      const entries = u16(dirStart);
      for (let i = 0; i < entries; i++) {
        const entry = dirStart + 2 + i * 12;
        const tag = u16(entry);
        const name = wanted[tag];
        if (!name) continue;
        out[name] = { type: u16(entry + 2), count: u32(entry + 4), valueOffset: entry + 8 };
      }
      return out;
    };

    const rationalAt = (base: number, index: number) =>
      u32(base + index * 8) / (u32(base + index * 8 + 4) || 1);

    const stringAt = (offsetPtr: number, count: number) => {
      let s = "";
      for (let i = 0; i < count - 1; i++) s += String.fromCharCode(view.getUint8(offsetPtr + i));
      return s;
    };

    const ifd0 = readDir(tiff + u32(tiff + 4), { 0x8769: "exifIFD", 0x8825: "gpsIFD" });
    const result: Exif = { timestamp: null, lat: null, lng: null };

    if (ifd0["exifIFD"]) {
      const exifDir = readDir(tiff + u32(ifd0["exifIFD"].valueOffset), { 0x9003: "dateTimeOriginal" });
      const dto = exifDir["dateTimeOriginal"];
      if (dto) {
        const ptr = dto.count > 4 ? tiff + u32(dto.valueOffset) : dto.valueOffset;
        const raw = stringAt(ptr, dto.count);
        const m = raw.match(/^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/);
        if (m) result.timestamp = new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}`).toISOString();
      }
    }

    if (ifd0["gpsIFD"]) {
      const gps = readDir(tiff + u32(ifd0["gpsIFD"].valueOffset), {
        0x0001: "latRef",
        0x0002: "lat",
        0x0003: "lngRef",
        0x0004: "lng",
      });
      const refOf = (name: string) => (gps[name] ? String.fromCharCode(view.getUint8(gps[name]!.valueOffset)) : "N");
      if (gps["lat"] && gps["lng"]) {
        const latBase = tiff + u32(gps["lat"].valueOffset);
        const lngBase = tiff + u32(gps["lng"].valueOffset);
        result.lat = toDecimal([rationalAt(latBase, 0), rationalAt(latBase, 1), rationalAt(latBase, 2)], refOf("latRef"));
        result.lng = toDecimal([rationalAt(lngBase, 0), rationalAt(lngBase, 1), rationalAt(lngBase, 2)], refOf("lngRef"));
      }
    }
    return result;
  } catch {
    return empty;
  }
}

export async function currentPosition(): Promise<{ lat: number; lng: number } | null> {
  if (typeof navigator === "undefined" || !navigator.geolocation) return null;
  return await new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  });
}
