import Header from "./components/Header.js"
import Home from "./pages/Home.js"
import Calculator from "./pages/Calculator.js"
import Calculator2 from "./pages/Calculator2.js"
import LogIn from "./pages/LogIn.js"
import Hisobot from "./pages/Hisobot.js"
import Profil from "./pages/Profil.js"
import OfficeXarajat from "./pages/OfficeXarajat.js"
import { Route, Routes } from 'react-router-dom'

function App() {
  return (
    <div className="App">
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/calculator" element={<Calculator />} />
        <Route path="/calculator2" element={<Calculator2 />} />
        <Route path="/login" element={<LogIn />} />
        <Route path="/hisobot" element={<Hisobot />} />
        <Route path="/profil" element={<Profil />} />
        <Route path="/officexarajat" element={<OfficeXarajat />} />
      </Routes>
    </div>
  )
}

export default App