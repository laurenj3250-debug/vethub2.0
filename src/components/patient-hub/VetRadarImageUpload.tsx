'use client';

import { useState, useCallback } from 'react';
import { Upload, Image as ImageIcon, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface VetRadarImageUploadProps {
  onDataExtracted: (data: any) => void;
}

export function VetRadarImageUpload({ onDataExtracted }: VetRadarImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file (PNG, JPG, etc.)');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('Image too large. Please upload an image under 10MB.');
      return;
    }

    setIsUploading(true);
    setError(null);
    setSuccess(false);

    try {
      // Create preview
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);

      // Convert to base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;

        setIsUploading(false);
        setIsParsing(true);

        try {
          // Send to API for parsing
          const response = await fetch('/api/parse-vetradar-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              image: base64String,
              imageType: file.type,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to parse image');
          }

          const result = await response.json();

          if (result.success) {
            setSuccess(true);
            onDataExtracted(result.data);
          } else {
            throw new Error('Parsing failed');
          }
        } catch (err) {
          console.error('Parsing error:', err);
          setError(err instanceof Error ? err.message : 'Failed to parse VetRadar image');
        } finally {
          setIsParsing(false);
        }
      };

      reader.onerror = () => {
        setError('Failed to read image file');
        setIsUploading(false);
      };

      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Upload error:', err);
      setError('Failed to upload image');
      setIsUploading(false);
    }
  }, [onDataExtracted]);

  const handlePaste = useCallback(async (event: React.ClipboardEvent) => {
    const items = event.clipboardData?.items;
    if (!items) return;

    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        event.preventDefault();
        const file = item.getAsFile();
        if (file) {
          // Trigger file processing
          const dataTransfer = new DataTransfer();
          dataTransfer.items.add(file);
          const syntheticEvent = {
            target: { files: dataTransfer.files }
          } as any;
          await handleFileSelect(syntheticEvent);
        }
        break;
      }
    }
  }, [handleFileSelect]);

  return (
    <div className="space-y-4">
      <div
        className="border-2 border-dashed border-purple-500/30 rounded-lg p-6 bg-slate-900/30 hover:bg-slate-900/50 transition cursor-pointer"
        onPaste={handlePaste}
        tabIndex={0}
      >
        <input
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          id="vetradar-image-upload"
          disabled={isUploading || isParsing}
        />

        <label
          htmlFor="vetradar-image-upload"
          className="cursor-pointer flex flex-col items-center gap-3"
        >
          {previewUrl && !isParsing && !error ? (
            <div className="relative w-full max-w-md">
              <img
                src={previewUrl}
                alt="VetRadar screenshot preview"
                className="w-full rounded-lg border border-purple-500/30"
              />
              {success && (
                <div className="absolute top-2 right-2 bg-emerald-500 text-white rounded-full p-2">
                  <CheckCircle size={24} />
                </div>
              )}
            </div>
          ) : (
            <>
              {isUploading || isParsing ? (
                <Loader2 size={48} className="text-purple-400 animate-spin" />
              ) : error ? (
                <AlertCircle size={48} className="text-red-400" />
              ) : (
                <ImageIcon size={48} className="text-purple-400" />
              )}

              <div className="text-center">
                <p className="text-lg font-semibold text-white">
                  {isUploading ? 'Uploading...' :
                   isParsing ? 'Analyzing VetRadar sheet with AI...' :
                   error ? 'Upload failed' :
                   'Upload VetRadar Screenshot'}
                </p>
                <p className="text-sm text-slate-400 mt-2">
                  {isParsing ? 'Reading medications, vitals, fluids, and all clinical data...' :
                   'Click to browse or paste (Ctrl+V) a screenshot'}
                </p>
              </div>
            </>
          )}
        </label>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-500 rounded-lg p-4">
          <p className="text-red-400 text-sm">{error}</p>
          <Button
            onClick={() => {
              setError(null);
              setPreviewUrl(null);
            }}
            variant="outline"
            size="sm"
            className="mt-2"
          >
            Try Again
          </Button>
        </div>
      )}

      {success && (
        <div className="bg-emerald-900/20 border border-emerald-500 rounded-lg p-4">
          <p className="text-emerald-400 text-sm flex items-center gap-2">
            <CheckCircle size={16} />
            VetRadar data extracted successfully! Review the populated fields below.
          </p>
        </div>
      )}

      <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
        <p className="text-blue-300 text-sm">
          <strong>💡 Tip:</strong> Take a screenshot of the entire VetRadar treatment sheet
          including medications, vitals, and nursing care sections for best results.
        </p>
      </div>
    </div>
  );
}
