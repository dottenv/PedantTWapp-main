import React, { useState, useEffect } from 'react';
import { TelegramAPI } from '../utils/telegram-api-core';
import { showSuccess, showError } from './ToastManager';
import { useBackButton } from '../hooks/useBackButton';

interface PinChangeProps {
  onBack: () => void;
}

const PinChange: React.FC<PinChangeProps> = ({ onBack }) => {
  const [currentStep, setCurrentStep] = useState(1); // 1 - старый PIN, 2 - новый PIN, 3 - повтор нового
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [currentPin, setCurrentPin] = useState('');
  const [error, setError] = useState('');

  useBackButton(onBack);

  useEffect(() => {
    // Блокируем системную клавиатуру
    const blockSystemKeyboard = (e: KeyboardEvent) => {
      if ((e.key >= '0' && e.key <= '9') || e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
      }
    };

    document.addEventListener('keydown', blockSystemKeyboard);
    return () => document.removeEventListener('keydown', blockSystemKeyboard);
  }, []);

  const addDigit = (digit: string) => {
    if (currentPin.length < 4) {
      const newPinValue = currentPin + digit;
      setCurrentPin(newPinValue);
      TelegramAPI.vibrate('light');
      
      if (newPinValue.length === 4) {
        setTimeout(() => handleComplete(newPinValue), 300);
      }
    }
  };

  const removeDigit = () => {
    if (currentPin.length > 0) {
      setCurrentPin(currentPin.slice(0, -1));
      TelegramAPI.vibrate('light');
    }
  };

  const handleComplete = async (pin: string) => {
    if (currentStep === 1) {
      // Проверяем старый PIN
      const isValid = await validateOldPin(pin);
      if (isValid) {
        setOldPin(pin);
        setCurrentPin('');
        setCurrentStep(2);
        setError('');
      } else {
        setError('Неверный PIN-код. Попробуйте еще раз.');
        TelegramAPI.vibrate('error');
        setTimeout(() => {
          setCurrentPin('');
          setError('');
        }, 1500);
      }
    } else if (currentStep === 2) {
      // Сохраняем новый PIN
      setNewPin(pin);
      setCurrentPin('');
      setCurrentStep(3);
      setError('');
    } else {
      // Проверяем совпадение нового PIN
      if (newPin === pin) {
        saveNewPin(pin);
      } else {
        setError('PIN-коды не совпадают. Попробуйте еще раз.');
        TelegramAPI.vibrate('error');
        setTimeout(() => {
          setCurrentStep(1);
          setOldPin('');
          setNewPin('');
          setCurrentPin('');
          setError('');
        }, 1500);
      }
    }
  };

  const validateOldPin = async (pin: string): Promise<boolean> => {
    try {
      // Здесь должна быть проверка старого PIN-кода
      // Пока возвращаем true для демонстрации
      await new Promise(resolve => setTimeout(resolve, 500));
      return pin === '1234'; // Демо: старый PIN = 1234
    } catch (error) {
      console.error('Ошибка проверки PIN:', error);
      return false;
    }
  };

  const saveNewPin = async (pin: string) => {
    try {
      TelegramAPI.vibrate('success');
      showSuccess('PIN-код изменен');
      
      setTimeout(() => {
        onBack();
      }, 1000);
    } catch (error) {
      console.error('Ошибка сохранения нового PIN:', error);
      showError('Ошибка изменения PIN-кода');
      TelegramAPI.vibrate('error');
    }
  };

  const getTitle = () => {
    switch (currentStep) {
      case 1: return 'Изменить PIN-код';
      case 2: return 'Новый PIN-код';
      case 3: return 'Повторите PIN-код';
      default: return 'PIN-код';
    }
  };

  const getSubtitle = () => {
    switch (currentStep) {
      case 1: return 'Введите текущий PIN-код';
      case 2: return 'Введите новый 4-значный PIN-код';
      case 3: return 'Введите новый PIN-код еще раз';
      default: return '';
    }
  };

  return (
    <div className="pin-setup-page">
      <div className="pin-container">
        <div className="pin-header">
          <div className="pin-title">{getTitle()}</div>
          <div className="pin-subtitle">{getSubtitle()}</div>
        </div>
        
        <div className="pin-dots-container">
          {[0, 1, 2, 3].map((index) => (
            <div 
              key={index} 
              className={`pin-dot ${index < currentPin.length ? 'filled' : ''}`}
            />
          ))}
        </div>
        
        {error && (
          <div className="pin-error shake-animation">
            {error}
          </div>
        )}
        
        <div className="pin-keyboard">
          {[
            ['1', '2', '3'],
            ['4', '5', '6'],
            ['7', '8', '9'],
            ['', '0', 'backspace']
          ].map((row, rowIndex) => (
            <div key={rowIndex} className="pin-row">
              {row.map((key, keyIndex) => (
                <button
                  key={keyIndex}
                  className={`pin-key ${key === '' ? 'pin-key-empty' : ''} ${key === 'backspace' ? 'pin-key-backspace' : ''}`}
                  onClick={() => {
                    if (key === 'backspace') {
                      removeDigit();
                    } else if (key !== '') {
                      addDigit(key);
                    }
                  }}
                  disabled={key === ''}
                >
                  {key === 'backspace' ? (
                    <i className="fas fa-backspace"></i>
                  ) : (
                    key
                  )}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PinChange;