import { useRef, useEffect, useCallback } from 'react'
import Cropper from 'cropperjs'
import { X } from 'lucide-react'

interface CropModalProps {
  visible: boolean
  imageSrc: string
  uploading: boolean
  onClose: () => void
  onConfirm: (blob: Blob) => void
}

export default function CropModal({ visible, imageSrc, uploading, onClose, onConfirm }: CropModalProps) {
  const cropImageRef = useRef<HTMLImageElement>(null)
  const cropperRef = useRef<Cropper | null>(null)

  const initCropper = useCallback(() => {
    if (cropImageRef.current && imageSrc && !cropperRef.current) {
      cropperRef.current = new Cropper(cropImageRef.current, {
        viewMode: 1,
        dragMode: 'move',
        autoCropArea: 0.65,
        restore: false,
        guides: true,
        center: true,
        highlight: false,
        cropBoxMovable: true,
        cropBoxResizable: true,
        toggleDragModeOnDblclick: false,
        background: false,
        modal: true,
        responsive: true,
        checkCrossOrigin: false,
      } as any)
    }
  }, [imageSrc])

  const destroyCropper = useCallback(() => {
    if (cropperRef.current) {
      cropperRef.current.destroy()
      cropperRef.current = null
    }
  }, [])

  useEffect(() => {
    if (visible && imageSrc) {
      // Wait for image to render, then init cropper
      const timer = setTimeout(() => initCropper(), 100)
      return () => clearTimeout(timer)
    } else {
      destroyCropper()
    }
  }, [visible, imageSrc, initCropper, destroyCropper])

  useEffect(() => {
    return () => {
      destroyCropper()
    }
  }, [destroyCropper])

  const handleConfirm = useCallback(() => {
    if (cropperRef.current) {
      const canvas = (cropperRef.current as any).getCroppedCanvas({
        width: 200,
        height: 200,
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high',
      })
      canvas.toBlob((blob) => {
        if (blob) onConfirm(blob)
      }, 'image/jpeg', 0.9)
    }
  }, [onConfirm])

  if (!visible) return null

  return (
    <div className="modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal crop-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h4>裁剪头像</h4>
          <button onClick={onClose} className="close-btn">
            <X size={16} />
          </button>
        </div>
        <div className="modal-body">
          <div className="crop-container">
            <img ref={cropImageRef} src={imageSrc} alt="待裁剪图片" />
          </div>
        </div>
        <div className="modal-footer">
          <div className="form-actions">
            <button type="button" onClick={onClose} className="btn btn-outline">取消</button>
            <button type="button" onClick={handleConfirm} className="btn btn-primary" disabled={uploading}>
              {uploading ? '上传中...' : '确认裁剪'}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .modal-overlay {
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background-color: var(--overlay-bg);
          display: flex; justify-content: center; align-items: center;
          z-index: 1000;
        }
        .modal {
          background: var(--bg-color-primary); border-radius: 8px;
          width: 90%; max-width: 500px; max-height: 80vh;
          display: flex; flex-direction: column; overflow: hidden;
        }
        .crop-modal { max-width: 600px; }
        .modal-header {
          display: flex; justify-content: space-between; align-items: center;
          padding: 20px 30px; border-bottom: 1px solid var(--border-color-primary);
          flex-shrink: 0; background: var(--bg-color-primary);
        }
        .modal-header h4 { margin: 0; color: var(--text-color-primary); }
        .close-btn {
          background: var(--bg-color-secondary); display: flex; align-items: center;
          justify-content: center; border-radius: 50%; width: 30px; height: 30px;
          border: none; cursor: pointer; padding: 5px; color: var(--text-color-primary);
        }
        .close-btn:hover { color: var(--text-color-secondary); transform: scale(1.1); transition: all 0.3s ease; }
        .close-btn svg { width: 16px; height: 16px; }
        .modal-body { padding: 20px; flex: 1; overflow-y: auto; min-height: 0; }
        .modal-footer { flex-shrink: 0; background: var(--bg-color-primary); border-top: 1px solid var(--border-color-primary); padding: 20px 30px; }
        .form-actions { display: flex; justify-content: flex-end; gap: 10px; margin: 0; }
        .btn {
          padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer;
          font-size: 14px; display: inline-flex; align-items: center; gap: 6px;
          transition: all 0.3s; text-decoration: none;
        }
        .btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-primary { background-color: var(--primary-color); color: white; }
        .btn-primary:hover:not(:disabled) { background-color: var(--primary-color-dark); }
        .btn-outline { background-color: transparent; color: var(--text-color-secondary); border: 1px solid var(--border-color-primary); }
        .btn-outline:hover:not(:disabled) { background-color: var(--bg-color-secondary); }
        .crop-container { max-height: 400px; overflow: hidden; text-align: center; }
        .crop-container img { max-width: 100%; max-height: 400px; }
      `}</style>
    </div>
  )
}
