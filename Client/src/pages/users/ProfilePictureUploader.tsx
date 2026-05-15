import { useRef, useState } from "react";

interface ProfilePictureUploaderProps {
  userId: string;
  token: string;
  disabled?: boolean;
  onUpload: (file: File) => Promise<void>;
}

export function ProfilePictureUploader({
  userId,
  token,
  disabled,
  onUpload,
}: ProfilePictureUploaderProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const handleFile = async (file: File | undefined) => {
    if (!file || disabled || !token || !userId) return;
    setError("");
    if (!file.type.startsWith("image/")) {
      setError("Select an image file.");
      return;
    }

    setBusy(true);
    try {
      const compressed = await cropAndCompress(file);
      await onUpload(compressed);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed to upload image.");
    } finally {
      setBusy(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={event => void handleFile(event.target.files?.[0])}
      />
      <button
        type="button"
        disabled={busy || disabled}
        onClick={() => inputRef.current?.click()}
        className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
      >
        {busy ? "Uploading..." : "Upload"}
      </button>
      {error && <span className="text-[10px] text-red-500">{error}</span>}
    </div>
  );
}

async function cropAndCompress(file: File): Promise<File> {
  const image = await loadImage(file);
  const size = Math.min(image.width, image.height);
  const sourceX = Math.floor((image.width - size) / 2);
  const sourceY = Math.floor((image.height - size) / 2);
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Image processing is not available.");
  }

  context.drawImage(image, sourceX, sourceY, size, size, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>(resolve =>
    canvas.toBlob(resolve, "image/webp", 0.82)
  );

  if (!blob) {
    throw new Error("Could not process image.");
  }

  return new File([blob], "profile-picture.webp", { type: "image/webp" });
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
