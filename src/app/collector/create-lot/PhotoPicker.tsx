"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, LoaderCircle, X } from "lucide-react";
import { useTxt } from "../ui";

const MAX_PHOTOS = 5;
const MAX_SIDE_PX = 1600;

/** Shrinks a phone photo to at most 1600px and re-encodes it as JPEG (a few hundred KB). */
async function compressPhoto(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE_PX / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.8));
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

/**
 * Up to 5 lot photos. Picked photos are compressed in the browser and placed in a hidden
 * file input named "photos", so they are sent with the create-lot form.
 */
export function PhotoPicker() {
  const tx = useTxt();
  const formInput = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<Array<{ file: File; url: string }>>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const transfer = new DataTransfer();
    photos.forEach((p) => transfer.items.add(p.file));
    if (formInput.current) formInput.current.files = transfer.files;
  }, [photos]);

  const latest = useRef(photos);
  latest.current = photos;
  useEffect(() => () => latest.current.forEach((p) => URL.revokeObjectURL(p.url)), []);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []).slice(0, MAX_PHOTOS - photos.length);
    e.target.value = "";
    if (picked.length === 0) return;
    setBusy(true);
    const compressed = await Promise.all(picked.map(compressPhoto));
    setPhotos((prev) => [...prev, ...compressed.map((file) => ({ file, url: URL.createObjectURL(file) }))].slice(0, MAX_PHOTOS));
    setBusy(false);
  }

  const remove = (index: number) => {
    URL.revokeObjectURL(photos[index].url);
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
      <h2 className="c-section-title" style={{ margin: 0 }}>
        3. {tx({ hi: "फोटो (ज़रूरी नहीं)", en: "Photos (optional)", mr: "फोटो (ऐच्छिक)" })}{" "}
        <small style={{ fontWeight: 600, color: "var(--slate-500)" }}>
          {photos.length}/{MAX_PHOTOS}
        </small>
      </h2>

      <input ref={formInput} type="file" name="photos" multiple hidden />

      <div className="c-photo-grid">
        {photos.map((p, i) => (
          <div key={p.url} className="c-photo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.url} alt={`${tx({ hi: "फोटो", en: "Photo", mr: "फोटो" })} ${i + 1}`} />
            <button type="button" className="c-photo-remove" onClick={() => remove(i)} aria-label={tx({ hi: "फोटो हटाएं", en: "Remove photo", mr: "फोटो काढा" })}>
              <X size={14} aria-hidden="true" />
            </button>
          </div>
        ))}

        {photos.length < MAX_PHOTOS && (
          <label className="c-photo c-photo-add">
            <input type="file" accept="image/*" multiple onChange={onPick} hidden />
            {busy ? <LoaderCircle size={26} className="c-spin" aria-hidden="true" /> : <ImagePlus size={26} aria-hidden="true" />}
            <span>{tx({ hi: "फोटो जोड़ें", en: "Add photo", mr: "फोटो जोडा" })}</span>
          </label>
        )}
      </div>
    </section>
  );
}
