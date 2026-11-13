import React, { useRef } from 'react';
import { Image as ImageIcon, X, Sparkles, Upload, Camera } from 'lucide-react';

const ImageUploadPreview = ({ attachedImages, onImagesChange }) => {
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const availableSlots = 3 - attachedImages.length;
    const filesToProcess = files.slice(0, availableSlots);

    filesToProcess.forEach(file => {
      if (!file.type.startsWith('image/')) {
        alert('Please select a valid image file (PNG, JPG, JPEG, WEBP).');
        return;
      }

      // 5MB limit
      if (file.size > 5 * 1024 * 1024) {
        alert(`File ${file.name} exceeds 5MB limit.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const base64Url = event.target.result;
        const newImg = {
          url: base64Url,
          label: file.name.replace(/\.[^/.]+$/, "") || 'Clinical Photo',
          aiObservation: `Gallery upload (${(file.size / 1024).toFixed(0)} KB) prepared for physician inspection.`
        };

        onImagesChange(prev => [...prev, newImg]);
      };
      reader.readAsDataURL(file);
    });

    // Reset input value so same file can be re-selected if deleted
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemove = (index) => {
    onImagesChange(prev => {
      const arr = Array.isArray(prev) ? prev : attachedImages;
      return arr.filter((_, i) => i !== index);
    });
  };

  return (
    <div className="space-y-3">
      {/* Hidden native file input for gallery/camera */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />

      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
          <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
          <span>Clinical Photo Attachments ({attachedImages.length}/3)</span>
        </label>
        
        {attachedImages.length < 3 && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center space-x-1 transition px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload from Gallery</span>
          </button>
        )}
      </div>

      {/* Empty State / Upload Dropzone */}
      {attachedImages.length === 0 && (
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-800 hover:border-cyan-500/50 rounded-2xl p-6 text-center cursor-pointer transition-colors group bg-slate-950/40"
        >
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto mb-2 group-hover:scale-105 transition-transform">
            <Camera className="w-6 h-6 text-cyan-400" />
          </div>
          <div className="text-xs font-semibold text-slate-300 group-hover:text-white transition-colors">
            Tap to attach medical photo from device gallery or camera
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Supports JPG, PNG, WEBP up to 5MB. Clear lighting of skin lesions, rash, or swelling recommended.
          </p>
        </div>
      )}

      {/* Attached Images Grid */}
      {attachedImages.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {attachedImages.map((img, idx) => (
            <div key={idx} className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950 p-2 shadow-lg">
              <button
                type="button"
                onClick={() => handleRemove(idx)}
                title="Remove photo"
                className="absolute top-3 right-3 p-1 rounded-full bg-slate-900/90 text-slate-300 hover:text-rose-400 z-10 transition border border-slate-700"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              <img src={img.url} alt={img.label} className="w-full h-28 object-cover rounded-lg mb-2 border border-slate-800/80" />
              <div className="text-[11px] font-bold text-slate-200 truncate">{img.label}</div>
              <div className="text-[10px] text-cyan-400 mt-1 line-clamp-2 leading-tight flex items-start space-x-1">
                <Sparkles className="w-3 h-3 shrink-0 mt-0.5 text-cyan-300" />
                <span>{img.aiObservation}</span>
              </div>
            </div>
          ))}

          {/* Add more button tile if under limit */}
          {attachedImages.length < 3 && (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border border-dashed border-slate-800 hover:border-cyan-500/40 rounded-xl h-44 flex flex-col items-center justify-center cursor-pointer transition bg-slate-950/30 text-slate-400 hover:text-cyan-300"
            >
              <Upload className="w-5 h-5 mb-1 text-slate-500" />
              <span className="text-[11px] font-semibold">+ Add Another</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ImageUploadPreview;
