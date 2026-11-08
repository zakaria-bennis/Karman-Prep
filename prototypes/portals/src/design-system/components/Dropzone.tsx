import { useEffect, useRef, useState, type DragEvent } from "react";
import { cn } from "../cn";
import { Icon } from "../icons";
import { useCoarsePointer } from "./hooks";

/*
 * Dropzone: a photo upload (a score report, a screenshot) with a camera
 * button on phones. The drag model and single-file preview follow File
 * Dropzone (21st.dev 19201, joyco); the useFileUpload hook was not in the
 * fetch and is written here in a few lines. Files stay in the page: the
 * prototype never uploads anything.
 */
export function Dropzone({
  accept = "image/*",
  maxMB = 10,
  label = "Add a photo of the score report",
  onFile,
  className,
}: {
  accept?: string;
  maxMB?: number;
  label?: string;
  onFile?(file: File | null): void;
  className?: string;
}) {
  const coarse = useCoarsePointer();
  const input = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [over, setOver] = useState(false);

  useEffect(() => {
    if (!file || !file.type.startsWith("image/")) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const take = (f: File | undefined) => {
    if (!f) return;
    if (f.size > maxMB * 1024 * 1024) {
      setError(`That file is over ${maxMB} MB. Try a smaller photo.`);
      return;
    }
    setError("");
    setFile(f);
    onFile?.(f);
  };
  const clear = () => {
    setFile(null);
    onFile?.(null);
  };
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    take(e.dataTransfer.files[0]);
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <div
        onDragEnter={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
        data-over={over || undefined}
        className={cn(
          "relative grid min-h-[168px] place-items-center rounded-panel border border-dashed p-4 text-center transition-colors",
          over ? "border-accent bg-accent/10" : "border-border/70 bg-raised/40"
        )}
      >
        <input
          ref={input}
          type="file"
          accept={accept}
          className="sr-only"
          aria-label={label}
          onChange={(e) => take(e.target.files?.[0])}
        />
        <input
          ref={camera}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          aria-label="Take a photo"
          onChange={(e) => take(e.target.files?.[0])}
        />
        {file ? (
          <div className="grid justify-items-center gap-2">
            {preview ? (
              <img src={preview} alt={file.name} className="max-h-32 rounded-card object-contain" />
            ) : (
              <Icon name="tests" size={24} className="text-muted" />
            )}
            <p className="text-dense font-medium">{file.name}</p>
            <button
              type="button"
              onClick={clear}
              className="min-h-tap text-dense font-semibold text-accent"
            >
              Remove
            </button>
          </div>
        ) : (
          <div className="grid justify-items-center gap-1">
            <Icon name="upload" size={24} className="text-muted" />
            <p className="text-body font-medium">{label}</p>
            <p className="text-dense text-muted">
              A photo or a screenshot, up to {maxMB} MB. It stays private.
            </p>
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={() => input.current?.click()}
                className="min-h-tap rounded-control px-3 text-dense font-semibold text-accent"
              >
                Choose a file
              </button>
              {coarse ? (
                <button
                  type="button"
                  onClick={() => camera.current?.click()}
                  className="inline-flex min-h-tap items-center gap-1.5 rounded-control px-3 text-dense font-semibold text-accent"
                >
                  <Icon name="camera" size={20} />
                  Take a photo
                </button>
              ) : null}
            </div>
          </div>
        )}
      </div>
      {error ? (
        <p role="alert" className="text-dense text-negative">
          {error}
        </p>
      ) : null}
    </div>
  );
}
