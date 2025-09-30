import { useState, useEffect } from 'react'
import { TelegramAPI } from './utils/telegram-api-core'
import { initLocalization } from './locales'
import { apiService } from './services/api'
import { swipeManager } from './utils/SwipeManager'
import { backButtonManager } from './utils/BackButtonManager'
import { useSwipeNavigation } from './hooks/useSwipeNavigation'
import OrdersList from './components/OrdersList'
import OrderDetails from './components/OrderDetails'
import EditOrder from './components/EditOrder'
import Settings from './components/Settings'
import ProfileSettings from './components/ProfileSettings'
import SecuritySettings from './components/SecuritySettings'
import StorageSettings from './components/StorageSettings'
import LanguageSelector from './components/LanguageSelector'
import DebugPage from './components/DebugPage'
import PinCodeModal from './components/PinCodeModal'
import './components/PinCodeModal.css'
import ToastManager from './components/ToastManager'
import TelegramLoggerComponent, { telegramLogger } from './components/TelegramLogger'
import { initializeUser } from './utils/user-init'
import { sessionManager } from './utils/session-manager'
import { useSettings } from './hooks/useSettings'
import './utils/telegram-debug'
import './App.css'

interface Order {
  id: number;
  created_at: string;
  photos_count: number;
  created_by: string;
}

function App() {
  const [isLoading, setIsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState('orders')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [navigationHistory, setNavigationHistory] = useState<string[]>(['orders'])
  const [showPinModal, setShowPinModal] = useState(false)
  const [pinMode, setPinMode] = useState<'setup' | 'verify'>('verify')
  const [isLocked, setIsLocked] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  
  // Подключаем настройки
  const { settings, isLoading: settingsLoading } = useSettings();

  // Настройка свайп-навигации
  useSwipeNavigation({
    enabled: !isLoading,
    priority: -1,
    id: 'app-navigation',
    onSwipeRight: () => {
      if (navigationHistory.length > 1) {
        handleBack()
      }
    },
    onSwipeLeft: () => {
      if (currentPage === 'orders') {
        handleNavigate('settings')
      }
    }
  })

  useEffect(() => {
    const initApp = async () => {
      await initLocalization()
      const isTelegramAvailable = TelegramAPI.init()
      swipeManager.init()
      
      telegramLogger.info('Проверяем подключение к API...');
      const isServerConnected = await apiService.checkServerConnection();
      
      if (!isServerConnected) {
        telegramLogger.error('Не удалось подключиться к API серверу!');
        // Запускаем тестирование API для отладки
        await apiService.testAPI();
      }
      
      if (isServerConnected) {
        const sessionData = await initializeUser(isTelegramAvailable);
        if (sessionData?.session) {
          await sessionManager.initSession(sessionData.session);
        }
        if (sessionData?.user) {
          setCurrentUser(sessionData.user);
        }
      }
      
      if (isTelegramAvailable) {
        TelegramAPI.showSettingsButton(() => {
          handleNavigate('settings')
        })
      }
      
      telegramLogger.success('✅ Приложение инициализировано');
      setIsLoading(false);
    }
    
    initApp()

    return () => {
      if (TelegramAPI.isAvailable()) {
        TelegramAPI.hideSettingsButton()
      }
      swipeManager.destroy()
      backButtonManager.clear()
    }
  }, [])

  const handleOrderSelect = (order: Order) => {
    setSelectedOrder(order)
    handleNavigate('order-details')
  }

  const handleBackToList = () => {
    handleBack()
  }

  const handleEditOrder = (order: Order) => {
    setSelectedOrder(order)
    handleNavigate('edit-order')
  }

  const handleSaveOrder = async (orderData: any) => {
    try {
      if (selectedOrder) {
        await apiService.updateOrder(selectedOrder.id, orderData);
        handleBackToList();
      }
    } catch (error) {
      console.error('Ошибка сохранения заказа:', error);
    }
  }

  const handleNavigate = (page: string) => {
    setNavigationHistory(prev => [...prev, page])
    setCurrentPage(page)
  }
  
  const handleBack = () => {
    if (navigationHistory.length > 1) {
      const newHistory = [...navigationHistory]
      newHistory.pop()
      const previousPage = newHistory[newHistory.length - 1]
      
      setNavigationHistory(newHistory)
      setCurrentPage(previousPage)
      
      if (previousPage === 'orders') {
        setSelectedOrder(null)
      }
    } else {
      if (TelegramAPI.isAvailable()) {
        TelegramAPI.close()
      }
    }
  }

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'order-details':
        return selectedOrder ? (
          <OrderDetails order={selectedOrder} onBack={handleBackToList} onEdit={() => handleEditOrder(selectedOrder)} />
        ) : <div>Заказ не найден</div>
      case 'edit-order':
        return selectedOrder ? (
          <EditOrder order={selectedOrder} onBack={handleBackToList} onSave={handleSaveOrder} />
        ) : <div>Заказ не найден</div>
      case 'settings':
        return <Settings onBack={handleBack} onNavigate={handleNavigate} currentUser={currentUser} />
      case 'profile-settings':
        return <ProfileSettings 
          onBack={handleBack} 
          onNavigate={handleNavigate}
          onShowPinSetup={() => {
            setPinMode('setup')
            setShowPinModal(true)
          }}
        />
      case 'language-selector':
        return <LanguageSelector onBack={handleBack} />
      case 'security-settings':
        return <SecuritySettings 
          onBack={handleBack} 
          onShowPinSetup={() => {
            setPinMode('setup')
            setShowPinModal(true)
          }}
          onShowPinVerify={() => {
            setPinMode('verify')
            setShowPinModal(true)
          }}
        />
      case 'storage-settings':
        return <StorageSettings onBack={handleBack} />
      case 'debug-page':
        return <DebugPage onBack={handleBack} />
      case 'orders':
      default:
        return <OrdersList onOrderSelect={handleOrderSelect} onOrderEdit={handleEditOrder} />
    }
  }

  if (isLoading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Загрузка...</p>
      </div>
    )
  }

  return (
    <div className="app">
      <main id="main-content">
        {renderCurrentPage()}
      </main>
      <ToastManager />
      <TelegramLoggerComponent />
      
      <PinCodeModal
        isOpen={showPinModal}
        mode={pinMode}
        onSuccess={() => {
          setShowPinModal(false)
          if (pinMode === 'setup') {
            console.log('PIN-код установлен')
          } else {
            console.log('PIN-код проверен')
            setIsLocked(false)
            sessionStorage.setItem('pin_verified', 'true')
          }
        }}
        onCancel={() => {
          if (pinMode === 'verify' && isLocked) {
            return
          }
          setShowPinModal(false)
        }}
      />
    </div>
  )
}

export default App