import React from 'react';
import { Gamepad2, Brain, Code, Puzzle, Calculator, Wind } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Games() {
  const categories = [
    {
      title: "Arcade Games",
      description: "Classic games to help you unwind",
      games: [
        {
          title: 'Snake Game',
          category: 'Relaxation',
          icon: Gamepad2,
          description: 'Classic snake game to help you unwind',
          image: 'https://raw.githubusercontent.com/akashgardas/Digital-Arcade/main/cover-images/snake-game/SG%203.jpg',
          path: '/games/snake',
          benefits: ['Improves focus', 'Reduces stress', 'Quick mental break'],
          isExternal: false
        },
        {
          title: 'Memory Game',
          category: 'Cognitive',
          icon: Brain,
          description: 'Match pairs to enhance memory',
          image: 'https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?w=800&auto=format&fit=crop',
          path: '/games/memory',
          benefits: ['Boosts memory', 'Enhances concentration', 'Mental refreshment'],
          isExternal: false
        },
        {
          title: 'Ping Pong',
          category: 'Arcade',
          icon: Gamepad2,
          description: 'Classic table tennis game',
          image: 'https://images.unsplash.com/photo-1534158914592-062992fbe900?w=800&auto=format&fit=crop',
          path: '/games/ping-pong',
          benefits: ['Hand-eye coordination', 'Reflexes', 'Strategic thinking'],
          isExternal: false
        }
      ]
    },
    {
      title: "Strategy Games",
      description: "Challenge your mind with strategic thinking",
      games: [
        {
          title: 'Minesweeper',
          category: 'Logic',
          icon: Puzzle,
          description: 'Classic minesweeper game',
          image: 'https://raw.githubusercontent.com/akashgardas/Digital-Arcade/main/cover-images/mine-sweeper/Minesweeper%201.png',
          path: '/games/minesweeper',
          benefits: ['Deductive reasoning', 'Risk assessment', 'Quick decision making'],
          isExternal: false
        },
        {
          title: 'Crossword Puzzle',
          category: 'Vocabulary',
          icon: Code,
          description: 'Test your programming knowledge',
          image: 'https://images.unsplash.com/photo-1577563908411-5077b6dc7624?w=800&auto=format&fit=crop',
          path: '/games/crossword',
          benefits: ['Technical vocabulary', 'Problem-solving', 'Knowledge testing'],
          isExternal: false
        }
      ]
    },
    {
      title: "Brain Training",
      description: "Enhance your cognitive abilities",
      games: [
        {
          title: 'Math Amplitude',
          category: 'Mathematics',
          icon: Calculator,
          description: 'Test your mental math skills',
          image: 'https://images.unsplash.com/photo-1596495578065-6e0763fa1178?w=800&auto=format&fit=crop',
          path: '/games/math-amplitude',
          benefits: ['Mental calculation', 'Quick thinking', 'Number sense'],
          isExternal: false
        },
        {
          title: 'Number Guess',
          category: 'Logic',
          icon: Brain,
          description: 'Binary search visualization game',
          image: 'https://raw.githubusercontent.com/akashgardas/Digital-Arcade/main/cover-images/number-guessing-game/NGG%202.png',
          path: '/games/number-guess',
          benefits: ['Binary search practice', 'Logical thinking', 'Algorithm understanding'],
          isExternal: false
        }
      ]
    },
    {
      title: "Wellness",
      description: "Take care of your mental health",
      games: [
        {
          title: 'Wim Hof Breathing',
          category: 'Meditation',
          icon: Wind,
          description: 'Guided breathing exercises',
          image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&auto=format&fit=crop',
          path: '/games/wim-hof-breathing',
          benefits: ['Stress reduction', 'Mental clarity', 'Focus improvement'],
          isExternal: false
        }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-purple-900/20 to-black pt-24 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">Game Collection</h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Take a break from coding and enhance your problem-solving skills with our collection of games designed for developers.
          </p>
        </div>

        {categories.map((category, categoryIndex) => (
          <div key={categoryIndex} className="mb-16">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-white mb-2">{category.title}</h2>
              <p className="text-gray-400">{category.description}</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {category.games.map((game, gameIndex) => (
                <div
                  key={gameIndex}
                  className="group relative overflow-hidden rounded-xl bg-purple-900/20 border border-purple-500/20 hover:border-purple-500/40 transition-all duration-300"
                >
                  <div className="aspect-video overflow-hidden">
                    <img
                      src={game.image}
                      alt={game.title}
                      className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-300"
                    />
                  </div>
                  <div className="p-6">
                    <div className="flex items-center space-x-2 mb-2">
                      <game.icon className="w-5 h-5 text-purple-400" />
                      <span className="text-sm text-purple-400">{game.category}</span>
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">{game.title}</h3>
                    <p className="text-gray-400 mb-4">{game.description}</p>
                    <div className="mb-4">
                      <h4 className="text-sm font-semibold text-purple-400 mb-2">Benefits:</h4>
                      <ul className="text-sm text-gray-400 space-y-1">
                        {game.benefits.map((benefit, index) => (
                          <li key={index} className="flex items-center">
                            <span className="w-1.5 h-1.5 bg-purple-500 rounded-full mr-2"></span>
                            {benefit}
                          </li>
                        ))}
                      </ul>
                    </div>
                    {game.isExternal ? (
                      <a 
                        href={game.path}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-500 hover:to-pink-500 transition-all duration-200 transform hover:scale-105 text-center"
                      >
                        Play on {game.title.split(' ')[0]}
                      </a>
                    ) : (
                      <Link 
                        to={game.path}
                        className="block w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-500 hover:to-pink-500 transition-all duration-200 transform hover:scale-105 text-center"
                      >
                        Play Now
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}