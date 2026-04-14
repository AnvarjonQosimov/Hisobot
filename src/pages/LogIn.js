import React, { useState, useEffect } from 'react'
import "../styles/LogIn.css"
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { Link } from "react-router-dom";

function LogIn() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [buttonPosition, setButtonPosition] = useState({ x: 0, y: 0 });
  const [isButtonEnabled, setIsButtonEnabled] = useState(false);
  const [usernameError, setUsernameError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [generalError, setGeneralError] = useState('');

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // Проверяем заполненность полей
  useEffect(() => {
    const filled = username.trim().length >= 3 && password.trim().length >= 8;
    setIsButtonEnabled(filled);
    if (filled) {
      setButtonPosition({ x: 0, y: 0 }); // Возвращаем кнопку на исходное место
      setGeneralError(''); // Убираем предупреждение при заполнении
    } else {
      setButtonPosition({ x: 0, y: 0 }); // Также возвращаем на исходное место, когда поля пустые
      setGeneralError('Пожалуйста, заполните все поля корректно: минимум 3 символа для UserName и 8 для Password!'); // Показываем предупреждение при незаполненности
    }
  }, [username, password]);

  const handleMouseMove = (e) => {
    if (!isButtonEnabled) { // Убегает только если поля не заполнены
      const button = e.target;
      const rect = button.getBoundingClientRect();
      const mouseX = e.clientX;
      const mouseY = e.clientY;

      // Проверяем, находится ли курсор близко к кнопке
      const distance = Math.sqrt(
        Math.pow(mouseX - (rect.left + rect.width / 2), 2) +
        Math.pow(mouseY - (rect.top + rect.height / 2), 2)
      );

      if (distance < 80) { // Если курсор ближе 80px
        // Генерируем новое случайное положение
        const maxX = window.innerWidth < 500 ? 80 : 125;
const maxY = window.innerWidth < 500 ? 80 : 125;

const newX = Math.random() * maxX * 2 - maxX;
const newY = Math.random() * maxY * 2 - maxY;
        setButtonPosition({ x: newX, y: newY });
      }
    }
  };

  const handleMouseDown = (e) => {
    if (!isButtonEnabled) { // Убегает только если поля не заполнены
      // При попытке клика кнопка убегает дальше
      const newX = Math.random() * 400 - 200; // -200px до +200px
      const newY = Math.random() * 400 - 200; // -200px до +200px
      setButtonPosition({ x: newX, y: newY });
      e.preventDefault(); // Предотвращаем клик
    }
  };

  const handleLogin = (e) => {
    if (isButtonEnabled) {
      // Сохраняем данные в localStorage
      localStorage.setItem('username', username);
      localStorage.setItem('password', password);
      // Здесь можно добавить логику авторизации
    } else {
      e.preventDefault(); // Предотвращаем клик если поля не заполнены
    }
  };

  return (
    <div className='LogIn'>
        <div className="LoginType">
            <h1>LogIn</h1>
            <input 
            maxLength={20}
              required={true}
              type="text" 
              placeholder='UserName'
              value={username}
              onChange={(e) => {
                const value = e.target.value.replace(/^([a-zа-я])/i, (match) => match.toUpperCase());
                setUsername(value);
                if (value.length > 0 && value.length < 3) {
                  setUsernameError('Минимум 3 символа');
                } else {
                  setUsernameError('');
                }
              }}
            />
            {usernameError && <p className="error">{usernameError}</p>}
            <div className="passwordInput">
                <input 
                maxLength={17}
                required={true}
                  type={showPassword ? "text" : "password"}
                  placeholder='Password'
                  value={password}
                  onChange={(e) => {
                    const value = e.target.value.replace(/^([a-zа-я])/i, (match) => match.toUpperCase());
                    setPassword(value);
                    if (value.length > 0 && value.length < 8) {
                      setPasswordError('Минимум 8 символов');
                    } else {
                      setPasswordError('');
                    }
                  }}
                />
                <button 
                  type="button"
                  className="eye-button"
                  onClick={togglePasswordVisibility}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
            </div>
            {passwordError && <p className="error">{passwordError}</p>}
            {isButtonEnabled ? (
              <Link to="/hisobot">
                <button 
                  className="login-button runaway"
                  onMouseMove={handleMouseMove}
                  onMouseDown={handleMouseDown}
                  onClick={handleLogin}
                  style={{
                    transform: `translate(${buttonPosition.x}px, ${buttonPosition.y}px)`,
                    transition: 'transform 0.1s ease'
                  }}
                >
                  Log In
                </button>
              </Link>
            ) : (
              <button 
                className="login-button runaway"
                onMouseMove={handleMouseMove}
                onMouseDown={handleMouseDown}
                onClick={handleLogin}
                style={{
                  transform: `translate(${buttonPosition.x}px, ${buttonPosition.y}px)`,
                  transition: 'transform 0.1s ease'
                }}
              >
                Log In
              </button>
            )}
            {generalError && <p className="error">{generalError}</p>}
        </div>
    </div>
  )
}

export default LogIn