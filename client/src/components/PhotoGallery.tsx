import React, { useState } from 'react';
import { TelegramAPI } from '../utils/telegram-api-core';
import { getApiOrigin } from '../config/api';

interface Photo {
  filename: string;
  savedAs: string;
  path: string;
  size: number;
  mimetype: string;
}

interface PhotoGalleryProps {
  photos: Photo[];
  maxVisible?: number;
  compact?: boolean;
  showCounter?: boolean;
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Б';
  const k = 1024;
  const sizes = ['Б', 'КБ', 'МБ', 'ГБ'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const PhotoGallery: React.FC<PhotoGalleryProps> = ({ 
  photos, 
  maxVisible = 6, 
  compact = false,
  showCounter = false
}) => {
  const [showAllPhotos, setShowAllPhotos] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [currentPhoto, setCurrentPhoto] = useState<any>(null);



  const openPhotoViewer = (photo: Photo, index: number) => {
    setCurrentPhoto({ ...photo, index });
    setViewerOpen(true);
    TelegramAPI.vibrate('light');
  };

  const nextPhoto = () => {
    if (currentPhoto && currentPhoto.index < photos.length - 1) {
      const nextIndex = currentPhoto.index + 1;
      setCurrentPhoto({ ...photos[nextIndex], index: nextIndex });
      TelegramAPI.vibrate('light');
    }
  };

  const prevPhoto = () => {
    if (currentPhoto && currentPhoto.index > 0) {
      const prevIndex = currentPhoto.index - 1;
      setCurrentPhoto({ ...photos[prevIndex], index: prevIndex });
      TelegramAPI.vibrate('light');
    }
  };

  const closePhotoViewer = () => {
    setViewerOpen(false);
    setCurrentPhoto(null);
    TelegramAPI.vibrate('light');
  };

  if (!photos || photos.length === 0) {
    return (
      <div className="empty-state">
        <i className="fas fa-camera" style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }}></i>
        <div>Фотографии не загружены</div>
      </div>
    );
  }

  const visiblePhotos = showAllPhotos ? photos : photos.slice(0, maxVisible);
  const hasMore = photos.length > maxVisible;
  const gridClass = compact ? 'photo-grid-compact' : 'photo-grid';
  
  // Отладочная информация
  console.log('[PHOTO_GALLERY] API Origin:', getApiOrigin());
  console.log('[PHOTO_GALLERY] Photos:', photos.map(p => ({ filename: p.filename, path: p.path })));

  return (
    <>
      <div className={gridClass}>
        {visiblePhotos.map((photo, index) => (
          <div 
            key={photo.savedAs} 
            className="photo-item"
            onClick={() => openPhotoViewer(photo, showAllPhotos ? index : index)}
          >
            <img 
              src={photo.path && photo.path.startsWith('/uploads') ? `${getApiOrigin()}${photo.path}` : photo.path}
              alt={photo.filename}
              loading="lazy"
              onError={(e) => {
                const fullUrl = photo.path && photo.path.startsWith('/uploads') ? `${getApiOrigin()}${photo.path}` : photo.path;
                console.error('❌ Ошибка загрузки фото:', {
                  originalPath: photo.path,
                  fullUrl: fullUrl,
                  apiOrigin: getApiOrigin(),
                  filename: photo.filename
                });
                e.currentTarget.style.display = 'none';
                (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex';
              }}
            />
            <div className="photo-placeholder" style={{ display: 'none' }}>
              <i className="fas fa-image"></i>
              <span>Фото {index + 1}</span>
            </div>
            {showCounter && (
              <div className="photo-overlay">
                <span className="photo-number">{index + 1}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {hasMore && (
        <button 
          className="btn btn-secondary show-all-photos"
          onClick={() => {
            setShowAllPhotos(!showAllPhotos);
            TelegramAPI.vibrate('light');
          }}
        >
          <i className={`fas ${showAllPhotos ? 'fa-eye-slash' : 'fa-images'}`}></i>
          {showAllPhotos ? 'Скрыть' : `Показать все (${photos.length})`}
        </button>
      )}

      {/* Модальный просмотр */}
      {viewerOpen && currentPhoto && (
        <div className="photo-viewer-overlay show" onClick={closePhotoViewer}>
          <div className="photo-viewer" onClick={(e) => e.stopPropagation()}>
            <div className="photo-viewer-header">
              <div className="photo-info">
                <span className="photo-counter">{currentPhoto.index + 1} из {photos.length}</span>
                <span className="photo-name">{currentPhoto.filename}</span>
              </div>
              <button className="photo-viewer-close" onClick={closePhotoViewer}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="photo-viewer-content">
              <img
                src={currentPhoto.path && currentPhoto.path.startsWith('/uploads') ? `${getApiOrigin()}${currentPhoto.path}` : currentPhoto.path}
                alt={currentPhoto.filename}
                onError={(e) => {
                  const fullUrl = currentPhoto.path && currentPhoto.path.startsWith('/uploads') ? `${getApiOrigin()}${currentPhoto.path}` : currentPhoto.path;
                  console.error('❌ Ошибка загрузки фото в модальном окне:', {
                    originalPath: currentPhoto.path,
                    fullUrl: fullUrl,
                    apiOrigin: getApiOrigin(),
                    filename: currentPhoto.filename
                  });
                  e.currentTarget.style.display = 'none';
                  (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex';
                }}
              />
              <div className="photo-error" style={{ display: 'none' }}>
                <i className="fas fa-exclamation-triangle"></i>
                <span>Ошибка загрузки изображения</span>
              </div>
              
              {/* Навигация */}
              {photos.length > 1 && (
                <>
                  <button 
                    className="photo-nav photo-nav-prev" 
                    onClick={prevPhoto}
                    disabled={currentPhoto.index === 0}
                  >
                    <i className="fas fa-chevron-left"></i>
                  </button>
                  <button 
                    className="photo-nav photo-nav-next" 
                    onClick={nextPhoto}
                    disabled={currentPhoto.index === photos.length - 1}
                  >
                    <i className="fas fa-chevron-right"></i>
                  </button>
                </>
              )}
            </div>
            <div className="photo-viewer-footer">
              <div className="photo-details">
                <span>{formatFileSize(currentPhoto.size)}</span>
                <span>{currentPhoto.mimetype}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PhotoGallery;