import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Games from './pages/Games';
import About from './pages/About';
import Scene from './components/Scene';
import TicTacToe from './games/TicTacToe';
import Snake from './games/Snake';
import MemoryGame from './games/MemoryGame';
import NumberGuess from './games/NumberGuess';
import SpotDifference from './games/SpotDifference';
import Minesweeper from './games/Minesweeper';
import MathAmplitude from './games/MathAmplitude';
import CrosswordPuzzle from './games/CrosswordPuzzle';
import WimHofBreathing from './games/WimHofBreathing';
import PingPong from './games/PingPong';
import AIChatbox from './components/AIChatbox';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-transparent text-white relative">
        <Scene />
        <Navbar />
        <AnimatePresence mode="wait">
          <Routes>
            <Route path="/" element={
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
              >
                <Home />
              </motion.div>
            } />
            <Route path="/games" element={
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.5 }}
              >
                <Games />
              </motion.div>
            } />
            <Route path="/games/tictactoe" element={<TicTacToe />} />
            <Route path="/games/snake" element={<Snake />} />
            <Route path="/games/memory" element={<MemoryGame />} />
            <Route path="/games/number-guess" element={<NumberGuess />} />
            <Route path="/games/spot-difference" element={<SpotDifference />} />
            <Route path="/games/minesweeper" element={<Minesweeper />} />
            <Route path="/games/math-amplitude" element={<MathAmplitude />} />
            <Route path="/games/crossword" element={<CrosswordPuzzle />} />
            <Route path="/games/wim-hof-breathing" element={<WimHofBreathing />} />
            <Route path="/games/ping-pong" element={<PingPong />} />
            <Route path="/about" element={
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                transition={{ duration: 0.5 }}
              >
                <About />
              </motion.div>
            } />
          </Routes>
        </AnimatePresence>
        <AIChatbox />
      </div>
    </Router>
  );
}

export default App;