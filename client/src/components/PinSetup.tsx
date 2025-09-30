import React, { useState, useEffect } from 'react';
import { TelegramAPI } from '../utils/telegram-api-core';
import { showSuccess, showError } from './ToastManager';
import { useBackButton } from '../hooks/useBackButton';
import { useSettings } from '../hooks/useSettings';
import './PinCodeModal.css';

interface PinSetupProps {
  onBack: () => void;
}

const PinSetup: React.FC<PinSetupProps> = ({ onBack }) => {
  const [currentStep, setCurrentStep] = useState(1); // 1 - ввод, 2 - повтор
  const [firstPin, setFirstPin] = useState('');
  const [currentPin, setCurrentPin] = useState('');
  const [error, setError] = useState('');
  const { updateSetting } = useSettings();

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
      const newPin = currentPin + digit;
      setCurrentPin(newPin);
      TelegramAPI.vibrate('light');
      
      if (newPin.length === 4) {
        setTimeout(() => handleComplete(newPin), 300);
      }
    }
  };

  const removeDigit = () => {
    if (currentPin.length > 0) {
      setCurrentPin(currentPin.slice(0, -1));
      TelegramAPI.vibrate('light');
    }
  };

  const handleComplete = (pin: string) => {
    if (currentStep === 1) {
      setFirstPin(pin);
      setCurrentPin('');
      setCurrentStep(2);
      setError('');
    } else {
      if (firstPin === pin) {
        savePin(pin);
      } else {
        setError('PIN-коды не совпадают. Попробуйте еще раз.');
        TelegramAPI.vibrate('error');
        setTimeout(() => {
          setCurrentStep(1);
          setFirstPin('');
          setCurrentPin('');
          setError('');
        }, 1500);
      }
    }
  };

  const savePin = async (pin: string) => {
    try {
      // Простое хеширование (в продакшене использовать bcrypt)
      const hashedPin = btoa(pin);
      await updateSetting('pincode', hashedPin);
      await updateSetting('hasPincode', true);
      
      TelegramAPI.vibrate('success');
      showSuccess('PIN-код установлен');
      
      setTimeout(() => {
        onBack();
      }, 1000);
    } catch (error) {
      console.error('Ошибка сохранения PIN:', error);
      showError('Ошибка сохранения PIN-кода');
      TelegramAPI.vibrate('error');
    }
  };

  return (
    <div className="fade-in">
      <div className="card">
        <div className="card-title">
          <i className="fas fa-shield-alt"></i>
          {currentStep === 1 ? 'Создать PIN-код' : 'Повторите PIN-код'}
        </div>
        <div className="card-content">
          <div className="pin-setup-content">
            <div className="pin-description">
              {currentStep === 1 
                ? 'Введите 4-значный PIN-код для защиты доступа'
                : 'Введите PIN-код еще раз для подтверждения'
              }
            </div>
            
            <div className="pin-display">
              {[0, 1, 2, 3].map((index) => (
                <div 
                  key={index} 
                  className={`pin-dot ${index < currentPin.length ? 'filled' : ''}`}
                />
              ))}
            </div>
            
            {error && (
              <div className="pin-error">
                {error}
              </div>
            )}
            
            <div className="pin-keypad">
              {[
                ['1', '2', '3'],
                ['4', '5', '6'],
                ['7', '8', '9'],
                ['', '0', 'backspace']
              ].map((row, rowIndex) => (
                <div key={rowIndex} className="pin-keypad-row">
                  {row.map((key, keyIndex) => (
                    <button
                      key={keyIndex}
                      className={`pin-key ${key === '' ? 'pin-key-empty' : ''}`}
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
      </div>
    </div>
  );
};

export default PinSetup;