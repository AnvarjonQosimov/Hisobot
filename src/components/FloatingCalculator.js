import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Minus, Maximize2, RotateCcw, History as HistoryIcon, Trash2 } from 'lucide-react';
import '../styles/FloatingCalculator.css';
import { useTranslation } from "react-i18next";

const FloatingCalculator = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const [display, setDisplay] = useState('0');
  const [previous, setPrevious] = useState(null);
  const [operation, setOperation] = useState(null);
  const [waitingForNewValue, setWaitingForNewValue] = useState(false);
  const [history, setHistory] = useState(() => {
    const saved = localStorage.getItem('floatingCalculatorHistory');
    return saved ? JSON.parse(saved) : [];
  });
  const [showHistory, setShowHistory] = useState(false);
  const [size, setSize] = useState({ width: 280, height: 400 });
  const [itemToDelete, setItemToDelete] = useState(null); // index of item to delete, or 'all'
  const containerRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('floatingCalculatorHistory', JSON.stringify(history));
  }, [history]);

  const handleNumberClick = useCallback((num) => {
    if (waitingForNewValue) {
      setDisplay(String(num));
      setWaitingForNewValue(false);
    } else {
      setDisplay(display === '0' ? String(num) : display + num);
    }
  }, [display, waitingForNewValue]);

  const handleDecimal = useCallback(() => {
    if (waitingForNewValue) {
      setDisplay('0.');
      setWaitingForNewValue(false);
    } else if (!display.includes('.')) {
      setDisplay(display + '.');
    }
  }, [display, waitingForNewValue]);

  const calculate = (prev, current, op) => {
    const p = parseFloat(prev);
    const c = parseFloat(current);
    switch (op) {
      case '+': return p + c;
      case '-': return p - c;
      case '*': return p * c;
      case '/': return p / c;
      case '%': return p % c;
      default: return c;
    }
  };

  const handleOperation = useCallback((op) => {
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
  }, [display, previous, operation]);

  const handleEquals = useCallback(() => {
    const inputValue = parseFloat(display);
    if (previous !== null && operation) {
      const result = calculate(previous, inputValue, operation);
      const historyEntry = `${previous} ${operation} ${inputValue} = ${result}`;
      setHistory([historyEntry, ...history.slice(0, 19)]);
      setDisplay(String(result));
      setPrevious(null);
      setOperation(null);
      setWaitingForNewValue(true);
    }
  }, [display, previous, operation, history]);

  const handleClear = useCallback(() => {
    setDisplay('0');
    setPrevious(null);
    setOperation(null);
    setWaitingForNewValue(false);
  }, []);

  const handleDelete = useCallback(() => {
    if (display.length === 1) {
      setDisplay('0');
    } else {
      setDisplay(display.slice(0, -1));
    }
  }, [display]);

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (!isOpen) return;
      const key = e.key;
      if (key >= '0' && key <= '9') handleNumberClick(parseInt(key));
      else if (key === '+') handleOperation('+');
      else if (key === '-') handleOperation('-');
      else if (key === '*') handleOperation('*');
      else if (key === '/') { e.preventDefault(); handleOperation('/'); }
      else if (key === '%') handleOperation('%');
      else if (key === '.' || key === ',') { e.preventDefault(); handleDecimal(); }
      else if (key === 'Enter' || key === '=') { e.preventDefault(); handleEquals(); }
      else if (key === 'Backspace') { e.preventDefault(); handleDelete(); }
      else if (key === 'Escape') handleClear();
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isOpen, handleNumberClick, handleOperation, handleDecimal, handleEquals, handleDelete, handleClear]);

  if (!isOpen) return null;

  return (
    <motion.div
      drag
      dragMomentum={false}
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, y: 20 }}
      className="floating-calculator"
      style={{ width: size.width, height: size.height }}
    >
      <div className="calc-header">
        <div className="drag-handle">
          <span>{t("Kalkulator")}</span>
        </div>
        <div className="header-actions">
          <button onClick={() => setShowHistory(!showHistory)} title="History"><HistoryIcon size={14} /></button>
          <button onClick={onClose} title="Close"><X size={14} /></button>
        </div>
      </div>

      <div className="calc-content-wrapper">
        {showHistory ? (
          <div className="calc-history">
            <div className="history-header">
              <span>{t("History")}</span>
              <button onClick={() => setItemToDelete('all')}><RotateCcw size={12} /></button>
            </div>
            <div className="history-items">
              {history.length === 0 ? <p>{t("NoCalculationsYet")}</p> : 
                history.map((h, i) => (
                  <div key={i} className="history-item-wrapper">
                    <div className="history-item" onClick={() => { setDisplay(h.split('=')[1].trim()); setShowHistory(false); }}>
                      {h}
                    </div>
                    <button 
                      className="history-delete-btn" 
                      onClick={(e) => { e.stopPropagation(); setItemToDelete(i); }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))
              }
            </div>
          </div>
        ) : (
          <>
            <div className="calc-display">
              <div className="prev-val">{previous} {operation}</div>
              <div className="main-val">{display}</div>
            </div>
            <div className="calc-buttons">
              <button className="btn btn-util" onClick={handleClear}>C</button>
              <button className="btn btn-util" onClick={handleDelete}>DEL</button>
              <button className="btn btn-util" onClick={() => handleOperation('%')}>%</button>
              <button className="btn btn-op" onClick={() => handleOperation('/')}>/</button>
              
              <button className="btn" onClick={() => handleNumberClick(7)}>7</button>
              <button className="btn" onClick={() => handleNumberClick(8)}>8</button>
              <button className="btn" onClick={() => handleNumberClick(9)}>9</button>
              <button className="btn btn-op" onClick={() => handleOperation('*')}>×</button>
              
              <button className="btn" onClick={() => handleNumberClick(4)}>4</button>
              <button className="btn" onClick={() => handleNumberClick(5)}>5</button>
              <button className="btn" onClick={() => handleNumberClick(6)}>6</button>
              <button className="btn btn-op" onClick={() => handleOperation('-')}>-</button>
              
              <button className="btn" onClick={() => handleNumberClick(1)}>1</button>
              <button className="btn" onClick={() => handleNumberClick(2)}>2</button>
              <button className="btn" onClick={() => handleNumberClick(3)}>3</button>
              <button className="btn btn-op" onClick={() => handleOperation('+')}>+</button>
              
              <button className="btn btn-zero" onClick={() => handleNumberClick(0)}>0</button>
              <button className="btn" onClick={handleDecimal}>.</button>
              <button className="btn btn-eq" onClick={handleEquals}>=</button>
            </div>
          </>
        )}
      </div>
      <div className="resize-handle" onMouseDown={(e) => {
        const startX = e.pageX;
        const startY = e.pageY;
        const startWidth = size.width;
        const startHeight = size.height;
        
        const onMouseMove = (moveEvent) => {
          setSize({
            width: Math.max(240, startWidth + (moveEvent.pageX - startX)),
            height: Math.max(300, startHeight + (moveEvent.pageY - startY))
          });
        };
        
        const onMouseUp = () => {
          document.removeEventListener('mousemove', onMouseMove);
          document.removeEventListener('mouseup', onMouseUp);
        };
        
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
      }} />

      {/* Deletion Confirmation Modal */}
      <AnimatePresence>
        {itemToDelete !== null && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="calc-confirm-overlay"
          >
            <motion.div 
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="calc-confirm-modal"
            >
              <p>{itemToDelete === 'all' ? t("Barcha tarixni tozalamoqchimisiz?") : t("Ushbu yozuvni o'chirmoqchimisiz?")}</p>
              <div className="calc-confirm-buttons">
                <button 
                  className="calc-btn-cancel" 
                  onClick={() => setItemToDelete(null)}
                >
                  {t("yo'q")}
                </button>
                <button 
                  className="calc-btn-confirm" 
                  onClick={() => {
                    if (itemToDelete === 'all') {
                      setHistory([]);
                    } else {
                      const newHistory = [...history];
                      newHistory.splice(itemToDelete, 1);
                      setHistory(newHistory);
                    }
                    setItemToDelete(null);
                  }}
                >
                  {t("ha")}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default FloatingCalculator;
