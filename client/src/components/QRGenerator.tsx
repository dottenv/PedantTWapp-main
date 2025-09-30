import React, { useState, useEffect } from 'react';
import { TelegramAPI } from '../utils/telegram-api-core';

interface QRGeneratorProps {
  userId: number;
}

const QRGenerator: React.FC<QRGeneratorProps> = ({ userId }) => {
  const [qrData, setQrData] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    generateQRData();
  }, [userId]);

  const generateQRData = () => {
    try {
      setIsLoading(true);
      
      const user = TelegramAPI.getUser();
      const qrPayload = {
        type: 'employee_hire',
        version: '1.0',
        userId: userId,
        firstName: user?.first_name || '',
        lastName: user?.last_name || '',
        username: user?.username || '',
        languageCode: user?.language_code || 'ru',
        timestamp: Date.now(),
        expires: Date.now() + (24 * 60 * 60 * 1000) // 24 часа
      };
      
      const qrString = JSON.stringify(qrPayload);
      setQrData(qrString);
    } catch (error) {
      console.error('Ошибка генерации QR:', error);
      setQrData(`hire:${userId}:${Date.now()}`);
    } finally {
      setIsLoading(false);
    }
  };

  const generateQRCodeURL = (data: string) => {
    const encodedData = encodeURIComponent(data);
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodedData}`;
  };

  if (isLoading) {
    return (
      <div className="qr-generator loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="qr-generator">
      <div className="qr-code-container">
        <img 
          src={generateQRCodeURL(qrData)}
          alt="QR код пользователя"
          className="qr-code-image"
          onError={(e) => {
            console.error('Ошибка загрузки QR-кода');
            e.currentTarget.style.display = 'none';
          }}
        />
      </div>
      
      <div className="qr-info">
        <div className="qr-user-info">
          <i className="fas fa-user"></i>
          <span>{TelegramAPI.getUser()?.first_name} {TelegramAPI.getUser()?.last_name}</span>
        </div>
        <div className="qr-instruction">
          Покажите этот код работодателю
        </div>
      </div>
    </div>
  );
};

export default QRGenerator;