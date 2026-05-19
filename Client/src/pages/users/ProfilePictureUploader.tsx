import { useEffect, useRef, useState, type ReactNode } from "react";
import Cropper, { type Area } from "react-easy-crop";

interface ProfilePictureUploaderProps {
  userId: string;
  token: string;
  disabled?: boolean;
  onUpload: (file: File) => Promise<void>;
}

type EditorState = {
  file: File;
  url: string;
  zoom: number;
  rotate: number;
  crop: { x: number; y: number };
  croppedAreaPixels: Area | null;
};

export function ProfilePictureUploader({ userId, token, disabled, onUpload }: ProfilePictureUploaderProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    return () => {
      if (editor?.url) URL.revokeObjectURL(editor.url);
    };
  }, [editor?.url]);

  const openEditor = (file: File | undefined) => {
    if (!file || disabled || !token || !userId) return;
    setError("");
    if (!file.type.startsWith("image/")) {
      setError("Select an image file.");
      return;
    }
    if (editor?.url) URL.revokeObjectURL(editor.url);
    setEditor({
      file,
      url: URL.createObjectURL(file),
      zoom: 1,
      rotate: 0,
      crop: { x: 0, y: 0 },
      croppedAreaPixels: null,
    });
    if (inputRef.current) inputRef.current.value = "";
  };

  const closeEditor = () => {
    if (editor?.url) URL.revokeObjectURL(editor.url);
    setEditor(null);
    setBusy(false);
  };

  const save = async () => {
    if (!editor) return;
    setBusy(true);
    setError("");
    try {
      const compressed = await cropAndCompress(editor);
      await onUpload(compressed);
      closeEditor();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed to upload image.");
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(event) => openEditor(event.target.files?.[0])}
      />
      <button
        type="button"
        disabled={busy || disabled}
        onClick={() => inputRef.current?.click()}
        className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
      >
        Upload
      </button>
      {error && <span className="max-w-40 text-[10px] text-red-500">{error}</span>}

      {editor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Edit profile picture</h3>
                <p className="text-xs text-slate-400">Crop, rotate, zoom, then upload a compressed image.</p>
              </div>
              <button type="button" onClick={closeEditor} className="rounded-lg p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600">
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <div className="p-5">
              <div className="relative mx-auto size-80 overflow-hidden rounded-2xl bg-slate-100 shadow-inner ring-1 ring-slate-200">
                <Cropper
                  image={editor.url}
                  crop={editor.crop}
                  zoom={editor.zoom}
                  rotation={editor.rotate}
                  aspect={1}
                  cropShape="round"
                  showGrid={false}
                  onCropChange={(crop) => setEditor((current) => current && { ...current, crop })}
                  onZoomChange={(zoom) => setEditor((current) => current && { ...current, zoom })}
                  onRotationChange={(rotate) => setEditor((current) => current && { ...current, rotate })}
                  onCropComplete={(_, croppedAreaPixels) => setEditor((current) => current && { ...current, croppedAreaPixels })}
                />
              </div>

              <div className="mt-5 grid gap-4">
                <Control label="Zoom" value={`${editor.zoom.toFixed(2)}x`}>
                  <input
                    type="range"
                    min="1"
                    max="3"
                    step="0.05"
                    value={editor.zoom}
                    onChange={(event) => setEditor((current) => current && { ...current, zoom: Number(event.target.value) })}
                    className="w-full accent-indigo-600"
                  />
                </Control>
                <Control label="Rotate" value={`${editor.rotate}deg`}>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setEditor((current) => current && { ...current, rotate: current.rotate - 90 })} className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50">
                      <span className="material-symbols-outlined text-lg">rotate_left</span>
                    </button>
                    <input
                      type="range"
                      min="-180"
                      max="180"
                      step="1"
                      value={editor.rotate}
                      onChange={(event) => setEditor((current) => current && { ...current, rotate: Number(event.target.value) })}
                      className="w-full accent-indigo-600"
                    />
                    <button type="button" onClick={() => setEditor((current) => current && { ...current, rotate: current.rotate + 90 })} className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50">
                      <span className="material-symbols-outlined text-lg">rotate_right</span>
                    </button>
                  </div>
                </Control>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
              <button type="button" onClick={closeEditor} disabled={busy} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">
                Cancel
              </button>
              <button type="button" onClick={save} disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
                {busy && <span className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />}
                Save picture
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Control({ label, value, children }: { label: string; value: string; children: ReactNode }) {
  return (
    <label className="grid gap-1.5">
      <span className="flex items-center justify-between text-xs font-semibold text-slate-600">
        {label}
        <span className="font-mono text-[11px] text-slate-400">{value}</span>
      </span>
      {children}
    </label>
  );
}

async function cropAndCompress(editor: EditorState): Promise<File> {
  const image = await loadImage(editor.file);
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Image processing is not available.");

  const crop = editor.croppedAreaPixels ?? {
    x: 0,
    y: 0,
    width: image.width,
    height: image.height,
  };

  const rotated = await createRotatedImage(image, editor.rotate);

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.save();
  context.beginPath();
  context.arc(256, 256, 256, 0, Math.PI * 2);
  context.clip();
  context.drawImage(
    rotated,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    canvas.width,
    canvas.height,
  );
  context.restore();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.82));
  if (!blob) throw new Error("Could not process image.");
  return new File([blob], "profile-picture.webp", { type: "image/webp" });
}

async function createRotatedImage(image: HTMLImageElement, rotation: number): Promise<HTMLCanvasElement> {
  const radians = (rotation * Math.PI) / 180;
  const sin = Math.abs(Math.sin(radians));
  const cos = Math.abs(Math.cos(radians));
  const width = image.width;
  const height = image.height;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * cos + height * sin);
  canvas.height = Math.round(width * sin + height * cos);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Image processing is not available.");
  context.translate(canvas.width / 2, canvas.height / 2);
  context.rotate(radians);
  context.drawImage(image, -width / 2, -height / 2);
  return canvas;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image."));
    };
    image.src = url;
  });
}
