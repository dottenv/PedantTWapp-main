import { useEffect, useState } from 'react';
import { TelegramAPI } from '../utils/telegram-api-core';

export const useSaveButton = (
  initialValues: Record<string, any>,
  currentValues: Record<string, any>,
  onSave: () => void,
  saveText = 'Сохранить'
) => {
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const changed = Object.keys(currentValues).some(
      key => currentValues[key] !== initialValues[key]
    );
    setHasChanges(changed);
  }, [initialValues, currentValues]);

  useEffect(() => {
    if (hasChanges) {
      TelegramAPI.showMainButtonWithProgress(saveText, onSave);
    } else {
      TelegramAPI.hideMainButton();
    }

    return () => {
      TelegramAPI.hideMainButton();
    };
  }, [hasChanges, onSave, saveText]);

  return hasChanges;
};