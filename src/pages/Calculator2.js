import { useState, useEffect } from 'react'
import "../styles/Calculator2.css"
import { useTranslation } from "react-i18next";
import { GrFormPrevious } from "react-icons/gr";
import { Link } from "react-router-dom";

function Calculator() {
  const { t } = useTranslation();
  // Инициализируем историю с загружкой из localStorage
  const [history, setHistory] = useState(() => {
    try {
      const savedHistory = localStorage.getItem('calculatorHistory');
      return savedHistory ? JSON.parse(savedHistory) : [];
    } catch (error) {
      console.error('Ошибка при загрузке истории:', error);
      return [];
    }
  });
  
  const [display, setDisplay] = useState('0');
  const [previous, setPrevious] = useState(null);
  const [operation, setOperation] = useState(null);
  const [waitingForNewValue, setWaitingForNewValue] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    message: '',
    onConfirm: null,
    itemIndex: null
  });

  const handleNumberClick = (num) => {
    if (waitingForNewValue) {
      setDisplay(String(num));
      setWaitingForNewValue(false);
    } else {
      setDisplay(display === '0' ? String(num) : display + num);
    }
  };

  const handleDecimal = () => {
    if (waitingForNewValue) {
      setDisplay('0.');
      setWaitingForNewValue(false);
    } else if (!display.includes('.')) {
      setDisplay(display + '.');
    }
  };

  const handleOperation = (op) => {
    const inputValue = parseFloat(display);

    if (previous === null) {
      setPrevious(inputValue);
    } else if (operation) {
      const result = calculate(previous, inputValue, operation);
      setDisplay(String(result));
      setPrevious(result);
    }

    setOperation(op);
    setWaitingForNewValue(true);
  };

  const calculate = (prev, current, op) => {
    switch (op) {
      case '+':
        return prev + current;
      case '-':
        return prev - current;
      case '*':
        return prev * current;
      case '/':
        return prev / current;
      case '%':
        return prev % current;
      default:
        return current;
    }
  };

  const handleEquals = () => {
    const inputValue = parseFloat(display);

    if (previous !== null && operation) {
      const result = calculate(previous, inputValue, operation);
      const historyEntry = `${previous} ${operation} ${inputValue} = ${result}`;
      setHistory([historyEntry, ...history]);
      setDisplay(String(result));
      setPrevious(null);
      setOperation(null);
      setWaitingForNewValue(true);
    }
  };

  const handleClear = () => {
    setDisplay('0');
    setPrevious(null);
    setOperation(null);
    setWaitingForNewValue(false);
  };

  const handleDelete = () => {
    if (display.length === 1) {
      setDisplay('0');
    } else {
      setDisplay(display.slice(0, -1));
    }
  };

  const clearHistory = () => {
    setConfirmDialog({
      isOpen: true,
      message: 'Are you sure you want to clear all history?',
      onConfirm: () => {
        setHistory([]);
        setConfirmDialog({ isOpen: false, message: '', onConfirm: null, itemIndex: null });
      },
      itemIndex: null
    });
  };

  const removeHistoryItem = (index) => {
    setConfirmDialog({
      isOpen: true,
      message: 'Are you sure you want to delete this entry?',
      onConfirm: () => {
        setHistory(history.filter((_, i) => i !== index));
        setConfirmDialog({ isOpen: false, message: '', onConfirm: null, itemIndex: null });
      },
      itemIndex: index
    });
  };

  const handleConfirmCancel = () => {
    setConfirmDialog({ isOpen: false, message: '', onConfirm: null, itemIndex: null });
  };

  const insertFromHistory = (entry) => {
    const result = entry.split('=')[1].trim();
    setDisplay(result);
    setPrevious(null);
    setOperation(null);
    setWaitingForNewValue(true);
  };

  // Сохранение истории в localStorage при изменении
  useEffect(() => {
    localStorage.setItem('calculatorHistory', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    const handleKeyPress = (e) => {
      const key = e.key;

      // Числовые клавиши
      if (key >= '0' && key <= '9') {
        handleNumberClick(parseInt(key));
      }
      // Операторы
      else if (key === '+') {
        handleOperation('+');
      }
      else if (key === '-') {
        handleOperation('-');
      }
      else if (key === '*') {
        handleOperation('*');
      }
      else if (key === '/') {
        e.preventDefault();
        handleOperation('/');
      }
      else if (key === '%') {
        handleOperation('%');
      }
      // Точка/Запятая для децимали
      else if (key === '.' || key === ',') {
        e.preventDefault();
        handleDecimal();
      }
      // Enter или 
      else if (key === 'Enter' || key === '=') {
        e.preventDefault();
        handleEquals();
      }
      // Backspace для удаления
      else if (key === 'Backspace') {
        e.preventDefault();
        handleDelete();
      }
      // Escape для очистки
      else if (key === 'Escape') {
        handleClear();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [display, previous, operation, waitingForNewValue]);

  return (
    <div className='Calculator2'>
        <div className="prevBtn">
            <Link to="/hisobot"><h3><GrFormPrevious /> Orqaga</h3></Link>
        </div>
      {confirmDialog.isOpen && (
        <div className="confirm-overlay" onClick={handleConfirmCancel}>
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-message">{confirmDialog.message}</div>
            <div className="confirm-buttons">
              <button 
                className="confirm-btn confirm-cancel"
                onClick={handleConfirmCancel}
              >
                {t("Cancel")}
              </button>
              <button 
                className="confirm-btn confirm-delete"
                onClick={confirmDialog.onConfirm}
              >
                {t("Delete")}
              </button>
            </div>
          </div>
        </div>
      )}

      {showHistory && (
        <div className="modal-overlay" onClick={() => setShowHistory(false)}>
          <div className="history-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h1>{t("Calculation History")}</h1>
              <button 
                className="modal-close"
                onClick={() => setShowHistory(false)}
              >
                ✕
              </button>
            </div>
            
            <div className="modal-content">
              {history.length === 0 ? (
                <p className="no-history">{t("NoCalculationsYet")}</p>
              ) : (
                <>
                  <div className="history-list">
                    {history.map((entry, index) => (
                      <div 
                        key={index} 
                        className="history-item" 
                        onClick={() => {
                          insertFromHistory(entry);
                          setShowHistory(false);
                        }}
                      >
                        <span className="history-text">{entry}</span>
                        <button 
                          className="btn-delete-item"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeHistoryItem(index);
                          }}
                          title="Delete"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                  {history.length > 0 && (
                    <button className="btn-clear-history" onClick={clearHistory}>
                      {t("Clear All")}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="calculator-wrapper">
        <div className="calculator-container">
          <div className="calc-content">
            <h1>{t("Kalkulator")}</h1>
            <div className="calculator-box">
              <div className="display">{display}</div>
              
              <div className="calculator-grid">
                <button className="btn btn-clear" onClick={handleClear}>C</button>
                <button className="btn btn-delete" onClick={handleDelete}>DEL</button>
                <button className="btn btn-operation" onClick={() => handleOperation('%')}>%</button>
                <button className="btn btn-operation" onClick={() => handleOperation('/')}>/</button>

                <button className="btn" onClick={() => handleNumberClick(7)}>7</button>
                <button className="btn" onClick={() => handleNumberClick(8)}>8</button>
                <button className="btn" onClick={() => handleNumberClick(9)}>9</button>
                <button className="btn btn-operation" onClick={() => handleOperation('*')}>*</button>

                <button className="btn" onClick={() => handleNumberClick(4)}>4</button>
                <button className="btn" onClick={() => handleNumberClick(5)}>5</button>
                <button className="btn" onClick={() => handleNumberClick(6)}>6</button>
                <button className="btn btn-operation" onClick={() => handleOperation('-')}>-</button>

                <button className="btn" onClick={() => handleNumberClick(1)}>1</button>
                <button className="btn" onClick={() => handleNumberClick(2)}>2</button>
                <button className="btn" onClick={() => handleNumberClick(3)}>3</button>
                <button className="btn btn-operation" onClick={() => handleOperation('+')}>+</button>

                <button className="btn btn-zero" onClick={() => handleNumberClick(0)}>0</button>
                <button className="btn" onClick={handleDecimal}>.</button>
                <button className="btn btn-equals" onClick={handleEquals}>=</button>
              </div>

              <button 
                className="btn-show-history"
                onClick={() => setShowHistory(true)}
              >
                📜 {t("History")} ({history.length})
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Calculator