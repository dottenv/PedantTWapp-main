import React, { useState, useEffect } from 'react';
import { TelegramAPI } from '../utils/telegram-api-core';
import { useSettings } from '../hooks/useSettings';
import { showError, showSuccess } from './ToastManager';

interface PinCodeModalProps {
  isOpen: boolean;
  mode: 'setup' | 'verify';
  onSuccess: () => void;
  onCancel: () => void;
}

const PinCodeModal: React.FC<PinCodeModalProps> = ({ isOpen, mode, onSuccess, onCancel }) => {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState<'enter' | 'confirm'>('enter');
  const { settings, updateSetting } = useSettings();

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setConfirmPin('');
      setStep('enter');
    }
  }, [isOpen]);

  const handlePinInput = (digit: string) => {
    if (step === 'enter') {
      if (pin.length < 4) {
        setPin(prev => prev + digit);
        TelegramAPI.vibrate('light');
      }
    } else {
      if (confirmPin.length < 4) {
        setConfirmPin(prev => prev + digit);
        TelegramAPI.vibrate('light');
      }
    }
  };

  const handleBackspace = () => {
    if (step === 'enter') {
      setPin(prev => prev.slice(0, -1));
    } else {
      setConfirmPin(prev => prev.slice(0, -1));
    }
    TelegramAPI.vibrate('light');
  };

  const handleSubmit = async () => {
    if (mode === 'setup') {
      if (step === 'enter' && pin.length === 4) {
        setStep('confirm');
        return;
      }
      
      if (step === 'confirm' && confirmPin.length === 4) {
        if (pin === confirmPin) {
          // Простое хеширование (в продакшене использовать bcrypt)
          const hashedPin = btoa(pin);
          await updateSetting('pincode', hashedPin);
          await updateSetting('hasPincode', true);
          showSuccess('PIN-код установлен');
          TelegramAPI.vibrate('success');
          onSuccess();
        } else {
          showError('PIN-коды не совпадают');
          TelegramAPI.vibrate('error');
          setStep('enter');
          setPin('');
          setConfirmPin('');
        }
      }
    } else {
      if (pin.length === 4) {
        const hashedPin = btoa(pin);
        if (hashedPin === settings?.pincode) {
          showSuccess('PIN-код верный');
          TelegramAPI.vibrate('success');
          onSuccess();
        } else {
          showError('Неверный PIN-код');
          TelegramAPI.vibrate('error');
          setPin('');
        }
      }
    }
  };

  useEffect(() => {
    if (pin.length === 4 && mode === 'verify') {
      handleSubmit();
    } else if (pin.length === 4 && mode === 'setup' && step === 'enter') {
      handleSubmit();
    } else if (confirmPin.length === 4 && mode === 'setup' && step === 'confirm') {
      handleSubmit();
    }
  }, [pin, confirmPin]);

  if (!isOpen) return null;

  const getTitle = () => {
    if (mode === 'setup') {
      return step === 'enter' ? 'Установите PIN-код' : 'Подтвердите PIN-код';
    }
    return 'Введите PIN-код';
  };

  const getCurrentPin = () => {
    return step === 'enter' ? pin : confirmPin;
  };

  return (
    <div className="modal-overlay">
      <div className="modal pin-modal">
        <div className="modal-header">
          <h3>{getTitle()}</h3>
        </div>
        
        <div className="pin-display">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className={`pin-dot ${i < getCurrentPin().length ? 'filled' : ''}`} />
          ))}
        </div>

        <div className="pin-keypad">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
            <button
              key={num}
              className="pin-key"
              onClick={() => handlePinInput(num.toString())}
            >
              {num}
            </button>
          ))}
          <button className="pin-key" onClick={onCancel}>
            <i className="fas fa-times"></i>
          </button>
          <button className="pin-key" onClick={() => handlePinInput('0')}>
            0
          </button>
          <button className="pin-key" onClick={handleBackspace}>
            <i className="fas fa-backspace"></i>
          </button>
        </div>
      </div>
    </div>
  );
};

export default PinCodeModal;